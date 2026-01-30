const mongoose = require('mongoose');

const FriendshipSchema = new mongoose.Schema({
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Status',
      required: true
    },
});

module.exports = mongoose.model('Friendship', FriendshipSchema);
