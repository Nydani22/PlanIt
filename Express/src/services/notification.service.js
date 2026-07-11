const Notification = require('../models/notification.model');
const socketUtil = require('../utils/socket');

exports.createNotification = async (data) => {
    const notification = new Notification(data);
    
    await notification.save(); 
    const io = socketUtil.getIO();
    if (io) {
        io.to(data.recipientId.toString()).emit('newNotification', notification);
    }
    return notification;
};

exports.getUserNotifications = async (userId) => {
    return await Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('senderId', 'userName fullName')
        .populate('groupId', 'groupName');
};

exports.markAsRead = async (notificationId, userId) => {
    return await Notification.findOneAndUpdate(
        { _id: notificationId, recipientId: userId },
        { isRead: true },
        { new: true }
    );
};

exports.markAllAsRead = async (userId) => {
    return await Notification.updateMany(
        { recipientId: userId, isRead: false },
        { isRead: true }
    );
};