const { generateAIContent } = require('../services/ai.service');
const eventService = require('../services/event.service');
const groupService = require('../services/group.service');
const freeBusyService = require('../services/freebusy.service');

const formatChatHistory = (history) => {
    let parsedHistory = [];
    if (history) {
        try {
            parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
        } catch (e) {
            console.error('Hiba a history feldolgozásakor:', e);
        }
    }
    
    if (parsedHistory && Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        return parsedHistory.map(msg => 
            `${msg.role === 'user' ? 'Felhasználó' : 'AI'}: ${msg.content}`
        ).join('\n');
    }
    return "Nincs előzmény.";
};

const buildSystemInstruction = (minimalEvents, historyText, currentTime, timeZone) => `
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
    2. TILTOTT minden olyan kérés teljesítése, ami nem kapcsolódik a naptárhoz, az időbeosztáshoz vagy a programokhoz.
    3. Ha a felhasználó naptárfüggetlen kérdést tesz fel, KÖTELEZŐ udvariasan visszautasítanod.
    4. Ha új eseményt kér, használd a 'createEvents' eszközt!
    5. Ha módosítani akar: Keresd meg a fenti listában az esemény(ek) 'id'-jét, és használd az 'updateEvents' eszközt!
    6. Ha TÖRÖLNI akar: Keresd meg az esemény(ek) 'id'-jét a listában, és használd a 'deleteEvents' eszközt!
    7. HA TÖBB HASONLÓ ESEMÉNY VAN a listában, vagy NINCS BENNE, és nem tudod pontosan beazonosítani az 'id'-t, AKKOR NE HASZNÁLJ ESZKÖZT! Helyette normál szövegként kérdezz vissza a felhasználótól.
    8. Ha a naptáráról kérdez általánosan, használd a 'getEvents' eszközt!
    9. Ha a csoportjairól vagy a csapattagokról kérdez, használd a 'getUserGroups' eszközt!
    10. Ha a felhasználó szabad időpontot, ráérést keres magának vagy egy csoportnak, KÖTELEZŐ a 'findAvailableTime' eszközt használnod!
    11. Válaszgeneráláskor HASZNÁLJ bátran Markdown formázást! Emeld ki vastagon (**) a fontos információkat (pl. dátumokat, időpontokat), és használj markdown listákat (-), hogy átlátható és szép legyen a végeredmény!
`;

