const Event = require('../models/Event.model');
const ical = require('ical-generator').default;
const User = require('../models/User.model');
const crypto = require('crypto');
const { encryptToken } = require('../utils/encryption.util');

exports.createEvent = async (eventData, userId) => {
    const { eventName, fromDate, toDate, description, location, isAllDay, recurrence, category, color } = eventData;

    const newEvent = new Event({
        eventName,
        fromDate,
        toDate,
        description,
        location,
        isAllDay,
        organizerId: userId,
        category,
        color,
        recurrence: recurrence || { frequency: 'NONE', daysOfWeek: [], cancelledDates: [] },
        attendees: [{
            userId: userId,
            status: 'ACCEPTED',
            attendanceType: 'REQUIRED'
        }]
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
    return await Event.findOneAndUpdate(
        { _id: eventId, organizerId: userId },
        updateData,
        { returnDocument: 'after', runValidators: true }
    );
};

exports.deleteEvent = async (eventId, userId) => {
    return await Event.findOneAndDelete({ 
        _id: eventId, 
        organizerId: userId 
    });
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

    const events = await Event.find({ 'attendees.userId': user._id });

    const calendar = ical({ 
        name: `${user.fullName} Naptára`,
        timezone: 'UTC'
    });

    events.forEach(item => {
        const calEvent = calendar.createEvent({
            id: item._id.toString(),
            start: item.fromDate,
            end: item.toDate,
            summary: item.eventName,
            description: item.description,
            location: item.location,
            allDay: item.isAllDay
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