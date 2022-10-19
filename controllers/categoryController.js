const Category = require('../models/category');
const Recipe = require('../models/recipe');
const async = require('async');
const { body, validationResult } = require('express-validator');
const fs = require('fs');

// Display list of all Categories.
exports.category_list = (req, res, next) => {
  Category.find({}, 'name image')
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
  // Validation and sanitization by express-validator (text field)
  body('name', 'Category name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the express-validator errors
    const errors = validationResult(req).array();

    if (req.file == undefined) {
      // Check if req.file exists
      // This will be empty both when an image isn't uploaded and when an unsupported image format (like webp) is selected by the user but rejected by multer's fileFilter
      errors.push({
        msg: 'Please upload an image in .gif, .jpg/.jpeg, or .png format',
      });
    }

    // Create a category object with escaped and trimmed data
    const category = new Category({
      name: req.body.name,
      image: req.file == undefined ? '' : req.file.filename,
    });

    if (errors.length > 0) {
      // Render the form again with sanitized values and error messages
      res.render('category_form', {
        title: 'Create Category',
        category,
        errors: errors,
      });

      // Also delete the multer upload if there was one, to prevent orphan files being saved to disk when nothing is being stored to the collection.
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            return next(err);
          }
        });
      }
      return;
    } else {
      // Data from form is valid
      // Check with category with the same name already exists
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

          // Also delete the multer upload if there was one, to prevent orphan files being saved to disk when nothing is being stored to the collection.
          if (req.file) {
            fs.unlink(req.file.path, (err) => {
              if (err) {
                return next(err);
              }
            });
          }
          return;
        } else {
          // Save new data to the collection
          category.save((err) => {
            if (err) {
              return next(err);
            }
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
      });
    }
  );
};

// Handle Category delete on POST.
exports.category_delete_post = (req, res, next) => {
  async.parallel(
    {
      category(callback) {
        Category.findById(req.body.categoryid).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }

      // Check for use of image in other categories and images; otherwise delete
      // Note: this won't apply to uploaded images are they are given unique ids
      async.parallel(
        {
          imgCategories(imgCb) {
            Category.find({ image: results.category.image }).exec(imgCb);
          },
          imgRecipes(imgCb) {
            Recipe.find({ image: results.category.image }).exec(imgCb);
          },
        },
        (err, imgResults) => {
          if (err) {
            return next(err);
          }

          if (
            imgResults.imgCategories.length == 1 &&
            imgResults.imgRecipes.length == 0
          ) {
            // image is in use by no other objects and can be deleted
            fs.unlink(`public/images/${results.category.image}`, (err) => {
              if (err) {
                // Not a big issue if the image deletion fails; just log it
                console.log(err);
              }
            });
          }
        }
      );

      // Delete category and its references
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
        (err) => {
          if (err) {
            return next(err);
          }

          // Success - go to category list
          res.redirect('/catalogue/categories');
        }
      );
    }
  );
};

// Display Category update form on GET.
exports.category_update_get = (req, res, next) => {
  // Using async only to keep code in same format as recipe_update_get
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
      });
    }
  );
};

// Handle Category update on POST.
exports.category_update_post = [
  // Validation and sanitization by express-validator (text field)
  body('name', 'Category name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the express-validator errors
    const errors = validationResult(req).array();

    if (req.file == undefined) {
      // Check if req.file exists
      // This will be empty both when an image isn't uploaded and when an unsupported image format (like webp) is selected by the user but rejected by multer's fileFilter
      errors.push({
        msg: 'Please upload an image in .gif, .jpg/.jpeg, or .png format',
      });
    }

    // Create a category object with escaped and trimmed data
    const category = new Category({
      name: req.body.name,
      image: req.file == undefined ? '' : req.file.filename,
      _id: req.params.id,
    });

    if (errors.length > 0) {
      // Render the form again with sanitized values and error messages
      res.render('category_form', {
        title: 'Create Category',
        category,
        errors: errors,
      });

      // Also delete the multer upload if there was one, to prevent orphan files being saved to disk when nothing is being stored to the collection.
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            return next(err);
          }
        });
      }
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
        // Category has been saved. Redirect to its detail page
        res.redirect(thecategory.url);
      }
    );
  },
];
