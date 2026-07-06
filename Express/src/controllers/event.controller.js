const eventService = require('../services/event.service');

exports.createEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const savedEvent = await eventService.createEvent(req.body, userId);
        
        res.status(201).json({ message: 'Esemény sikeresen létrehozva!', event: savedEvent });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Hiba történt az esemény mentésekor.' });
    }
};

exports.getUserEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const events = await eventService.getUserEvents(userId);
        
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Hiba az események lekérésekor.' });
    }
};