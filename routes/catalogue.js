const express = require('express');
const router = express.Router();

const recipes = require('../controllers/recipeController');
const categories = require('../controllers/categoryController');

/// RECIPE ROUTES ///

router
  .route('/recipe/create')
  .get(recipes.recipe_create_get)
  .post(recipes.recipe_create_post);

router
  .route('/recipe/:id/update')
  .get(recipes.recipe_update_get)
  .post(recipes.recipe_update_post);

router
  .route('/recipe/:id/delete')
  .get(recipes.recipe_delete_get)
  .post(recipes.recipe_delete_post);

// GET request for a single recipe
router
  .route('/recipe/:id') //
  .get(recipes.recipe_detail);

// GET request for list of all recipe items
router
  .route('/recipes') //
  .get(recipes.recipe_list);

/// CATEGORY ROUTES ///

router
  .route('/category/create')
  .get(categories.category_create_get)
  .post(categories.category_create_post);

// GET request to delete Category.
router
  .route('/category/:id/delete')
  .get(categories.category_delete_get)
  .post(categories.category_delete_post);

// GET request to update Category.
router
  .route('/category/:id/update')
  .get(categories.category_update_get)
  .post(categories.category_update_post);

// GET request for one Category.
router
  .route('/category/:id') //
  .get(categories.category_detail);

// GET request for list of all Categories.
router
  .route('/categories') //
  .get(categories.category_list);

module.exports = router;
