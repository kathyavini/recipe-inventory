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
exports.category_delete_get = (req, res) => {
  res.send('NOT IMPLEMENTED: Category delete GET');
};

// Handle Category delete on POST.
exports.category_delete_post = (req, res) => {
  res.send('NOT IMPLEMENTED: Category delete POST');
};

// Display Category update form on GET.
exports.category_update_get = (req, res) => {
  res.send('NOT IMPLEMENTED: Category update GET');
};

// Handle Category update on POST.
exports.category_update_post = (req, res) => {
  res.send('NOT IMPLEMENTED: Category update POST');
};
