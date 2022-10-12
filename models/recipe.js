const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const RecipeSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  ingredients: { type: [String] },
  steps: { type: [String] },
  image: { type: String },
  sourceLink: { type: String },
  sourceText: { type: String },
  categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
});

RecipeSchema.virtual('url').get(function () {
  return `/catalogue/recipe/${this._id}`;
});

// Probably I'll add a virtual for image_path here as well

module.exports = mongoose.model('Recipe', RecipeSchema);
