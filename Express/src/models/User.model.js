const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
  timezone: { type: String, default: 'Europe/Budapest' },
  workHourStart: { type: String, default: '08:00' },
  workHourEnd: { type: String, default: '16:00' }
}, { 
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);