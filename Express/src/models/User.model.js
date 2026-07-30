const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
  settings: {
    defaultView: { 
      type: String, 
      enum: ['month', 'week', 'day'], 
      default: 'week' 
    },
    dayStartHour: { type: Number, default: 6 },
    dayEndHour: { type: Number, default: 22 },
    hideWeekends: { type: Boolean, default: false },
    hourSegments: { type: Number, default: 2 },
  },
  externalCalendarUrl: { type: String },
  calendarFeedToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, { 
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);