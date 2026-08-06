const ical = require('node-ical');
const mongoose = require('mongoose'); 
const Event = require('../models/Event.model');
const User = require('../models/User.model');

async function syncExternalCalendars(userId, externalCalendars) {
    try {
        if (!externalCalendars || externalCalendars.length === 0) return;

        const allIncomingUids = [];
        const bulkOps = [];

        const existingInternalEvents = await Event.find({
            organizerId: userId,
            isExternal: false
        });
        
        const internalIdSet = new Set(existingInternalEvents.map(e => e._id.toString()));
        const internalUidSet = new Set(existingInternalEvents.filter(e => e.uid).map(e => e.uid));

        for (const calendar of externalCalendars) {
            try {
                const events = await ical.async.fromURL(calendar.url);
                const calendarColor = calendar.color || '#3f51b5';

                for (const key in events) {
                    const event = events[key];
                    
                    if (event.type === 'VEVENT') {
                        let uid = event.uid;
                        const APP_DOMAIN = 'useplanit.netlify.app';

                        if (uid && uid.includes(`@${APP_DOMAIN}`)) {
                            uid = uid.split('@')[0]; 
                        }

                        allIncomingUids.push(uid);

                        if (internalIdSet.has(uid) || internalUidSet.has(uid)) {
                            continue;
                        }
                        
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

                        const eventSummary = event.summary || 'Névtelen esemény';

                        const matchingInternalEvent = existingInternalEvents.find(internal => {
                            const nameMatches = internal.eventName.trim().toLowerCase() === eventSummary.trim().toLowerCase();
                            const timeMatches = internal.fromDate.getTime() === fromDate.getTime();
                            return nameMatches && timeMatches;
                        });

                        if (matchingInternalEvent) {
                            bulkOps.push({
                                updateOne: {
                                    filter: { _id: matchingInternalEvent._id },
                                    update: { $set: { uid: uid } }
                                }
                            });
                            internalUidSet.add(uid);
                            continue;
                        }

                        const eventData = {
                            organizerId: userId,
                            uid: uid,
                            eventName: eventSummary,
                            fromDate: fromDate,
                            toDate: adjustedToDate,
                            description: event.description || '',
                            location: event.location || '',
                            isAllDay: isAllDay,
                            category: 'OTHER',
                            color: calendarColor,
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
                                filter: { organizerId: userId, uid: uid, isExternal: true },
                                update: { $set: eventData },
                                upsert: true
                            }
                        });
                    }
                }
            } catch (calErr) {
                console.error(`Hiba egy adott naptár szinkronizálásakor (User: ${userId}, Naptár: ${calendar.name}):`, calErr);
            }
        }

        if (allIncomingUids.length > 0) {
            bulkOps.push({
                deleteMany: {
                    filter: {
                        organizerId: userId,
                        isExternal: true,
                        uid: { $nin: allIncomingUids }
                    }
                }
            });
        } else if (externalCalendars.length > 0) {
            bulkOps.push({
                deleteMany: {
                    filter: { organizerId: userId, isExternal: true }
                }
            });
        }

        if (bulkOps.length > 0) {
            await Event.bulkWrite(bulkOps);
        }

    } catch (error) {
        console.error(`Szinkronizációs hiba (User: ${userId}):`, error);
    }
}

async function runGlobalSync() {
    try {
        const users = await User.find({ 
            externalCalendars: { $exists: true, $not: { $size: 0 } } 
        });
        
        for (const user of users) {
            await syncExternalCalendars(user._id, user.externalCalendars);
        }
    } catch (error) {
        console.error('Globális szinkronizációs hiba:', error);
    }
}

module.exports = {
    syncExternalCalendars,
    runGlobalSync
};