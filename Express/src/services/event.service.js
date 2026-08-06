const Event = require('../models/Event.model');
const ical = require('ical-generator').default;
const User = require('../models/User.model');
const Group = require('../models/Group.model');
const crypto = require('crypto');
const { encryptToken } = require('../utils/encryption.util');
const { expandEventInWindow } = require('../utils/event.util');

exports.createEvent = async (eventData, userId) => {
    const { 
        eventName, fromDate, toDate, description, location, 
        isAllDay, recurrence, category, color, timezone, attendees,
        groupId
    } = eventData;

    let finalAttendees = [];
    
    if (attendees && Array.isArray(attendees) && attendees.length > 0) {
        finalAttendees = attendees;
        const organizerIndex = finalAttendees.findIndex(a => a.userId.toString() === userId.toString());
        
        if (organizerIndex !== -1) {
            finalAttendees[organizerIndex].status = 'ACCEPTED';
        } else {
            finalAttendees.push({
                userId: userId,
                status: 'ACCEPTED',
                attendanceType: 'REQUIRED'
            });
        }
    } else {
        finalAttendees = [{
            userId: userId,
            status: 'ACCEPTED',
            attendanceType: 'REQUIRED'
        }];
    }

    const newEvent = new Event({
        eventName,
        fromDate,
        toDate,
        description,
        location,
        isAllDay,
        organizerId: userId,
        groupId,
        category,
        color,
        timezone,
        recurrence: recurrence || { frequency: 'NONE', daysOfWeek: [], cancelledDates: [] },
        attendees: finalAttendees
    });

    return await newEvent.save();
};

exports.getUserEvents = async (userId, startDate, endDate) => {
    const query = { 'attendees.userId': userId };
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        query.$or = [
            {
                fromDate: { $lte: end },
                toDate: { $gte: start },
                'recurrence.frequency': 'NONE'
            },
            {
                'recurrence.frequency': { $ne: 'NONE' },
                fromDate: { $lte: end }
            }
        ];
    }

    return await Event.find(query).sort({ fromDate: 1 });
};

exports.getEventById = async (eventId, userId) => {
    return await Event.findOne({ 
        _id: eventId, 
        'attendees.userId': userId 
    });
};

exports.updateEvent = async (eventId, userId, updateData) => {
    const event = await Event.findById(eventId);
    if (!event) {
        throw new Error('Esemény nem található');
    }

    let hasPermission = event.organizerId.toString() === userId.toString();

    if (!hasPermission && event.groupId) {
        const group = await Group.findById(event.groupId);
        if (group) {
            const member = group.members.find(m => m.userId.toString() === userId.toString());
            if (member && (member.role === 'ADMIN' || member.role === 'OWNER')) {
                hasPermission = true;
            }
        }
    }

    if (!hasPermission) {
        const error = new Error('Nincs jogosultságod az esemény módosításához.');
        error.statusCode = 403;
        throw error;
    }

    return await Event.findByIdAndUpdate(
        eventId,
        updateData,
        { returnDocument: 'after', runValidators: true }
    );
};

exports.deleteEvent = async (eventId, userId) => {
    const event = await Event.findById(eventId);
    if (!event) {
        throw new Error('Esemény nem található');
    }

    let hasPermission = event.organizerId.toString() === userId.toString();

    if (!hasPermission && event.groupId) {
        const group = await Group.findById(event.groupId);
        if (group) {
            const member = group.members.find(m => m.userId.toString() === userId.toString());
            if (member && (member.role === 'ADMIN' || member.role === 'OWNER')) {
                hasPermission = true;
            }
        }
    }

    if (!hasPermission) {
        const error = new Error('Nincs jogosultságod az esemény törléséhez.');
        error.statusCode = 403;
        throw error;
    }

    return await Event.findByIdAndDelete(eventId);
};

exports.updateAttendeeStatus = async (eventId, userId, newStatus) => {
    return await Event.findOneAndUpdate(
        { _id: eventId, 'attendees.userId': userId },
        { $set: { 'attendees.$.status': newStatus } },
        { returnDocument: 'after', runValidators: true }
    );
};

exports.cancelEventInstance = async (eventId, userId, dateToCancel) => {
    return await Event.findOneAndUpdate(
        { _id: eventId, organizerId: userId },
        { $addToSet: { 'recurrence.cancelledDates': new Date(dateToCancel) } },
        { returnDocument: 'after', runValidators: true }
    );
};


