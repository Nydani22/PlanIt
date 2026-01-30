const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Event', EventSchema);
