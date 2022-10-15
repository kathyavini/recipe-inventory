const Category = require('../models/category');
const Recipe = require('../models/recipe');
const async = require('async');

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
exports.category_create_get = (req, res) => {
  res.send('NOT IMPLEMENTED: Category create GET');
};

// Handle Category create on POST.
exports.category_create_post = (req, res) => {
  res.send('NOT IMPLEMENTED: Category create POST');
};

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
