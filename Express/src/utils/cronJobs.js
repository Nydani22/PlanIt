const cron = require('node-cron');
const calendarSyncService = require('../services/calendarSync.service');
const Event = require('../models/Event.model');
const { sendEventReminderEmail } = require('../services/email.service');

function initCronJobs() {
    cron.schedule('*/30 * * * *', async () => {
        try {
            await calendarSyncService.runGlobalSync();
        } catch (error) {
            console.error('Hiba a naptárszinkronizálás során:', error);
        }
    });

    cron.schedule('*/15 * * * *', async () => {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const upcomingEvents = await Event.find({
                fromDate: { $gte: now, $lte: tomorrow },
                sendNotification: true,
                notificationSent: false
            }).populate('organizerId');

            for (const event of upcomingEvents) {
                const user = event.organizerId;
                if (user && user.email) {
                    const dateStr = event.fromDate.toLocaleString('hu-HU');
                    
                    await sendEventReminderEmail(user.email, user.fullName, event);
                    
                    event.notificationSent = true;
                    await event.save();
                }
            }
        } catch (error) {
            console.error('Hiba az értesítések küldésekor:', error);
        }
    });
}

module.exports = { initCronJobs };