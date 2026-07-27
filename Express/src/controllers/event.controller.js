const eventService = require('../services/event.service');
const freeBusyService = require('../services/freebusy.service');

exports.createEvent = async (req, res) => {
    try {
        const userId = req.user.id; 
        
        if (!req.body.uid) {
            delete req.body.uid;
        }
        
        const event = await eventService.createEvent(req.body, userId);
        
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.generateICalFeed = async (req, res) => {
    try {
        const { token } = req.params;

        const iCalString = await eventService.generateICalStringByToken(token);

        if (!iCalString) {
            return res.status(404).send('Naptár nem található vagy érvénytelen link.');
        }

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="naptar.ics"`);

        res.send(iCalString);

    } catch (error) {
        console.error('Hiba az iCal generálásakor:', error);
        res.status(500).send('Belső szerverhiba.');
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



exports.getEventsForTimeSearch = async (req, res) => {
  try {
    // 1. Bemenet (beállítások) kinyerése az Angular kérésből
    const searchParams = req.body; 
    const { searchStart, searchEnd, requiredAttendees = [], optionalAttendees = [] } = searchParams;

    // Összes érintett felhasználó ID-ja (kötelezők + opcionálisak)
    const allAttendeeIds = [...new Set([...requiredAttendees, ...optionalAttendees])];

    // 2. ELSŐ SERVICE: Lekérjük és kibontjuk az eddigi naptárbejegyzéseket
    // (Ez volt az a fájl, ami lekérdezte a MongoDB-t és kibontotta az ismétlődéseket)
    const expandedEvents = await eventService.getExpandedEventsForUsers(
      searchStart, 
      searchEnd, 
      allAttendeeIds
    );

    // 3. MÁSODIK SERVICE: Ráeresztjük a Free/Busy algoritmust az adatokra
    // (Ez az a kód, ami megnézi a napokat, órákat, puffereket, és megkeresi a lyukakat)
    const availableTimeSlots = freeBusyService.findAvailableTimeSlots(
      searchParams, 
      expandedEvents
    );

    // 4. Eredmény visszaküldése az Angularnak
    return res.status(200).json({
      success: true,
      count: availableTimeSlots.length,
      data: availableTimeSlots // A letisztult, felkínálható szabad időpontok
    });

  } catch (error) {
    console.error('Hiba az időpontkeresés feldolgozásakor:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Szerverhiba az időpontok kalkulálásakor.' 
    });
  }
};
