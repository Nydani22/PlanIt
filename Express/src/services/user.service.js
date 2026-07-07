const User = require('../models/User.model');
const bcrypt = require('bcrypt');

exports.getUserById = async (id) => {
  return await User.findById(id).select('-password');
};

exports.updateUser = async (id, updateData) => {
  if (updateData.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(updateData.password, salt);
  }

  return await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
};

exports.deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};