const User = require('../models/User.model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { encryptToken } = require('../utils/encryption.util');

exports.getUserById = async (id) => {
  return await User.findById(id).select('-password');
};

exports.updateUser = async (id, updateData) => {
  if (updateData.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(updateData.password, salt);
  }

  return await User.findByIdAndUpdate(id, updateData, { returnDocument: 'after' }).select('-password');
};

exports.deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};

exports.regenerateCalendarToken = async (id) => {
  const rawToken = crypto.randomBytes(16).toString('hex');
  const encryptedToken = encryptToken(rawToken);
  
  const updatedUser = await User.findByIdAndUpdate(
      id,
      { calendarFeedToken: encryptedToken },
      { returnDocument: 'after' }
  );

  if (!updatedUser) {
      throw new Error('Felhasználó nem található.');
  }

  return rawToken;
};