exports.generateICalStringByToken = async (token) => {
    const encryptedSearchToken = encryptToken(token);

    const user = await User.findOne({ calendarFeedToken: encryptedSearchToken });
    
    if (!user) {
        return null;
    }

    
    const events = await Event.find({ 
        organizerId: user._id, 
        isExternal: false 
    });

    const calendar = ical({ 
        name: `${user.fullName} Naptára`,
        timezone: 'UTC'
    });

    const APP_DOMAIN = 'useplanit.netlify.app';

    events.forEach(item => {
        const eventUid = item.uid ? item.uid : `${item._id.toString()}@${APP_DOMAIN}`;

        const calEvent = calendar.createEvent({
            id: eventUid,
            start: item.fromDate,
            end: item.toDate,
            summary: item.eventName,
            description: item.description,
            location: item.location,
            allDay: item.isAllDay,
            lastModified: item.updatedAt
        });

        if (item.recurrence && item.recurrence.frequency !== 'NONE') {
            const repeating = {
                freq: item.recurrence.frequency,
            };
            
            if (item.recurrence.untilDate) {
                repeating.until = item.recurrence.untilDate;
            }

            calEvent.repeating(repeating);
        }
    });

    return calendar.toString();
};

exports.deleteAllExternalEventsForUser = async (userId) => {
    return await Event.deleteMany({ 
        organizerId: userId, 
        isExternal: true 
    });
};

// Segédfüggvény az órák számolásához
const calculateTotalHours = (events) => {
    return events.reduce((total, event) => {
        // Időtartam ms-ben
        const durationMs = new Date(event.toDate) - new Date(event.fromDate); 
        // Átváltás órába (két tizedesjegyre kerekítve, ha tört)
        const hours = durationMs / (1000 * 60 * 60);
        return total + (hours > 0 ? hours : 0);
    }, 0);
};

exports.calculateUserStats = async (userId) => {
    const now = new Date();

    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const upcomingWindowEnd = new Date(now);
    upcomingWindowEnd.setDate(now.getDate() + 14);
    const searchEnd = currentMonthEnd > upcomingWindowEnd ? currentMonthEnd : upcomingWindowEnd;
    
    const allRelevantEvents = await exports.getExpandedEventsForUsers(currentMonthStart, searchEnd, [userId]);

    const upcomingEvents = allRelevantEvents
        .filter(event => new Date(event.fromDate) > now)
        .slice(0, 3)
        .map(event => ({
            id: event._id,
            title: event.eventName,
            date: event.fromDate,
            color: event.color || '#3f51b5'
        }));

    const weeklyEvents = allRelevantEvents.filter(e => 
        new Date(e.fromDate) >= currentWeekStart && new Date(e.fromDate) <= currentWeekEnd
    );
    const weeklyEventCount = weeklyEvents.length;
    const weeklyHours = Math.round(calculateTotalHours(weeklyEvents));
    const weeklyBusyPercentage = Math.min(Math.round((weeklyHours / 40) * 100), 100); 

    const monthlyEvents = allRelevantEvents.filter(e => 
        new Date(e.fromDate) >= currentMonthStart && new Date(e.fromDate) <= currentMonthEnd
    );
    const monthlyEventCount = monthlyEvents.length;
    const monthlyHours = Math.round(calculateTotalHours(monthlyEvents));
    const monthlyBusyPercentage = Math.min(Math.round((monthlyHours / 160) * 100), 100); 

    return {
        weekly: {
            eventCount: weeklyEventCount,
            hours: weeklyHours,
            busyPercentage: weeklyBusyPercentage
        },
        monthly: {
            eventCount: monthlyEventCount,
            hours: monthlyHours,
            busyPercentage: monthlyBusyPercentage
        },
        upcomingEvents: upcomingEvents
    };
};


exports.getExpandedEventsForUsers = async (searchStart, searchEnd, attendeeIds) => {
  const start = new Date(searchStart);
  const end = new Date(searchEnd);

  const events = await Event.find({
    $or: [
      { 'attendees.userId': { $in: attendeeIds } },
      { organizerId: { $in: attendeeIds } } 
    ]
  });

  let allRelevantEvents = [];

  events.forEach(event => {
    if (!event.recurrence || event.recurrence.frequency === 'NONE') {
      if (event.fromDate <= end && event.toDate >= start) {
        allRelevantEvents.push({
          _id: event._id,
          eventName: event.eventName,
          isExternal: event.isExternal,
          organizerId: event.organizerId,
          category: event.category,
          attendees: event.attendees,
          fromDate: event.fromDate,
          toDate: event.toDate,
          color: event.color
        });
      }
    } 
    else {
      if (!event.recurrence.untilDate || new Date(event.recurrence.untilDate) >= start) {
        const expanded = expandEventInWindow(event, start, end);
        allRelevantEvents = allRelevantEvents.concat(expanded);
      }
    }
  });

  allRelevantEvents.sort((a, b) => a.fromDate - b.fromDate);

  return allRelevantEvents;
};
