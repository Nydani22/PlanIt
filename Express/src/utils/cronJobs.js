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
            })
            .populate('organizerId')
            .populate('attendees.userId');

            for (const event of upcomingEvents) {
                for (const attendee of event.attendees) {
                    if (attendee.status === 'ACCEPTED' || attendee.status === 'PENDING') {
                        const user = attendee.userId;
                        
                        if (user && user.email) {
                            try {
                                await sendEventReminderEmail(user.email, user.fullName, event);
                            } catch (err) {
                                console.error(`Nem sikerült elküldeni az emlékeztetőt (Email: ${user.email}):`, err);
                            }
                        }
                    }
                }
                event.notificationSent = true;
                await event.save();
            }
        } catch (error) {
            console.error('Hiba az értesítések küldésekor:', error);
        }
    });
}

module.exports = { initCronJobs };