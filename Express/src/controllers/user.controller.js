const userService = require('../services/user.service');

exports.getUsers = async (req, res) => {
  const users = await userService.getAllUsers();
  res.json(users);
};
