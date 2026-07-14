const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
    token: { 
        type: String, 
        required: true, 
        unique: true 
    },
    groupId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Group', 
        required: true 
    },
    inviterId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    }
}, { timestamps: true });

invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invitation', invitationSchema);