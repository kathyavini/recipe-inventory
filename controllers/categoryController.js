const async = require('async');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const upload = require('../config/multer');
const updateImage = require('../utils/forms/updateImage');

const Category = require('../models/category');
const Recipe = require('../models/recipe');

// Display list of all Categories.
exports.category_list = (req, res, next) => {
  Category.find({}, 'name image imageCloudUrl')
    .sort({ name: 1 })
    .exec((err, list_categories) => {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render('category_list', {
        title: 'All Categories',
        categories: list_categories,
      });
    });
};

// Display detail page for a specific Category.
exports.category_detail = (req, res, next) => {
  async.parallel(
    {
      category(callback) {
        Category.findById(req.params.id).exec(callback);
      },
      category_recipes(callback) {
        Recipe.find({ categories: req.params.id })
          .sort({ name: 1 })
          .exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }

      // db query returns no results
      if (results.category == null) {
        const err = new Error('Category not found');
        err.status = 404;
        return next(err);
      }

      // Successful, so render
      res.render('category', {
        title: results.category.name,
        recipes: results.category_recipes,
        category: results.category,
      });
    }
  );
};

// Display Category create form on GET.
exports.category_create_get = (req, res, next) => {
  res.render('category_form', { title: 'Create Category' });
};

// Handle Category create on POST.
exports.category_create_post = [
  upload.single('categoryImage'),
  // Validation and sanitization by express-validator (text field)
  body('name', 'Category name required') //
    .trim()
    .isLength({ min: 1 })
    .escape(),

  (req, res, next) => {
    // Extract the express-validator errors
    const errors = validationResult(req).array();

    if (!req.body.imagePath && req.file == undefined) {
      // req.file will be undefined if no image is selected or if an unsupported image format (webp) is selected and rejected by multer's fileFilter
      errors.push({
        msg: 'Please upload an image in .gif, .jpg/.jpeg, or .png format',
      });
    }

    // Create a category object with escaped and trimmed data
    const category = new Category({
      name: req.body.name,
      image: updateImage(req.body.imagePath, req.file),
    });

    if (errors.length > 0) {
      // Render the form again with sanitized values and error messages
      res.render('category_form', {
        title: 'Create Category',
        category,
        errors: errors,
      });
      return;
    } else {
      // Data from form is valid

      // Check if category with the same name already exists
      Category.findOne({ name: req.body.name }).exec((err, found_category) => {
        if (err) {
          return next(err);
        }

        if (found_category) {
          errors.push({
            msg: 'That category already exists in the database',
          });

          res.render('category_form', {
            title: 'Create Category',
            category,
            errors: errors,
          });

          return;
        } else {
          // Save new data to the collection
          category.save((err) => {
            if (err) {
              return next(err);
            }

            // Save this image to the cloud (async)
            cloudinary.uploader
              .upload(`public/images/${category.image}`, {
                folder: 'recipes',
              })
              .then((result) => {
                console.log(result);

                // If successful add cloud url (to view) and public_id (to delete) to model
                category.imageCloudUrl = result.secure_url;
                category.imageCloudId = result.public_id;

                // And update database
                Category.findByIdAndUpdate(
                  category._id,
                  category,
                  {},
                  (err) => {
                    if (err) {
                      return next(err);
                    }
                  }
                );
              });

            // Category has been saved. Redirect to its detail page
            res.redirect(category.url);
          });
        }
      });
    }
  },
];

