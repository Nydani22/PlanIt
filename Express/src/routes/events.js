const express = require('express');
const router = express.Router();
const Event = require('../models/Event.model');
const Status = require('../models/Status.model');
const UserEvent = require('../models/UserEvent.model');
const authenticateToken = require('../middleware/authenticateToken');


router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { eventName, fromDate, toDate, description } = req.body;
        const userId = req.user.id;

        
        const newEvent = new Event({
            eventName,
            fromDate,
            toDate,
            description
        });
        const savedEvent = await newEvent.save();

        let status = await Status.findOne({ statusName: 'elfogadva' });


        if (!status) {
            status = new Status({ statusName: 'elfogadva' });
            await status.save();
        }

        const newUserEvent = new UserEvent({
            user: userId,
            event: savedEvent._id,
            status: status._id
        });
        await newUserEvent.save();

        res.status(201).json({ message: 'Esemény sikeresen létrehozva!', event: savedEvent });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Hiba történt az esemény mentésekor.' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userEvents = await UserEvent.find({ user: req.user.id })
            .populate('event') 
            .populate('status');
        const events = userEvents
            .filter(ue => ue.event !== null)
            .map(ue => ue.event);
        res.json(events);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Hiba az események lekérésekor.' });
    }
});

module.exports = router;