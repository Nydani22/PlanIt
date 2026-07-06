const Event = require('../models/Event.model');

exports.createEvent = async (eventData, userId) => {
    const { eventName, fromDate, toDate, description, location, isAllDay } = eventData;

    const newEvent = new Event({
        eventName,
        fromDate,
        toDate,
        description,
        location,
        isAllDay,
        organizerId: userId,
        attendees: [{
            userId: userId,
            status: 'ACCEPTED',
            attendanceType: 'REQUIRED'
        }]
    });

    return await newEvent.save();
};

exports.getUserEvents = async (userId) => {
    const events = await Event.find({ 'attendees.userId': userId }).sort({ fromDate: 1 });
    return events;
};