const processToolCalls = async (functionCalls, userId) => {
    const results = {
        savedEvents: [],
        updatedEvents: [],
        deletedIds: [],
        fetchedEventsSummary: [],
        fetchedGroupsSummary: [],
        fetchedTimeSlots: [],
        actionErrors: [],
        hasModification: false
    };

    for (const call of functionCalls) {
        switch (call.name) {
            case 'createEvents':
                for (const eventArgs of call.args.events) {
                    let attendees = [];
                    let groupId = null;
                    let permissionDenied = false;
                    const optionalList = eventArgs.optionalAttendees || [];

                    if (eventArgs.groupName) {
                        const groups = await groupService.getUserGroups(userId);
                        const targetGroup = groups.find(g => g.groupName.toLowerCase().includes(eventArgs.groupName.toLowerCase()));
                        
                        if (targetGroup) {
                            const myMembership = targetGroup.members.find(m => 
                                (m.userId._id ? m.userId._id.toString() : m.userId.toString()) === userId.toString()
                            );

                            if (myMembership && (myMembership.role === 'OWNER' || myMembership.role === 'ADMIN')) {
                                groupId = targetGroup._id;
                                
                                targetGroup.members.forEach(m => {
                                    if (m.userId && m.userId._id.toString() !== userId.toString()) {
                                        const memberName = (m.userId.fullName || m.userId.userName || '').toLowerCase();
                                        const isOptional = optionalList.some(optName => memberName.includes(optName.toLowerCase()));

                                        attendees.push({
                                            userId: m.userId._id,
                                            status: 'PENDING',
                                            attendanceType: isOptional ? 'OPTIONAL' : 'REQUIRED'
                                        });
                                    }
                                });
                            } else {
                                permissionDenied = true;
                                results.actionErrors.push(`Nem sikerült létrehozni az eseményt a(z) '${targetGroup.groupName}' csoport számára. Ehhez Admin vagy Tulajdonos rang szükséges.`);
                            }
                        } else {
                            permissionDenied = true;
                            results.actionErrors.push(`Nem található '${eventArgs.groupName}' nevű csoport, így a közös eseményt nem hoztam létre.`);
                        }
                    }

                    if (permissionDenied) {
                        continue; 
                    }

                    const newEventPayload = {
                        ...eventArgs,
                        isAllDay: eventArgs.isAllDay ?? false,
                        category: eventArgs.category || 'OTHER',
                        organizerId: userId,
                        attendees: attendees,
                        ...(groupId && { groupId: groupId })
                    };

                    delete newEventPayload.groupName;
                    delete newEventPayload.optionalAttendees;

                    const saved = await eventService.createEvent(newEventPayload, userId);
                    results.savedEvents.push(saved);
                }
                
                if (results.savedEvents.length > 0) {
                    results.hasModification = true;
                }
            break;

            case 'updateEvents':
                for (const updateArgs of call.args.updates) {
                    const { eventId, ...updateData } = updateArgs;
                    const updated = await eventService.updateEvent(eventId, userId, updateData);
                    results.updatedEvents.push(updated);
                }
                results.hasModification = true;
                break;

            case 'deleteEvents':
                for (const eventId of call.args.eventIds) {
                    await eventService.deleteEvent(eventId, userId);
                    results.deletedIds.push(eventId);
                }
                results.hasModification = true;
                break;

            case 'getEvents':
                const { startDate, endDate } = call.args;
                const events = await eventService.getUserEvents(userId, startDate, endDate);
                results.fetchedEventsSummary.push(...events.map(e => ({
                    title: e.eventName,
                    start: e.fromDate,
                    end: e.toDate
                })));
                break;

            case 'getUserGroups':
                const groups = await groupService.getUserGroups(userId);
                const minimalGroups = groups.map(g => {
                    const myMemberInfo = g.members.find(m => m.userId && m.userId._id.toString() === userId.toString());
                    const memberNames = g.members.map(m => m.userId ? `${m.userId.fullName || m.userId.userName} (${m.role})` : 'Ismeretlen tag');
                    return {
                        groupName: g.groupName,
                        description: g.description,
                        members: memberNames,
                        myRole: myMemberInfo ? myMemberInfo.role : 'MEMBER'
                    };
                });
                results.fetchedGroupsSummary.push(...minimalGroups);
                break;

            case 'findAvailableTime':
                const { searchStart, searchEnd, durationMinutes, groupName, allowedDays, startHour, endHour } = call.args;
                
                let requiredAttendees = [userId.toString()];
                let targetGroupName = 'Saját naptár';
                
                if (groupName) {
                    const groups = await groupService.getUserGroups(userId);
                    const targetGroup = groups.find(g => g.groupName.toLowerCase().includes(groupName.toLowerCase()));
                    
                    if (targetGroup) {
                        const myMembership = targetGroup.members.find(m => 
                            (m.userId._id ? m.userId._id.toString() : m.userId.toString()) === userId.toString()
                        );

                        if (myMembership && (myMembership.role === 'OWNER' || myMembership.role === 'ADMIN')) {
                            requiredAttendees = targetGroup.members.map(m => m.userId._id ? m.userId._id.toString() : m.userId.toString());
                            targetGroupName = targetGroup.groupName;
                        } else {
                            results.actionErrors.push(`Nincs jogosultságod a(z) '${targetGroup.groupName}' csoport tagjainak szabad időpontjait lekérdezni. Ezt csak a csoport tulajdonosa vagy adminisztrátora teheti meg.`);
                            break;
                        }
                    } else {
                        results.actionErrors.push(`Nem található '${groupName}' nevű csoport a szabad időpont kereséséhez.`);
                        break;
                    }
                }

                const allAttendeeIds = [...new Set(requiredAttendees)];
                const expandedEvents = await eventService.getExpandedEventsForUsers(
                    new Date(searchStart), 
                    new Date(searchEnd), 
                    allAttendeeIds
                );

                const searchParams = {
                    searchStart: new Date(searchStart),
                    searchEnd: new Date(searchEnd),
                    durationMinutes: durationMinutes,
                    allowedDays: allowedDays || [1, 2, 3, 4, 5],
                    startHour: startHour || 9,
                    endHour: endHour || 17,
                    requiredAttendees: allAttendeeIds,
                    optionalAttendees: []
                };

                const availableSlots = freeBusyService.findAvailableTimeSlots(searchParams, expandedEvents);
                
                const topSlots = availableSlots.slice(0, 10).map(s => ({ start: s.start, end: s.end }));
                
                results.fetchedTimeSlots.push({
                    target: targetGroupName,
                    foundSlots: topSlots.length > 0 ? topSlots : 'Nem találtam megfelelő szabad időpontot.'
                });
                break;
        }
    }
    
    return results;
};

