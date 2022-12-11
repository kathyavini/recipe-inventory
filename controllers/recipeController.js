const async = require('async');
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

const upload = require('../config/multer');
const updateImage = require('../utils/forms/updateImage');
const processTextArea = require('../utils/forms/processTextArea');

const Recipe = require('../models/recipe');
const Category = require('../models/category');

// Display list of all Recipes.
exports.recipe_list = (req, res, next) => {
  Recipe.find({}, 'name description image imageCloudUrl categories')
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
  upload.single('recipeImage'),
  // Convert the categories checked to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.categories)) {
      req.body.categories =
        typeof req.body.categories === 'undefined' ? [] : [req.body.categories];
    }
    next();
  },

  // Validate and sanitize text fields with express-validator
  body('name', 'Recipe name required') //
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body('description') //
    .trim()
    .optional({ checkFalsy: true })
    .escape(),

  body('ingredients', 'Ingredients are required')
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body('steps', 'Steps are required') //
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body(
    'sourceLink',
    'Please provide a full valid URL (e.g. https://some-site.ca)'
  )
    .trim()
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .escape(),

  body('sourceText') //
    .trim()
    .optional({ checkFalsy: true })
    .escape(),

  body('categories.*') //
    .escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the express-validator errors
    const errors = validationResult(req).array();

    if (!req.body.imagePath && req.file == undefined) {
      errors.push({
        msg: 'Please upload an image in .gif, .jpg/.jpeg, or .png format',
      });
    }

    const localImage = updateImage(req.body.imagePath, req.file);

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
      image: localImage.path,
    });

    // If validation fails, these values are passed back and forth between the form view and the POST controller to render the correct image preview and keep track of whether the image has ever been updated since editing began
    const imageInfo = {
      imageCloud: req.body.imageCloud,
      imageLocal: localImage.exists ? localImage.path : '',
      imageUpdated: localImage.updated || req.body.imageUpdated,
    };

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
            ...imageInfo,
          });
        });
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

            res.render('recipe_form', {
              title: 'Create Recipe',
              recipe,
              categories: results.categories,
              errors,
            });

            return;
          }
          // No recipe with this name exists

          // Save new data to the collection
          recipe.save((err) => {
            if (err) {
              return next(err);
            }

            // Save this image to the cloud (async)
            cloudinary.uploader
              .upload(`public/images/${recipe.image}`, {
                folder: 'recipes',
              })
              .then((result) => {
                console.log(result);

                // If successful add cloud url (to view) and public_id (to delete) to model
                recipe.imageCloudUrl = result.secure_url;
                recipe.imageCloudId = result.public_id;

                // And update database
                Recipe.findByIdAndUpdate(recipe._id, recipe, {}, (err) => {
                  if (err) {
                    return next(err);
                  }
                });
              });
            // Recipe has been saved. Redirect to its detail page
            res.redirect(recipe.url);
          });
        }
      );
    }
  },
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
        res.redirect('/catalogue/recipes');
      }
      // Successful, so render.
      res.render('recipe_delete', {
        title: `Delete Recipe: ${results.recipe.name}`,
        recipe: results.recipe,
        destructive: true,
      });
    }
  );
};

// Handle Recipe delete on POST.
exports.recipe_delete_post = [
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

        if (errors.length > 0) {
          // If password is missing or incorrect, render the delete form again with error messages

          res.render('recipe_delete', {
            title: `Delete Recipe: ${results.recipe.name}`,
            recipe: results.recipe,
            errors,
            destructive: true,
          });

          return;
        }

        // Delete recipe
        Recipe.findByIdAndRemove(req.body.recipeid, (err) => {
          if (err) {
            return next(err);
          }

          // Delete recipe image from cloud (async)
          cloudinary.uploader
            .destroy(results.recipe.imageCloudId)
            .then((result) => {
              console.log(result);
            });

          // Success - go to recipe list
          res.redirect('/catalogue/recipes');
        });
      }
    );
  },
];

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
        destructive: true,
      });
    }
  );
};

// Handle Recipe update on POST.
exports.recipe_update_post = [
  upload.single('recipeImage'),
  // Convert the categories checked to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.categories)) {
      req.body.categories =
        typeof req.body.categories === 'undefined' ? [] : [req.body.categories];
    }
    next();
  },

  // Validate and sanitize text fields with express-validator
  body('name', 'Recipe name required') //
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body('description') //
    .trim()
    .optional({ checkFalsy: true })
    .escape(),

  body('ingredients', 'Ingredients are required')
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body('steps', 'Steps are required') //
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body(
    'sourceLink',
    'Please provide a full valid URL (e.g. https://some-site.ca)'
  )
    .trim()
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .escape(),

  body('sourceText') //
    .trim()
    .optional({ checkFalsy: true })
    .escape(),

  body('categories.*') //
    .escape(),

  body('adminPassword', 'Admin password is required for update')
    .trim()
    .isLength({ min: 1 })
    .escape(),

  // Process request after validation and sanitization
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
      // Check if req.file exists
      // This will be empty both when an image isn't uploaded and when an unsupported image format (like webp) is selected by the user but rejected by multer's fileFilter
      errors.push({
        msg: 'Please upload an image in .gif, .jpg/.jpeg, or .png format',
      });
    }

    const localImage = updateImage(req.body.imagePath, req.file);

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
      image: localImage.path,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    // If validation fails, these values are passed back and forth between the form view and the POST controller to render the correct image preview and keep track of whether the image has ever been updated since editing began
    const imageInfo = {
      imageCloud: req.body.imageCloud,
      imageLocal: localImage.exists ? localImage.path : '',
      imageUpdated: localImage.updated || req.body.imageUpdated,
    };

    if (errors.length > 0) {
      console.log('Errors, so form is being re-rendered with:', recipe, {
        imageInfo,
      });

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
            title: 'Update Recipe: ' + recipe.name,
            categories: list_categories,
            recipe,
            errors,
            ...imageInfo,
            destructive: true,
          });
        });

      return;
    }

    // localImage.updated refers to a file upload in the current POST; req.body.imageUpdated refers to whether the image has ever been updated since editing began (regardless of the number of times the form view has been re-rendered due to validation errors)
    if (localImage.updated || req.body.imageUpdated) {
      recipe.imageCloudId = '';
      recipe.imageCloudUrl = '';
    }

    // Data from form is valid; update the record
    Recipe.findByIdAndUpdate(req.params.id, recipe, {}, (err, therecipe) => {
      if (err) {
        return next(err);
      }
      // If image has changed sync cloud data
      if (recipe.image !== therecipe.image) {
        // Save new image to the cloud (async)
        cloudinary.uploader
          .upload(`public/images/${recipe.image}`, {
            folder: 'recipes',
          })
          .then((result) => {
            console.log(result);

            // If successful add new cloud url to model
            recipe.imageCloudUrl = result.secure_url;
            recipe.imageCloudId = result.public_id;

            // Update database
            Recipe.findByIdAndUpdate(recipe._id, recipe, {}, (err) => {
              if (err) {
                return next(err);
              }
            });

            // And delete previous asset from cloud (async)
            cloudinary.uploader
              .destroy(therecipe.imageCloudId)
              .then((result) => {
                console.log(result);
              });

            // redirect unnecessary; happens outside the async calls
          });
      }
      // Recipe has been saved. Redirect to its detail page
      res.redirect(therecipe.url);
    });
  },
];
