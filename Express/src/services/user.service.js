const User = require('../models/User.model');

exports.getAllUsers = async () => {
  return await User.find();
};
