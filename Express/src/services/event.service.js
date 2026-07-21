const Event = require('../models/Event.model');

exports.createEvent = async (eventData, userId) => {
    const { eventName, fromDate, toDate, description, location, isAllDay, recurrence } = eventData;

    const newEvent = new Event({
        eventName,
        fromDate,
        toDate,
        description,
        location,
        isAllDay,
        organizerId: userId,
        recurrence: recurrence || { frequency: 'NONE', daysOfWeek: [], cancelledDates: [] },
        attendees: [{
            userId: userId,
            status: 'ACCEPTED',
            attendanceType: 'REQUIRED'
        }]
    });

    return await newEvent.save();
};

exports.getUserEvents = async (userId) => {
    return await Event.find({ 'attendees.userId': userId }).sort({ fromDate: 1 });
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