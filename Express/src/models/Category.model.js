const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryId: { 
    type: String, 
    enum: ['WORK', 'MEETING', 'PERSONAL', 'FAMILY', 'HEALTH', 'OTHER'],
    required: true
  },
  
  color: {
    primary: { type: String, required: true },
    secondary: { type: String }
  },
  
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
});

categorySchema.index({ userId: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);