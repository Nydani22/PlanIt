const User = require('../models/User.model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { encryptToken } = require('../utils/encryption.util');
const Event = require('../models/Event.model');

exports.getUserById = async (id) => {
  return await User.findById(id).select('-password');
};

exports.updateUser = async (id, updateData) => {
  if (updateData.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(updateData.password, salt);
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateData, { returnDocument: 'after' }).select('-password');

  if (updateData.externalCalendars && updatedUser.externalCalendars) {
    for (const calendar of updatedUser.externalCalendars) {
      await Event.updateMany(
        { 
          organizerId: id, 
          isExternal: true, 
          externalCalendarUrl: calendar.url
        },
        { 
          $set: { color: calendar.color } 
        }
      );
    }
  }

  return updatedUser;
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