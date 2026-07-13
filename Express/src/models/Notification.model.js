const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, 
  
  type: { 
    type: String, 
    enum: ['INVITE', 'ROLE_CHANGE', 'MEMBER_REMOVED', 'MEMBER_LEFT', 'SYSTEM'], 
    required: true 
  },
  
  message: { type: String, required: true },
  
  isRead: { type: Boolean, default: false }
}, { 
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);