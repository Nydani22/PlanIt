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

    events.forEach(item => {
        const eventUid = item.uid ? item.uid : item._id.toString();

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
          toDate: event.toDate
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
