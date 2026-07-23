const eventService = require('../services/event.service');

exports.createEvent = async (req, res) => {
    try {
        const userId = req.user.id; 
        const event = await eventService.createEvent(req.body, userId);
        
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;
        const events = await eventService.getUserEvents(userId, startDate, endDate);
        
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Hiba az események lekérésekor', error });
    }
};

exports.findOne = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;
        
        const event = await eventService.getEventById(eventId, userId);
        
        if (!event) {
            return res.status(404).json({ message: 'Esemény nem található, vagy nincs hozzá jogosultságod.' });
        }
        
        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;
        
        const updatedEvent = await eventService.updateEvent(eventId, userId, req.body);
        
        if (!updatedEvent) {
            return res.status(404).json({ message: 'Esemény nem található, vagy nem te vagy a szervezője.' });
        }
        
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;
        
        const deletedEvent = await eventService.deleteEvent(eventId, userId);
        
        if (!deletedEvent) {
            return res.status(404).json({ message: 'Esemény nem található, vagy nem te vagy a szervezője.' });
        }
        
        res.status(200).json({ message: 'Esemény sikeresen törölve.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ message: 'A státusz megadása kötelező!' });
        }

        const updatedEvent = await eventService.updateAttendeeStatus(eventId, userId, status);
        
        if (!updatedEvent) {
            return res.status(404).json({ message: 'Esemény nem található, vagy nem vagy meghívva.' });
        }
        
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cancelInstance = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;
        const { dateToCancel } = req.body;
        
        if (!dateToCancel) {
            return res.status(400).json({ message: 'A törölni kívánt dátum (dateToCancel) megadása kötelező!' });
        }

        const updatedEvent = await eventService.cancelEventInstance(eventId, userId, dateToCancel);
        
        if (!updatedEvent) {
            return res.status(404).json({ message: 'Esemény nem található, vagy nem te vagy a szervezője.' });
        }
        
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};