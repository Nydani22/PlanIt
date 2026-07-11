const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  description: { type: String },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['OWNER', 'ADMIN', 'MEMBER'], default: 'MEMBER' },
    joinedAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true
});

module.exports = mongoose.model('Group', groupSchema);