#! /usr/bin/env node

// Based upon the populatedb.js script from the MDN Express Tutorial. However, this one reads the database credentials from .env rather than from a command-line argument. Source: https://raw.githubusercontent.com/hamishwillee/express-locallibrary-tutorial/master/populatedb.js

console.log(
  'This script populates some recipes and categories to your database. It will read the destination database from .env where the URI string should be saved as mongoURI'
);

const async = require('async');
const Recipe = require('./models/recipe');
const Category = require('./models/category');

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load secure credentials
dotenv.config();
const mongoURI = process.env.mongoURI;

// Set up mongoose connection
const mongoDB = mongoURI;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

let recipes = [];
let categories = [];

// See the recipe.js schema or createRecipes() below for the properties included in recipeDetails
function recipeCreate(recipeDetails, cb) {
  const recipe = new Recipe(recipeDetails);

  recipe.save((err) => {
    if (err) {
      cb(err, null);
      return;
    }

    console.log('New Recipe: ' + recipe);
    recipes.push(recipe);
    cb(null, recipe);
  });
}

function categoryCreate(name, image, cb) {
  const category = new Category({ name: name, image: image });

  category.save((err) => {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New Category: ' + category);
    categories.push(category);
    cb(null, category);
  });
}

function createCategories(cb) {
  // These need to be run in series since they are pushed to an array and accessed by their index in createRecipes()
  async.series(
    [
      function (callback) {
        categoryCreate('South Indian', 'idli.jpg', callback);
      },
      function (callback) {
        categoryCreate('North Indian', 'karahi.jpg', callback);
      },
      function (callback) {
        categoryCreate('Japanese', 'veggies.jpg', callback);
      },
      function (callback) {
        categoryCreate('Favourites', 'pancakes.jpg', callback);
      },
    ],
    // optional callback
    cb
  );
}

function createRecipes(cb) {
  // These can be run in parallel. They are pushed to an array but that array is not indexed by any other schemas at the moment
  async.parallel(
    [
      function (callback) {
        recipeCreate(
          {
            name: 'Sukhe Chole',
            description:
              "This is a nice South Indian-style dry chana recipe, sweet and salty and not overwhelmed by spice. The key to success is carmelizing the onions first and making sure the chole is well-drained! The original recipe is by Dassana Amit of Dassana's Veg Recipes. Her website is a treasure trove of vegetarian Indian recipes and I have used it often! Link to the original recipe:",
            image: 'chole.jpg',
            ingredients: [
              'two cups dry chana, cooked (instant pot for 52 minutes)',
              '4 small or 2.5 medium onions, thinly sliced',
              '1 inch of ginger and 4 cloves garlic, minced',
              '2 fresh green chilis, slit (or dried chilis if fresh not available)',
              'dash of hing',
              '1 tsp black pepper, ground',
              'salt to taste',
              '2 Indian limes or 2 dashes of lime juice concentrate',
              '2 handfuls fresh cilantro',
              'handful of fresh mint',
            ],
            steps: [
              'Saute the thinly sliced onions in oil + butter until starting to brown',
              'Add the ginger-garlic paste, the hing, and chilis',
              'Cook until the raw aroma from the ginger-garlic disappears and onions are well-browned',
              'Add salt and ground black pepper',
              'Add one handful of fresh cilantro, chopped',
              'Add cooked chole, <strong>well-drained</strong>',
              'Add juice from two limes and cook, preferably covered, for two minutes',
              'Garnish with the remaining cilantro and with the mint, chopped',
            ],
            sourceLink: 'https://www.vegrecipesofindia.com/sukhe-chole-recipe/',
            sourceText: "Dry Chana - Dassana's Veg Recipes",
            categories: [categories[0], categories[3]],
          },
          callback
        );
      },
      function (callback) {
        recipeCreate(
          {
            name: 'Gujarati Dry Mung Beans',
            description:
              'This is my favourite sweet and sour way to prepare mung beans (hari daal), with cinnamon, brown sugar, lemon juice (although I usually substitute tamarind), and curry leaves. The original recipe by Sanjana Modha is available on her website:',
            image: 'mung-beans.jpg',
            ingredients: [
              '1.5 cups mung beans, cooked in the instant pot (15 min in 1.75 cups of water',
              '2 tbs vegetable or coconut oil',
              '1 stp mustard seeds',
              'dash of hing',
              '2 stems curry leaves',
              '1 tbs garlic, minced',
              '2 hot chillies minced',
              '3 roma tomatoes, chopped',
              '1/2 tsp turmeric',
              '1 tsp cinnamon powder',
              'tamarind paste water or lemon juice to taste',
              'salt',
              'sugar to taste',
              'handful fresh cilantro',
            ],
            steps: [
              'Saute mustard seeds, cumin seeds, hing, curry leaves, garlic, and chillies in oil. Be careful not to let it burn',
              'Add the tomatoes, turmeric, cooked mung means, and cook for 2 minutes, stirring gently without mashing',
              'Add salt, sugar, lemon juice/tamarind water, and cinamon powder and cook for 2 more minutes',
              'Garnish with fresh cilantro, chopped',
            ],
            sourceLink:
              'https://www.sanjanafeasts.co.uk/2010/05/gujarati-dry-mung-bean-curry/',
            sourceText: 'Gujarati Dry Mung Bean Curry - Sanjana Feasts',
            categories: [categories[1], categories[3]],
          },
          callback
        );
      },
      function (callback) {
        recipeCreate(
          {
            name: 'Sushi Rice',
            description:
              'A super simple and quick recipe I use to make just a single serving of sushi rice. Goes well in inari, or to make onigiri. Scaled down from the original recipe on Gimme Some Oven: ',
            image: 'rice.jpg',
            ingredients: [
              '1.5 cups cooked rice, ideally Japanese short-grain (but I usually just make with the basmati rice I have on hand)',
              '1/2 tsp salt',
              '2 tsp sugar',
              '6 tsp sushi vinegar',
              '(optional) sesame seeds as desired',
            ],
            steps: [
              'Heat the rice vinegar, sugar, and sea salt together in a small saucepan over medium-high heat until boiling (sugar should naturally dissolve, or feel free to stir a little)',
              'Drizzle sushi vinegar mixture over cooked rice and use a spatula to gently fold the rice until the vinegar is evenly mixed in',
              'Sprinkle in sesame seeds if desired and use immediately in recipe',
            ],
            sourceLink: 'https://www.gimmesomeoven.com/sushi-rice/',
            sourceText: 'Sushi Rice Recipe - Gimme Some Oven',
            categories: [categories[2], categories[3]],
          },
          callback
        );
      },
    ],
    // optional callback
    cb
  );
}

async.series(
  // Create Categories first, as the categories array is referenced by recipes
  [createCategories, createRecipes],
  // Optional callback
  function (err, results) {
    if (err) {
      console.log('FINAL ERR: ' + err);
    } else {
      console.log('DONE... Database populated');
    }
    // All done, disconnect from database
    mongoose.connection.close();
  }
);
