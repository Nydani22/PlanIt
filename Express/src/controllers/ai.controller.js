const { generateAIContent } = require('../services/ai.service');
const eventService = require('../services/event.service');

const handleAIChat = async (req, res) => {
    try {
        const { message, timeZone, currentTime } = req.body;
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

        const systemInstruction = `
            Információk a felhasználóról:
            - Aktuális helyi idő: ${currentTime || new Date().toISOString()}
            - Felhasználó időzónája: ${timeZone || 'UTC'}

            KÖZELGŐ ESEMÉNYEK A KÖVETKEZŐ 14 NAPBAN (JSON formátumban):
            ${JSON.stringify(minimalEvents)}

            SZIGORÚ SZABÁLYOK: 
            1. Ha új eseményt kér, használd a 'createEvents' eszközt!
            2. Ha módosítani akar: Keresd meg a fenti listában a módosítandó esemény 'id'-jét, és használd az 'updateEvent' eszközt!
            3. HA TÖBB HASONLÓ ESEMÉNY VAN a listában, vagy NINCS BENNE, és nem tudod pontosan beazonosítani az 'id'-t, AKKOR NE HASZNÁLJ ESZKÖZT! Helyette normál szövegként kérdezz vissza a felhasználótól (pl. "Pontosan melyik eseményre gondolsz?").
            4. Ha a naptáráról kérdez általánosan (pl. "mi lesz jövő hónapban?"), használd a 'getEvents' eszközt!
            5. Válaszgeneráláskor NE használj Markdown formázást, csak nyers szöveget!
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

            if (call.name === 'updateEvent') {
                const args = call.args;
                const eventId = args.eventId;
                const { eventId: _, ...updateData } = args;

                const updatedEvent = await eventService.updateEvent(eventId, userId, updateData);

                return res.json({
                    success: true,
                    action: 'updateEvent',
                    message: `Sikeresen módosítottam az eseményt!`,
                    event: updatedEvent
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