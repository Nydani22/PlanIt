const mongoose = require('mongoose');

const MembershipSchema = new mongoose.Schema({
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    user: {
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

module.exports = mongoose.model('Membership', MembershipSchema);
