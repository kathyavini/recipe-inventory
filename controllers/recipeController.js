const Recipe = require('../models/recipe');

// // Dispay site homepage
// exports.index = (req, res) => {
//   res.send('NOT IMPLEMENTED: Site Home Page');
// };

// Display list of all Recipes.
exports.recipe_list = (req, res, next) => {
  Recipe.find({}, 'name description image categories')
    .sort({ name: 1 })
    .populate('categories')
    .exec((err, list_recipes) => {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render('recipe_list', {
        title: 'All Recipes',
        recipes: list_recipes,
      });
    });
};

// Display detail page for a specific Recipe.
exports.recipe_detail = (req, res, next) => {
  Recipe.findById(req.params.id)
    .populate('categories')
    .exec((err, recipe_detail) => {
      if (err) {
        return next(err);
      }

      // db query returns no results
      if (recipe_detail == null) {
        const err = new Error('Recipe not found');
        err.status = 404;
        return next(err);
      }

      // Successful, so render
      res.render('recipe', {
        title: recipe_detail.name,
        recipe: recipe_detail,
      });
    });
};

// Display Recipe create form on GET.
exports.recipe_create_get = (req, res) => {
  res.send('NOT IMPLEMENTED: Recipe create GET');
};

// Handle Recipe create on POST.
exports.recipe_create_post = (req, res) => {
  res.send('NOT IMPLEMENTED: Recipe create POST');
};

// Display Recipe delete form on GET.
exports.recipe_delete_get = (req, res) => {
  res.send('NOT IMPLEMENTED: Recipe delete GET');
};

// Handle Recipe delete on POST.
exports.recipe_delete_post = (req, res) => {
  res.send('NOT IMPLEMENTED: Recipe delete POST');
};

// Display Recipe update form on GET.
exports.recipe_update_get = (req, res) => {
  res.send('NOT IMPLEMENTED: Recipe update GET');
};

// Handle Recipe update on POST.
exports.recipe_update_post = (req, res) => {
  res.send('NOT IMPLEMENTED: Recipe update POST');
};
