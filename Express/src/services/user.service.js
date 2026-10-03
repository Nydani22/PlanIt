const User = require('../models/User.model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { encryptToken } = require('../utils/encryption.util');
const Event = require('../models/Event.model');
const Group = require('../models/Group.model');
const groupService = require('./group.service');
const Invitation = require('../models/Invitation.model');

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

exports.updatePassword = async (id, currentPassword, newPassword) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('Felhasználó nem található');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error('A megadott jelenlegi jelszó helytelen.');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;
  await user.save();

  return true;
};

exports.deleteUser = async (id) => {
  const groupsToOwned = await Group.find({
    members: { $elemMatch: { userId: id, role: 'OWNER' } }
  });

  for (const group of groupsToOwned) {
    await groupService.deleteGroup(group._id, id);
  }

  await Event.deleteMany({ organizerId: id });
  
  await Event.updateMany(
    { 'attendees.userId': id },
    { $pull: { attendees: { userId: id } } }
  );

  await Invitation.deleteMany({ inviterId: id });

  await Group.updateMany(
    { 'members.userId': id },
    { $pull: { members: { userId: id } } }
  );
  
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