const { generateAIContent } = require('../services/ai.service');
const eventService = require('../services/event.service');

const handleAIChat = async (req, res) => {
    try {
        const { message, timeZone, currentTime, history } = req.body;
        const file = req.file;
        const userId = req.user.id;

        const now = new Date();
        const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const upcomingEvents = await eventService.getUserEvents(userId, now, twoWeeksLater);

        const minimalEvents = upcomingEvents.map(e => ({
            id: e._id,
            title: e.eventName,
            start: e.fromDate,
            end: e.toDate
        }));

        let parsedHistory = [];
        if (history) {
            try {
                parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
            } catch (e) {
                console.error('Hiba a history feldolgozásakor:', e);
            }
        }

        let historyText = "Nincs előzmény.";
        if (parsedHistory && Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            historyText = parsedHistory.map(msg => 
                `${msg.role === 'user' ? 'Felhasználó' : 'AI'}: ${msg.content}`
            ).join('\n');
        }

        const systemInstruction = `
            Információk a felhasználóról:
            - Aktuális helyi idő: ${currentTime || new Date().toISOString()}
            - Felhasználó időzónája: ${timeZone || 'UTC'}

            KÖZELGŐ ESEMÉNYEK A KÖVETKEZŐ 14 NAPBAN (JSON formátumban):
            ${JSON.stringify(minimalEvents)}

            EDDIGI BESZÉLGETÉS ELŐZMÉNYE (Kérlek, használd kontextusként a visszautalásokhoz!):
            ${historyText}

            SZIGORÚ SZABÁLYOK: 
            1. Ha új eseményt kér, használd a 'createEvents' eszközt!
            2. Ha módosítani akar: Keresd meg a fenti listában az esemény(ek) 'id'-jét, és használd az 'updateEvents' eszközt!
            3. Ha TÖRÖLNI akar: Keresd meg az esemény(ek) 'id'-jét a listában, és használd a 'deleteEvents' eszközt!
            4. HA TÖBB HASONLÓ ESEMÉNY VAN a listában, vagy NINCS BENNE, és nem tudod pontosan beazonosítani az 'id'-t, AKKOR NE HASZNÁLJ ESZKÖZT! Helyette normál szövegként kérdezz vissza a felhasználótól.
            5. Ha a naptáráról kérdez általánosan, használd a 'getEvents' eszközt!
            6. Válaszgeneráláskor NE használj Markdown formázást, csak nyers szöveget!
            `;

        let contents = [
            systemInstruction + "\n\nFelhasználó kérése: " + (message || "Elemezd ezt a képet!")
        ];

        if (file) {
            contents.push({
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: file.mimetype
                }
            });
        }

        const result = await generateAIContent(contents);
        const response = await result.response;
        
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            
            if (call.name === 'createEvents') {
                const eventsArray = call.args.events;
                let savedEvents = [];

                for (const eventArgs of eventsArray) {
                    const newEventPayload = {
                        ...eventArgs,
                        isAllDay: eventArgs.isAllDay ?? false,
                        category: eventArgs.category || 'OTHER',
                        color: '#3b82f6',
                        organizerId: userId
                    };
                    const saved = await eventService.createEvent(newEventPayload, userId);
                    savedEvents.push(saved);
                }

                return res.json({
                    success: true,
                    action: 'createEvent',
                    message: `Sikeresen feldolgoztam és létrehoztam ${savedEvents.length} db eseményt a naptáradban!`,
                    events: savedEvents
                });
            }

            if (call.name === 'updateEvents') {
                const updatesArray = call.args.updates;
                let updatedEvents = [];

                for (const updateArgs of updatesArray) {
                    const { eventId, ...updateData } = updateArgs;
                    const updated = await eventService.updateEvent(eventId, userId, updateData);
                    updatedEvents.push(updated);
                }

                return res.json({
                    success: true,
                    action: 'updateEvent', 
                    message: `Sikeresen módosítottam ${updatedEvents.length} db eseményt!`,
                    events: updatedEvents
                });
            }

            if (call.name === 'deleteEvents') {
                const idsArray = call.args.eventIds;
                let deletedCount = 0;

                for (const eventId of idsArray) {
                    await eventService.deleteEvent(eventId, userId);
                    deletedCount++;
                }

                return res.json({
                    success: true,
                    action: 'deleteEvent',
                    message: `Sikeresen töröltem ${deletedCount} db eseményt a naptáradból!`,
                    deletedIds: idsArray
                });
            }

            if (call.name === 'getEvents') {
                const { startDate, endDate } = call.args;
                
                const events = await eventService.getUserEvents(userId, startDate, endDate);
                
                const minimalEvents = events.map(e => ({
                    id: e._id,
                    title: e.eventName,
                    start: e.fromDate,
                    end: e.toDate,
                    location: e.location || 'Nincs megadva'
                }));

                const summaryPrompt = `
                A felhasználó eredeti kérdése ez volt: "${message}"
                
                Az adatbázisból a következő eseményeket találtam a kért időszakban (JSON):
                ${JSON.stringify(minimalEvents)}
                
                Kérlek, válaszold meg a kérdést a fenti adatok alapján egyszerű, nyers szövegként! Ha nincs esemény a listában, mondd meg neki, hogy azon az időszakon szabad. Ne feledd: NE használj Markdown formázást!
                `;

                const secondResult = await generateAIContent(summaryPrompt);
                
                return res.json({
                    success: true,
                    action: 'message',
                    message: secondResult.response.text()
                });
            }
        }

        return res.json({
            success: true,
            action: 'message',
            message: response.text()
        });

    } catch (error) {
        console.error('AI Chat hiba:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Hiba történt az AI asszisztens feldolgozása közben.' 
        });
    }
};

module.exports = {
    handleAIChat
};