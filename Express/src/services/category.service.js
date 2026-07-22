const Category = require('../models/Category.model');

exports.getCategoriesByUserId = async (userId) => {
  return await Category.find({ userId });
};

exports.getCategoryById = async (categoryId, userId) => {
  return await Category.findOne({ _id: categoryId, userId });
};


exports.createCategory = async (categoryData) => {
  const category = new Category(categoryData);
  return await category.save();
};

exports.updateCategory = async (categoryId, userId, updateData) => {
  return await Category.findOneAndUpdate(
    { _id: categoryId, userId },
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  );
};

exports.deleteCategory = async (categoryId, userId) => {
  return await Category.findOneAndDelete({ _id: categoryId, userId });
};