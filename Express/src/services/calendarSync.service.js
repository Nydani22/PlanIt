const ical = require('node-ical');
const mongoose = require('mongoose'); 
const Event = require('../models/Event.model');
const User = require('../models/User.model');

async function syncExternalCalendar(userId, calendarUrl) {
    try {
        const events = await ical.async.fromURL(calendarUrl);
        const incomingUids = [];
        const bulkOps = [];

        const allIncomingUids = [];
        for (const key in events) {
            if (events[key].type === 'VEVENT') {
                allIncomingUids.push(events[key].uid);
            }
        }
        const potentialInternalIds = allIncomingUids.filter(uid => mongoose.Types.ObjectId.isValid(uid));
        
        const existingInternalEvents = await Event.find({
            _id: { $in: potentialInternalIds },
            isExternal: false
        }).select('_id');
        
        const internalEventIdSet = new Set(existingInternalEvents.map(e => e._id.toString()));

        for (const key in events) {
            const event = events[key];
            
            if (event.type === 'VEVENT') {
                const uid = event.uid;                
                if (internalEventIdSet.has(uid)) {
                    continue;
                }

                incomingUids.push(uid);

                const isAllDay = event.datetype === 'date';

                let fromDate = event.start;
                let adjustedToDate = event.end || event.start;

                if (isAllDay) {
                    fromDate = new Date(Date.UTC(event.start.getFullYear(), event.start.getMonth(), event.start.getDate(), 0, 0, 0));
                    
                    if (event.end) {
                        const pureUtcEnd = new Date(Date.UTC(event.end.getFullYear(), event.end.getMonth(), event.end.getDate(), 0, 0, 0));
                        adjustedToDate = new Date(pureUtcEnd.getTime() - 1);
                    } else {
                        adjustedToDate = new Date(Date.UTC(event.start.getFullYear(), event.start.getMonth(), event.start.getDate(), 23, 59, 59, 999));
                    }
                }

                const eventData = {
                    organizerId: userId,
                    uid: uid,
                    eventName: event.summary || 'Névtelen esemény',
                    fromDate: fromDate,
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