const mongoose = require('mongoose');

const GroupEventSchema = new mongoose.Schema({
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Status',
      required: true
    },
});

module.exports = mongoose.model('GroupEvent', GroupEventSchema);
