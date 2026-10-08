const eventService = require('../services/event.service');
const freeBusyService = require('../services/freebusy.service');
const Group = require('../models/Group.model');
const Event = require('../models/Event.model');

exports.createEvent = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { groupId } = req.body;

        if (groupId) {
            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'A megadott csoport nem létezik.' });
            }
            
            const currentMember = group.members.find(m => m.userId.toString() === userId.toString());
            
            if (!currentMember) {
                return res.status(403).json({ message: 'Nincs jogosultságod eseményt létrehozni ebben a csoportban!' });
            }

            if (currentMember.role !== 'ADMIN' && currentMember.role !== 'OWNER') {
                return res.status(403).json({ message: 'Csoporteseményt csak adminok vagy a tulajdonos hozhatnak létre!' });
            }
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

exports.getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const stats = await eventService.calculateUserStats(userId);
        
        res.status(200).json(stats);
    } catch (error) {
        console.error('Hiba a statisztikák lekérésekor:', error);
        res.status(500).json({ message: 'Belső szerverhiba a statisztikák betöltésekor.' });
    }
};

exports.update = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;
        
        const eventToUpdate = await Event.findById(eventId);
        if (!eventToUpdate) {
            return res.status(404).json({ message: 'Esemény nem található.' });
        }

        let hasPermission = eventToUpdate.organizerId.toString() === userId.toString();

        if (!hasPermission && eventToUpdate.groupId) {
            const group = await Group.findById(eventToUpdate.groupId);
            if (group) {
                const member = group.members.find(m => m.userId.toString() === userId.toString());
                if (member && (member.role === 'ADMIN' || member.role === 'OWNER')) {
                    hasPermission = true;
                }
            }
        }

        if (!hasPermission) {
            return res.status(403).json({ message: 'Nincs jogosultságod az esemény módosításához.' });
        }
        
        const updatedEvent = await eventService.updateEvent(eventId, userId, req.body);
        
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;
        
        const eventToDelete = await Event.findById(eventId);
        if (!eventToDelete) {
            return res.status(404).json({ message: 'Esemény nem található.' });
        }

        let hasPermission = eventToDelete.organizerId.toString() === userId.toString();

        if (!hasPermission && eventToDelete.groupId) {
            const group = await Group.findById(eventToDelete.groupId);
            if (group) {
                const member = group.members.find(m => m.userId.toString() === userId.toString());
                if (member && (member.role === 'ADMIN' || member.role === 'OWNER')) {
                    hasPermission = true;
                }
            }
        }

        if (!hasPermission) {
            return res.status(403).json({ message: 'Nincs jogosultságod az esemény törléséhez.' });
        }
        
        await eventService.deleteEvent(eventId, userId);
        
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
            return res.status(400).json({ message: 'A törölni kívánt dátum megadása kötelező!' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Esemény nem található.' });
        }

        if (event.organizerId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Csak a szervező mondhat le ismétlődő eseménypéldányt.' });
        }

        const updatedEvent = await eventService.cancelEventInstance(eventId, userId, dateToCancel);
        
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getEventsForTimeSearch = async (req, res) => {
  try {
    const userId = req.user.id;
    const searchParams = req.body; 
    const { searchStart, searchEnd, requiredAttendees = [], optionalAttendees = [] } = searchParams;

    const allAttendeeIds = [...new Set([...requiredAttendees, ...optionalAttendees])];

    if (!(allAttendeeIds.length === 1 && allAttendeeIds[0] === userId.toString())) {
        const userGroups = await Group.find({ 'members.userId': userId });
        
        const allowedUserIds = new Set();
        allowedUserIds.add(userId.toString());

        userGroups.forEach(group => {
            group.members.forEach(m => allowedUserIds.add(m.userId.toString()));
        });

        const hasUnauthorizedAccess = allAttendeeIds.some(id => !allowedUserIds.has(id));

        if (hasUnauthorizedAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Nincs jogosultságod lekérdezni olyan felhasználók foglaltságát, akikkel nem vagy közös csoportban!' 
            });
        }
    }

    const expandedEvents = await eventService.getExpandedEventsForUsers(
      searchStart, 
      searchEnd, 
      allAttendeeIds
    );

    const availableTimeSlots = freeBusyService.findAvailableTimeSlots(
      searchParams, 
      expandedEvents
    );

    return res.status(200).json({
      success: true,
      count: availableTimeSlots.length,
      data: availableTimeSlots
    });

  } catch (error) {
    console.error('Hiba az időpontkeresés feldolgozásakor:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Szerverhiba az időpontok kalkulálásakor.' 
    });
  }
};