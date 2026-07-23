const ical = require('node-ical');
const Event = require('../models/Event.model');
const User = require('../models/User.model');

async function syncExternalCalendar(userId, calendarUrl) {
    try {
        //console.log(`Szinkronizáció indítása: UserID ${userId}`);
        
        const events = await ical.async.fromURL(calendarUrl);
        const incomingUids = [];
        const bulkOps = [];

        for (const key in events) {
            const event = events[key];
            
            if (event.type === 'VEVENT') {
                const uid = event.uid;
                incomingUids.push(uid);

                const isAllDay = event.datetype === 'date';

                let adjustedToDate = event.end || event.start;
                if (isAllDay && event.end) {
                    adjustedToDate = new Date(event.end.getTime() - 1);
                }
                const eventData = {
                    organizerId: userId,
                    uid: uid,
                    eventName: event.summary || 'Névtelen esemény',
                    fromDate: event.start,
                    toDate: adjustedToDate,
                    description: event.description || '',
                    location: event.location || '',
                    isAllDay: isAllDay,
                    category: 'OTHER',
                    color: '#3f51b5',
                    isExternal: true,
                    attendees: [{
                        userId: userId,
                        status: 'ACCEPTED',
                        attendanceType: 'REQUIRED'
                    }],
                    recurrence: { 
                        frequency: 'NONE', 
                        daysOfWeek: [], 
                        cancelledDates: [] 
                    }
                };

                bulkOps.push({
                    updateOne: {
                        filter: { organizerId: userId, uid: uid },
                        update: { $set: eventData },
                        upsert: true
                    }
                });
            }
        }

        if (incomingUids.length > 0) {
            bulkOps.push({
                deleteMany: {
                    filter: {
                        organizerId: userId,
                        isExternal: true,
                        uid: { $nin: incomingUids }
                    }
                }
            });
        }

        if (bulkOps.length > 0) {
            const result = await Event.bulkWrite(bulkOps);
            // console.log(`Szinkronizáció kész (User ${userId}). Upsert: ${result.upsertedCount + result.modifiedCount}, Törölve: ${result.deletedCount}`);
        }

    } catch (error) {
        console.error(`Szinkronizációs hiba (User: ${userId}):`, error);
    }
}

async function runGlobalSync() {
    try {
        const users = await User.find({ 
            externalCalendarUrl: { $exists: true, $ne: "" } 
        });
        
        for (const user of users) {
            await syncExternalCalendar(user._id, user.externalCalendarUrl);
        }
    } catch (error) {
        console.error('Globális szinkronizációs hiba:', error);
    }
}

module.exports = {
    syncExternalCalendar,
    runGlobalSync
};