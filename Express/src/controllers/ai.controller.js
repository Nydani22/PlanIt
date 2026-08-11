const { generateAIContent } = require('../services/ai.service');
const eventService = require('../services/event.service');

const handleAIChat = async (req, res) => {
    try {
        const { message, timeZone, currentTime, history } = req.body;
        const file = req.file;
        const userId = req.user.id;

        const now = new Date();
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        
        const searchStart = new Date(now.getTime() - ninetyDays);
        const searchEnd = new Date(now.getTime() + ninetyDays);
        
        
        const windowEvents = await eventService.getExpandedEventsForUsers(searchStart, searchEnd, [userId]);

        const minimalEvents = windowEvents.map(e => ({
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

            SZIGORÚ IDŐZÓNA SZABÁLY: 
            A felhasználó a saját helyi idejében kéri az időpontokat. Az eszközök ('fromDate', 'toDate') viszont UTC-ben várják az ISO 8601 dátumokat! KÖTELEZŐ átszámolnod a felhasználó helyi idejét UTC-re, mielőtt beírod a JSON-ba!

            ESEMÉNYEK AZ ELMÚLT ÉS A KÖVETKEZŐ 90 NAPBAN (JSON formátumban):
            ${JSON.stringify(minimalEvents)}

            EDDIGI BESZÉLGETÉS ELŐZMÉNYE (Kérlek, használd kontextusként a visszautalásokhoz!):
            ${historyText}

            SZIGORÚ SZABÁLYOK ÉS HATÁROK: 
            1. Te kizárólag egy Naptár Asszisztens vagy! A feladatod CSAK az események létrehozása, módosítása, törlése és a naptár lekérdezése.
            2. TILTOTT minden olyan kérés teljesítése, ami nem kapcsolódik a naptárhoz, az időbeosztáshoz vagy a programokhoz (pl. programozás, matematikai egyenletek oldása, történelem, receptek, versek írása, csevegés).
            3. Ha a felhasználó naptárfüggetlen kérdést tesz fel (pl. egyenletet akar számoltatni, vagy receptet kér), KÖTELEZŐ udvariasan visszautasítanod ezt a következőhez hasonló módon: "Sajnálom, de én egy naptár asszisztens vagyok, csak a teendőid, eseményeid és időbeosztásod kezelésében tudok segíteni."
            4. Ha új eseményt kér, használd a 'createEvents' eszközt!
            5. Ha módosítani akar: Keresd meg a fenti listában az esemény(ek) 'id'-jét, és használd az 'updateEvents' eszközt!
            6. Ha TÖRÖLNI akar: Keresd meg az esemény(ek) 'id'-jét a listában, és használd a 'deleteEvents' eszközt!
            7. HA TÖBB HASONLÓ ESEMÉNY VAN a listában, vagy NINCS BENNE, és nem tudod pontosan beazonosítani az 'id'-t, AKKOR NE HASZNÁLJ ESZKÖZT! Helyette normál szövegként kérdezz vissza a felhasználótól.
            8. Ha a naptáráról kérdez általánosan, használd a 'getEvents' eszközt!
            9. Válaszgeneráláskor HASZNÁLJ bátran Markdown formázást! Emeld ki vastagon (**) a fontos információkat (pl. dátumokat, időpontokat), és használj markdown listákat (-), hogy átlátható és szép legyen a végeredmény!
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