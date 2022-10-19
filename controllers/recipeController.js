const Recipe = require('../models/recipe');
const Category = require('../models/category');
const async = require('async');
const { body, validationResult } = require('express-validator');
const fs = require('fs');

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
exports.recipe_create_get = (req, res, next) => {
  Category.find({}, 'name')
    .sort({ name: 1 })
    .exec((err, list_categories) => {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render('recipe_form', {
        title: 'Create Recipe',
        categories: list_categories,
      });
    });
};

// Handle Recipe create on POST.
exports.recipe_create_post = [
  // Convert the categories checked to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.categories)) {
      req.body.categories =
        typeof req.body.categories === 'undefined' ? [] : [req.body.categories];
    }
    next();
  },

  // Validate and sanitize text fields with express-validator
  body('name', 'Recipe name required').trim().isLength({ min: 1 }).escape(),

  body('description').trim().optional({ checkFalsy: true }).escape(),

  body('ingredients', 'Ingredients are required')
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body('steps', 'Steps are required').trim().isLength({ min: 1 }).escape(),

  body(
    'sourceLink',
    'Please provide a full valid URL (e.g. https://some-site.ca)'
  )
    .trim()
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .escape(),

  body('sourceText').trim().optional({ checkFalsy: true }).escape(),

  body('categories.*').escape(),

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

    // Process text area input separated by new line + dash into arrays of strings
    const processTextArea = (string) => {
      // Split on newline
      let listArray = string.split(/\r?\n/);

      const trimmedArray = listArray.map((line) => {
        // Remove leading dash and space (if included)
        return line.replace(/[-][ ]?/, '');
      });

      return trimmedArray;
    };

    // Create a recipe object with escaped and trimmed data
    const recipe = new Recipe({
      name: req.body.name,
      description: req.body.description,
      ingredients:
        req.body.ingredients == undefined
          ? []
          : processTextArea(req.body.ingredients),
      steps: req.body.steps == undefined ? [] : processTextArea(req.body.steps),
      sourceLink: req.body.sourceLink,
      sourceText: req.body.sourceText,
      categories: req.body.categories,
      image: req.file == undefined ? '' : req.file.filename,
    });

    if (errors.length > 0) {
      // Render the form again with sanitized values and error messages

      // Get all categories for the form
      Category.find({}, 'name')
        .sort({ name: 1 })
        .exec((err, list_categories) => {
          if (err) {
            return next(err);
          }

          // Mark already selected categories as checked
          for (const category of list_categories) {
            if (recipe.categories.includes(category._id)) {
              category.checked = true;
            }
          }

          res.render('recipe_form', {
            title: 'Create Recipe',
            categories: list_categories,
            recipe,
            errors,
          });
        });

      // Also delete the multer upload if there was one, to prevent orphan files being saved to disk when nothing is being stored to the collection.
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            return next(err);
          }
          console.log('File deleted: ' + req.file.originalname);
        });
      }
      return;
    } else {
      // Data from form is valid (no express-validator errors)

      // Check if a recipe with the same name already exists
      async.series(
        {
          foundRecipe(callback) {
            Recipe.findOne({ name: req.body.name }, callback);
          },
          categories(callback) {
            Category.find(callback).sort({ name: 1 });
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }

          if (results.foundRecipe) {
            errors.push({
              msg: 'A recipe with that name already exists in the database; please choose a different name.',
            });

            for (const category of results.categories) {
              if (recipe.categories.includes(category._id)) {
                category.checked = true;
              }
            }

            // Also delete the multer upload if there was one, to prevent orphan files being saved to disk when nothing is being stored to the collection.
            if (req.file) {
              fs.unlink(req.file.path, (err) => {
                if (err) {
                  return next(err);
                }
                console.log('File deleted: ' + req.file.originalname);
              });
            }

            res.render('recipe_form', {
              title: 'Create Recipe',
              recipe,
              categories: results.categories,
              errors,
            });

            return;
          }
          // Recipe with this name not found

          // Save new data to the collection
          recipe.save((err) => {
            if (err) {
              return next(err);
            }
            // Recipe has been saved. Redirect to its detail page
            res.redirect(recipe.url);
          });
        } // ends async optional callback
      ); // ends async.series
    } // ends check for errors.length
  }, // ends controller callback
];

// Display Recipe delete form on GET.
exports.recipe_delete_get = (req, res, next) => {
  async.parallel(
    {
      // only using async to keep in same format as category delete
      recipe(callback) {
        Recipe.findById(req.params.id).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.recipe == null) {
        // No results.
        res.redirect('/catalogue/recipes');
      }
      // Successful, so render.
      res.render('recipe_delete', {
        title: `Delete Recipe: ${results.recipe.name}`,
        recipe: results.recipe,
      });
    }
  );
};

