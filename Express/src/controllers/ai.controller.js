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
            let savedEvents = [];
            let updatedEvents = [];
            let deletedIds = [];
            let fetchedEventsSummary = [];
            let hasModification = false;

            for (const call of functionCalls) {
                if (call.name === 'createEvents') {
                    const eventsArray = call.args.events;
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
                    hasModification = true;
                }

                else if (call.name === 'updateEvents') {
                    const updatesArray = call.args.updates;
                    for (const updateArgs of updatesArray) {
                        const { eventId, ...updateData } = updateArgs;
                        const updated = await eventService.updateEvent(eventId, userId, updateData);
                        updatedEvents.push(updated);
                    }
                    hasModification = true;
                }

                else if (call.name === 'deleteEvents') {
                    const idsArray = call.args.eventIds;
                    for (const eventId of idsArray) {
                        await eventService.deleteEvent(eventId, userId);
                        deletedIds.push(eventId);
                    }
                    hasModification = true;
                }

                else if (call.name === 'getEvents') {
                    const { startDate, endDate } = call.args;
                    const events = await eventService.getUserEvents(userId, startDate, endDate);
                    
                    const minimalEvents = events.map(e => ({
                        title: e.eventName,
                        start: e.fromDate,
                        end: e.toDate
                    }));
                    fetchedEventsSummary.push(...minimalEvents);
                }
            }

            const summaryPrompt = `
            A felhasználó kérése ez volt: "${message || 'Hangüzenet'}"
            
            Az alábbi műveleteket hajtottam végre a háttérben:
            - Létrehozva: ${savedEvents.length} db (Adatok: ${JSON.stringify(savedEvents.map(e => ({ title: e.eventName, start: e.fromDate })))})
            - Módosítva: ${updatedEvents.length} db
            - Törölve: ${deletedIds.length} db
            - Lekérdezett események (ha volt ilyen): ${JSON.stringify(fetchedEventsSummary)}
            
            Kérlek, írj egy egybefüggő, barátságos, természetes nyelvű összefoglalót a felhasználónak arról, hogy mit csináltál! Csak azokat a műveleteket említsd, amikből 1 vagy több történt! Használj Markdown formázást a kiemelésekhez!
            `;
            
            const secondResult = await generateAIContent(summaryPrompt);

            return res.json({
                success: true,
                action: hasModification ? 'updateEvent' : 'message',
                message: secondResult.response.text(),
                events: [...savedEvents, ...updatedEvents],
                deletedIds: deletedIds
            });
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