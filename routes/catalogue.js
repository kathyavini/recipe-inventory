const express = require('express');
const router = express.Router();
const multer = require('multer');

// For generating filenames for multer uploads
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// From multer readme: https://github.com/expressjs/multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/');
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});

const imageFilter = (req, file, cb) => {
  const validTypes = ['image/gif', 'image/jpeg', 'image/png'];
  if (validTypes.includes(file.mimetype)) {
    // accept this file
    cb(null, true);
  } else {
    // reject this file
    cb(null, false);
  }
};

const upload = multer({ storage: storage, fileFilter: imageFilter });

// Require controller modules.
const recipe_controller = require('../controllers/recipeController');
const category_controller = require('../controllers/categoryController');

/// RECIPE ROUTES ///

// GET request for creating a Recipe. NOTE This must come before routes that display Recipe (uses id).
router.get('/recipe/create', recipe_controller.recipe_create_get);

// POST request for creating Recipe.
router.post(
  '/recipe/create',
  upload.single('recipeImage'),
  recipe_controller.recipe_create_post
);

// GET request to delete Recipe.
router.get('/recipe/:id/delete', recipe_controller.recipe_delete_get);

// POST request to delete Recipe.
router.post('/recipe/:id/delete', recipe_controller.recipe_delete_post);

// GET request to update Recipe.
router.get('/recipe/:id/update', recipe_controller.recipe_update_get);

// POST request to update Recipe.
router.post(
  '/recipe/:id/update',
  upload.single('recipeImage'),
  recipe_controller.recipe_update_post
);

// GET request for one Recipe.
router.get('/recipe/:id', recipe_controller.recipe_detail);

// GET request for list of all Recipe items.
router.get('/recipes', recipe_controller.recipe_list);

/// CATEGORY ROUTES ///

// GET request for creating a Category. NOTE This must come before route that displays Category (uses id).
router.get('/category/create', category_controller.category_create_get);

// POST request for creating Category.
router.post(
  '/category/create',
  upload.single('categoryImage'),
  category_controller.category_create_post
);

// GET request to delete Category.
router.get('/category/:id/delete', category_controller.category_delete_get);

// POST request to delete Category.
router.post('/category/:id/delete', category_controller.category_delete_post);

// GET request to update Category.
router.get('/category/:id/update', category_controller.category_update_get);

// POST request to update Category.
router.post(
  '/category/:id/update',
  upload.single('categoryImage'),
  category_controller.category_update_post
);

// GET request for one Category.
router.get('/category/:id', category_controller.category_detail);

// GET request for list of all Categories.
router.get('/categories', category_controller.category_list);

module.exports = router;