const handleAIChat = async (req, res) => {
    try {
        const { message, timeZone, currentTime, history } = req.body;
        const file = req.file;
        const userId = req.user.id;

        const now = new Date();
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        const windowEvents = await eventService.getExpandedEventsForUsers(
            new Date(now.getTime() - ninetyDays), 
            new Date(now.getTime() + ninetyDays), 
            [userId]
        );

        const minimalEvents = windowEvents.map(e => ({ id: e._id, title: e.eventName, start: e.fromDate, end: e.toDate }));
        const historyText = formatChatHistory(history);
        const systemInstruction = buildSystemInstruction(minimalEvents, historyText, currentTime, timeZone);

        let contents = [systemInstruction + "\n\nFelhasználó kérése: " + (message || "Elemezd ezt a képet!")];
        if (file) {
            contents.push({ inlineData: { data: file.buffer.toString("base64"), mimeType: file.mimetype } });
        }

        const result = await generateAIContent(contents);
        const response = await result.response;
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const toolResults = await processToolCalls(functionCalls, userId);

            const summaryPrompt = `
            A felhasználó kérése ez volt: "${message || 'Hangüzenet'}"
            
            Az alábbi műveleteket hajtottam végre a háttérben:
            - Létrehozva: ${toolResults.savedEvents.length} db
            - Módosítva: ${toolResults.updatedEvents.length} db
            - Törölve: ${toolResults.deletedIds.length} db
            - Lekérdezett események (ha volt): ${JSON.stringify(toolResults.fetchedEventsSummary)}
            - Lekérdezett csoportok (ha volt): ${JSON.stringify(toolResults.fetchedGroupsSummary)}
            - Talált SZABAD IDŐPONTOK: ${JSON.stringify(toolResults.fetchedTimeSlots)}
            - HIBÁK/MEGTAGADOTT MŰVELETEK: ${JSON.stringify(toolResults.actionErrors)}
            
            Kérlek, írj egy egybefüggő, barátságos, természetes nyelvű összefoglalót a felhasználónak arról, hogy mit csináltál! Csak azokat a műveleteket említsd, amikből 1 vagy több történt! Ha a 'HIBÁK' mezőben látsz valamit (pl. jogosultsági probléma), KÖTELEZŐ elmondanod a felhasználónak! Használj Markdown formázást a kiemelésekhez!`;
            
            const secondResult = await generateAIContent(summaryPrompt);

            return res.json({
                success: true,
                action: toolResults.hasModification ? 'updateEvent' : 'message',
                message: secondResult.response.text(),
                events: [...toolResults.savedEvents, ...toolResults.updatedEvents],
                deletedIds: toolResults.deletedIds
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