// Handle Recipe delete on POST.
exports.recipe_delete_post = (req, res, next) => {
  async.parallel(
    {
      recipe(callback) {
        Recipe.findById(req.body.recipeid).exec(callback);
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
            Category.find({ image: results.recipe.image }).exec(imgCb);
          },
          imgRecipes(imgCb) {
            Recipe.find({ image: results.recipe.image }).exec(imgCb);
          },
        },
        (err, imgResults) => {
          if (err) {
            return next(err);
          }

          if (
            imgResults.imgCategories.length == 0 &&
            imgResults.imgRecipes.length == 1
          ) {
            // image is in use by no other objects and can be deleted
            fs.unlink(`public/images/${results.recipe.image}`, (err) => {
              if (err) {
                // Not a big issue if the image deletion fails; just log it
                console.log(err);
              }
            });
          }
        }
      );

      // Delete recipe
      Recipe.findByIdAndRemove(req.body.recipeid, (err) => {
        if (err) {
          return next(err);
        }

        // Success - go to recipe list
        res.redirect('/catalogue/recipes');
      });
    }
  );
};

// Display Recipe update form on GET.
exports.recipe_update_get = (req, res, next) => {
  // Get both recipe and categories for the form
  async.parallel(
    {
      recipe(callback) {
        Recipe.findById(req.params.id).exec(callback);
      },
      categories(callback) {
        Category.find(callback).sort({ name: 1 });
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }

      if (results.recipe == null) {
        // No results in db
        const err = new Error('Recipe not found');
        err.status = 404;
        return next(err);
      }

      // Success
      // Mark the selected categories as checked
      for (const category of results.categories) {
        if (results.recipe.categories.includes(category._id)) {
          category.checked = true;
        }
      }

      res.render('recipe_form', {
        title: 'Update Recipe: ' + results.recipe.name,
        categories: results.categories,
        recipe: results.recipe,
      });
    }
  );
};

// Handle Recipe update on POST.
exports.recipe_update_post = [
  // Convert the categories checked to an array.
  (req, res, next) => {
    console.log('Array actions. Acting on: ');
    console.log(req.body);
    if (!Array.isArray(req.body.categories)) {
      req.body.categories =
        typeof req.body.categories === 'undefined' ? [] : [req.body.categories];
    }
    next();
  },

  // Validate and sanitize text fields with express-validator
  body('name', 'Recipe name required').trim().isLength({ min: 1 }).escape(),

  body('description').trim().optional({ checkFalsy: true }).escape(),

  body('ingredients', 'Ingredients are required')
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body('steps', 'Steps are required').trim().isLength({ min: 1 }).escape(),

  body(
    'sourceLink',
    'Please provide a full valid URL (e.g. https://some-site.ca)'
  )
    .trim()
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .escape(),

  body('sourceText').trim().optional({ checkFalsy: true }).escape(),

  body('categories.*').escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    console.log('Received request: ');
    console.log(req.body);
    // Extract the express-validator errors
    const errors = validationResult(req).array();

    if (req.file == undefined) {
      // Check if req.file exists
      // This will be empty both when an image isn't uploaded and when an unsupported image format (like webp) is selected by the user but rejected by multer's fileFilter
      errors.push({
        msg: 'Please upload an image in .gif, .jpg/.jpeg, or .png format',
      });
    }

    // Process text area input separated by new line + dash into arrays of strings
    const processTextArea = (string) => {
      // Split on newline
      let listArray = string.split(/\r?\n/);

      const trimmedArray = listArray.map((line) => {
        // Remove leading dash and space (if included)
        return line.replace(/[-][ ]?/, '');
      });

      return trimmedArray;
    };

    // Create a recipe object with escaped and trimmed data
    const recipe = new Recipe({
      name: req.body.name,
      description: req.body.description,
      ingredients:
        req.body.ingredients == undefined
          ? []
          : processTextArea(req.body.ingredients),
      steps: req.body.steps == undefined ? [] : processTextArea(req.body.steps),
      sourceLink: req.body.sourceLink,
      sourceText: req.body.sourceText,
      categories: req.body.categories,
      image: req.file == undefined ? '' : req.file.filename,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    if (errors.length > 0) {
      // Render the form again with sanitized values and error messages

      // Get all categories for the form
      Category.find({}, 'name')
        .sort({ name: 1 })
        .exec((err, list_categories) => {
          if (err) {
            return next(err);
          }

          // Mark already selected categories as checked
          for (const category of list_categories) {
            if (recipe.categories.includes(category._id)) {
              category.checked = true;
            }
          }

          console.log('Data invalid. Repopulating form with object: ');
          console.log(recipe);

          res.render('recipe_form', {
            title: 'Update Recipe: ' + recipe.name,
            categories: list_categories,
            recipe,
            errors,
          });
        });

      // Also delete the multer upload if there was one, to prevent orphan files being saved to disk when nothing is being stored to the collection.
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            return next(err);
          }
          console.log('File deleted: ' + req.file.originalname);
        });
      }
      return;
    }
    // Data from form is valid
    // Update the record
    console.log('Data valid. Updating: ' + req.params.id);
    Recipe.findByIdAndUpdate(
      req.params.id,
      recipe,
      {},
      (err, therecipe) => {
        if (err) {
          return next(err);
        }
        // Recipe has been saved. Redirect to its detail page
        res.redirect(therecipe.url);
      } // ends async optional callback
    ); // ends async.series
  }, // ends controller callback
];
