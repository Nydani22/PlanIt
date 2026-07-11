const notificationService = require('../services/notification.service');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id; // A JWT tokenből jön
        const notifications = await notificationService.getUserNotifications(userId);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        
        const notification = await notificationService.markAsRead(notificationId, userId);
        if (!notification) {
            return res.status(404).json({ message: 'Értesítés nem található!' });
        }
        res.status(200).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await notificationService.markAllAsRead(userId);
        res.status(200).json({ message: 'Minden értesítés olvasottnak jelölve.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};