// Display Category delete form on GET.
exports.category_delete_get = (req, res, next) => {
  async.parallel(
    {
      category(callback) {
        Category.findById(req.params.id).exec(callback);
      },
      category_recipes(callback) {
        Recipe.find({ categories: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }

      if (results.category == null) {
        // No results.
        res.redirect('/catalogue/categories');
      }

      // Successful, so render.
      res.render('category_delete', {
        title: `Delete Category: ${results.category.name}`,
        category: results.category,
        recipes: results.category_recipes,
        destructive: true,
      });
    }
  );
};

// Handle Category delete on POST.
exports.category_delete_post = [
  // Validate password
  body('adminPassword', 'Admin password is required for deletion')
    .trim()
    .isLength({ min: 1 })
    .escape(),

  (req, res, next) => {
    // Extract the express-validator errors
    const errors = validationResult(req).array();

    // Check if admin password is correct
    if (
      req.body.adminPassword &&
      req.body.adminPassword !== process.env.adminPassword
    ) {
      errors.push({
        msg: 'Admin password incorrect',
      });
    }

    if (errors.length > 0) {
      // If password missing or incorrect, render the form again with error messages
      async.parallel(
        {
          category(callback) {
            Category.findById(req.params.id).exec(callback);
          },
          category_recipes(callback) {
            Recipe.find({ categories: req.params.id }).exec(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }
          if (results.category == null) {
            res.redirect('/catalogue/categories');
          }

          res.render('category_delete', {
            title: `Delete Category: ${results.category.name}`,
            category: results.category,
            recipes: results.category_recipes,
            errors,
            destructive: true,
          });
        }
      );
      return;
    }

    // No password errors so delete category and its references from database
    async.parallel(
      {
        delete_category(deleteCb) {
          Category.findByIdAndRemove(req.body.categoryid).exec(deleteCb);
        },
        delete_references(deleteCb) {
          Recipe.updateMany(
            { categories: req.body.categoryid },
            {
              $pullAll: {
                categories: [req.body.categoryid],
              },
            }
          ).exec(deleteCb);
        },
      },
      (err, results) => {
        if (err) {
          return next(err);
        }

        // Delete category image (local)
        fs.unlink(`public/images/${results.delete_category.image}`, (err) => {
          if (err) {
            // Not a big issue if the image deletion fails; just log it
            console.log(err);
          }
        });

        // Delete category image from cloud (async)
        cloudinary.uploader
          .destroy(results.delete_category.imageCloudId)
          .then((result) => {
            console.log(result);
          });

        // Success - go to category list
        res.redirect('/catalogue/categories');
      }
    );
  },
];

// Display Category update form on GET.
exports.category_update_get = (req, res, next) => {
  async.parallel(
    {
      category(callback) {
        Category.findById(req.params.id).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }

      if (results.category == null) {
        // No results in db
        const err = new Error('Category not found');
        err.status = 404;
        return next(err);
      }

      // Success
      res.render('category_form', {
        title: 'Update Category: ' + results.category.name,
        category: results.category,
        destructive: true,
      });
    }
  );
};

// Handle Category update on POST.
exports.category_update_post = [
  upload.single('categoryImage'),

  body('name', 'Category name required').trim().isLength({ min: 1 }).escape(),

  body('adminPassword', 'Admin password is required for update')
    .trim()
    .isLength({ min: 1 })
    .escape(),

  (req, res, next) => {
    // Extract the express-validator errors
    const errors = validationResult(req).array();

    // Check if admin password is correct
    if (
      req.body.adminPassword &&
      req.body.adminPassword !== process.env.adminPassword
    ) {
      errors.push({
        msg: 'Admin password incorrect',
      });
    }

    if (!req.body.imagePath && req.file == undefined) {
      // req.file will be undefined if no image is selected or if an unsupported image format (webp) is selected and rejected by multer's fileFilter
      errors.push({
        msg: 'Please upload an image in .gif, .jpg/.jpeg, or .png format',
      });
    }

    const localImage = updateImage(req.body.imagePath, req.file);

    // Create a category object with escaped and trimmed data
    const category = new Category({
      name: req.body.name,
      image: localImage,
      _id: req.params.id,
    });

    // If a new image has been uploaded, the database won't be updated with the new URL in time for the res.redirect(), so the cloud URL  image should be cleared (in order to default to showing the local file)
    if (req.file) {
      category.imageCloudId = '';
      category.imageCloudUrl = '';
    }

    if (errors.length > 0) {
      // Render the form again with sanitized values and error messages
      res.render('category_form', {
        title: 'Update Category: ' + category.name,
        category,
        errors: errors,
        destructive: true,
      });

      return;
    }

    // Data valid; update record
    Category.findByIdAndUpdate(
      req.params.id,
      category,
      {},
      (err, thecategory) => {
        if (err) {
          return next(err);
        }

        // If image has changed sync cloud data
        if (category.image !== thecategory.image) {
          console.log('image has been changed');
          // Save new image to the cloud (async)
          cloudinary.uploader
            .upload(`public/images/${category.image}`, {
              folder: 'recipes',
            })
            .then((result) => {
              console.log(result);

              // If successful add new cloud url to model
              category.imageCloudUrl = result.secure_url;
              category.imageCloudId = result.public_id;

              // Update database
              Category.findByIdAndUpdate(category._id, category, {}, (err) => {
                if (err) {
                  return next(err);
                }
              });

              // And delete previous asset from cloud (async)
              cloudinary.uploader
                .destroy(thecategory.imageCloudId)
                .then((result) => {
                  console.log(result);
                });
            });
        }

        // Category has been saved. Redirect to its detail page
        res.redirect(thecategory.url);
      }
    );
  },
];
