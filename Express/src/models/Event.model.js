const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  description: { type: String },
  location: { type: String },
  fromDate: { type: Date, },
  toDate: { type: Date, },
  isAllDay: { type: Boolean, default: false },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  recurrence: {
    frequency: { 
      type: String, 
      enum: ['NONE', 'DAILY', 'WEEKLY'], 
      default: 'NONE' 
    },
    daysOfWeek: [{ 
      type: Number, 
      min: 0, 
      max: 6 
    }],
    untilDate: { 
      type: Date 
    },
    cancelledDates: [{ 
      type: Date 
    }]
  },

  attendees: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
      type: String, 
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'], 
      default: 'PENDING' 
    },
    attendanceType: { 
      type: String, 
      enum: ['REQUIRED', 'OPTIONAL'], 
      default: 'REQUIRED' 
    }
  }]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Event', eventSchema);