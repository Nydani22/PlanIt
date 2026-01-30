const mongoose = require('mongoose');
const FriendshipModel = require('./Friendship.model');

const FriendshipEventSchema = new mongoose.Schema({
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    friendship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Friendship',
      required: true
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Status',
      required: true
    },
});

module.exports = mongoose.model('FriendshipEvent', FriendshipEventSchema);
