const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  name: { type: String, required: true },
  image: String,
  imageCloudUrl: String,
  imageCloudId: String,
});

CategorySchema.virtual('url').get(function () {
  return `/catalogue/category/${this._id}`;
});

module.exports = mongoose.model('Category', CategorySchema);
