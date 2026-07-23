const Event = require('../models/Event.model');

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