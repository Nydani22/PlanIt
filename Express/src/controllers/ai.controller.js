const { generateAIContent, performWebSearch } = require('../services/ai.service');
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
    - Aktuális helyi idő: ${currentTime}
    - Felhasználó időzónája: ${timeZone}

    SZIGORÚ IDŐZÓNA ÉS DÁTUM SZABÁLYOK: 
    1. A fenti 'Aktuális helyi idő' és a naptáresemények 'start' / 'end' mezői mind azonos formátumban (YYYY-MM-DD, HH:mm:ss) vannak, a felhasználó helyi idejében!
    2. KÖVETKEZŐ ESEMÉNY VIZSGÁLATA: Egy esemény CSAK AKKOR lehet "következő", ha a 'start' dátuma és ideje SZIGORÚAN KÉSŐBBI, mint az 'Aktuális helyi idő' (${currentTime})! Olyan eseményt, amelynek a kezdési időpontja már elmúlt a mai napon, TILOS következő eseményként megjelölni! Ha a mai napon már nincs több kezdődő program, keresd meg a legelső olyan eseményt a következő napokból, ami még nem kezdődött el!
    3. BEVITEL (Eszközök használatakor): Ha új eseményt hozol létre ('createEvents') vagy módosítasz ('updateEvents'), az eszközök SZIGORÚAN UTC ISO 8601 formátumot várnak! Számold át a helyi időt UTC-re az eszközhívás paramétereiben!

    ESEMÉNYEK AZ ELMÚLT ÉS A KÖVETKEZŐ 90 NAPBAN:
    ${JSON.stringify(minimalEvents)}

    EDDIGI BESZÉLGETÉS ELŐZMÉNYE:
    ${historyText}

    SZIGORÚ SZABÁLYOK ÉS HATÁROK: 
    1. Te egy Naptár Asszisztens vagy. A feladatod az események kezelése és a naptár lekérdezése.
    2. Ha a felhasználó egy nyilvános esemény (pl. Forma-1 futam, meccs, koncert) naptárba írását kéri, de nincs meg a kezdési időpont, KÖTELEZŐ használnod a 'searchWeb' eszközt a dátum és időpont felkutatására! Ne kérdezd meg a felhasználótól!
    3. SZINKRONIZÁLÁS (Képek, beosztások): 
       - Ha a felhasználó egy beosztás szinkronizálását kéri, KÖTELEZŐ a 'syncSchedule' eszközt használnod! 
       - Ne ellenőrizgesd a meglévő eseményeket, csak olvasd le az új listát pontosan (számold át UTC-re), és add át a 'syncSchedule' eszköznek. A szerver megoldja a frissítést és a törlést!
    4. Ha új eseményt kér (és még nincs a naptárban), használd a 'createEvents' eszközt! Az eszközök SZIGORÚAN UTC ISO 8601 formátumot várnak ('fromDate', 'toDate')!
    5. Ha módosítani akar: Keresd meg a TELJES listában az 'id'-t. FIGYELEM: Csoportos eseményeket (ahol isGroupEvent: true) TILOS MÓDOSÍTANOD ÉS TÖRÖLNÖD! Ilyen kérés esetén ne használj eszközt, hanem udvariasan tájékoztasd a felhasználót, hogy a csoportos események adatait csak a naptár felületén lehet megváltoztatni. Csak személyes eseményeknél használd az 'updateEvents' vagy 'deleteEvents' eszközt!
    6. Ha TÖRÖLNI akar: Keresd meg az 'id'-t, és használd a 'deleteEvents' eszközt!
    7. Ha nem egyértelmű az azonosítás, kérdezz vissza eszközhívás nélkül!
    8. Válaszgeneráláskor formázz Markdown kiemelésekkel (**dátum**, **időpont**)!
`;

const processToolCalls = async (functionCalls, userId, timeZone) => {
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
                    
                    const existingEvent = await eventService.getEventById(eventId, userId);
                    
                    if (existingEvent && existingEvent.groupId) {
                        results.actionErrors.push(`A(z) '${existingEvent.eventName}' esemény csoportos, így az AI nem módosíthatja.`);
                        continue;
                    }
                    
                    if (existingEvent) {
                        const updated = await eventService.updateEvent(eventId, userId, updateData);
                        results.updatedEvents.push(updated);
                    }
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

            case 'syncSchedule':
                const { periodStart, periodEnd, targetEventName, shifts } = call.args;
                
                const EventModel = require('../models/Event.model');
                const existingEvents = await EventModel.find({
                    organizerId: userId,
                    groupId: { $exists: false },
                    fromDate: { $gte: new Date(periodStart) },
                    toDate: { $lte: new Date(periodEnd) }
                });

                const relevantExistingEvents = existingEvents.filter(e => 
                    e.eventName.toLowerCase().includes(targetEventName.toLowerCase())
                );

                const processedIds = new Set();
                let createdCount = 0;
                let updatedCount = 0;

                for (const shift of shifts) {
                    const shiftStart = new Date(shift.fromDate);
                    const shiftEnd = new Date(shift.toDate);

                    const existingMatch = relevantExistingEvents.find(e => 
                        !processedIds.has(e._id.toString()) &&
                        e.fromDate.getFullYear() === shiftStart.getFullYear() &&
                        e.fromDate.getMonth() === shiftStart.getMonth() &&
                        e.fromDate.getDate() === shiftStart.getDate()
                    );

                    if (existingMatch) {
                        processedIds.add(existingMatch._id.toString());
                        if (existingMatch.fromDate.getTime() !== shiftStart.getTime() || 
                            existingMatch.toDate.getTime() !== shiftEnd.getTime()) {
                            
                            await eventService.updateEvent(existingMatch._id, userId, {
                                fromDate: shiftStart,
                                toDate: shiftEnd,
                                eventName: shift.eventName,
                                category: shift.category
                            });
                            updatedCount++;
                        }
                    } else {
                        await eventService.createEvent({
                            ...shift,
                            category: shift.category,
                            isAllDay: false,
                            attendees: [{ userId: userId, status: 'ACCEPTED', attendanceType: 'REQUIRED' }]
                        }, userId);
                        createdCount++;
                    }
                }

                let deletedCount = 0;
                for (const oldEvent of relevantExistingEvents) {
                    if (!processedIds.has(oldEvent._id.toString())) {
                        await eventService.deleteEvent(oldEvent._id, userId);
                        deletedCount++;
                        results.deletedIds.push(oldEvent._id);
                    }
                }

                results.hasModification = true;
                results.actionErrors.push(`Szinkronizáció kész: ${createdCount} új létrehozva, ${updatedCount} frissítve, ${deletedCount} régi törölve.`);
                break;

            case 'getEvents':
                const { startDate, endDate } = call.args;
                const events = await eventService.getUserEvents(userId, startDate, endDate);
                results.fetchedEventsSummary.push(...events.map(e => ({
                    title: e.eventName,
                    start: new Date(e.fromDate).toLocaleString('en-CA', { timeZone: timeZone || 'UTC', hour12: false }),
                    end: new Date(e.toDate).toLocaleString('en-CA', { timeZone: timeZone || 'UTC', hour12: false })
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

        const minimalEvents = windowEvents.map(e => ({ 
            id: e._id, 
            title: e.eventName, 
            isGroupEvent: !!e.groupId,
            start: new Date(e.fromDate).toLocaleString('en-CA', { timeZone: timeZone || 'UTC', hour12: false }), 
            end: new Date(e.toDate).toLocaleString('en-CA', { timeZone: timeZone || 'UTC', hour12: false }) 
        }));
        const historyText = formatChatHistory(history);
        
        const userTz = timeZone || 'UTC';
        const formattedNow = new Date().toLocaleString('en-CA', { timeZone: userTz, hour12: false });
        const systemInstruction = buildSystemInstruction(minimalEvents, historyText, formattedNow, userTz);

        let contents = [systemInstruction + "\n\nFelhasználó kérése: " + (message || "Elemezd ezt a képet!")];
        if (file) {
            contents.push({ inlineData: { data: file.buffer.toString("base64"), mimeType: file.mimetype } });
        }

        const result = await generateAIContent(contents);
        const response = await result.response;
        let functionCalls = response.functionCalls();

        const searchCall = functionCalls?.find(call => call.name === 'searchWeb');
        if (searchCall) {
            const query = searchCall.args.query;
            const searchResult = await performWebSearch(query);

            let followUpPrompt = '';

            if (searchResult) {
                followUpPrompt = `
                Internetes keresési eredmény erre a kérdésre ("${query}"):
                ${searchResult}

                A fenti adatok alapján készítsd el az eseményt a naptárba a 'createEvents' eszközzel!`;
            } else {
                followUpPrompt = `
                Sajnos az internetes keresés jelenleg nem érhető el vagy túllépte a lekérdezési kvótát a következő kérdésre: "${query}".
                Kérlek, tájékoztasd a felhasználót udvariasan, hogy most nem sikerült automatikusan kideríteni az időpontot az internetről, és kérd meg, hogy adja meg ő maga a kezdési időpontot, hogy rögzíthesd a naptárba! Ne hívj meg újabb kereső eszközt!`;
            }

            contents.push(followUpPrompt);
            const secondStepResult = await generateAIContent(contents);
            const secondResponse = await secondStepResult.response;
            functionCalls = secondResponse.functionCalls();

            if (!functionCalls || functionCalls.length === 0) {
                return res.json({
                    success: true,
                    action: 'message',
                    message: secondResponse.text()
                });
            }
        }

        if (functionCalls && functionCalls.length > 0) {
            const toolResults = await processToolCalls(functionCalls, userId, timeZone);

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
            
            Kérlek, írj egy egybefüggő, barátságos, természetes nyelvű összefoglalót a felhasználónak arról, hogy mit csináltál! Csak azokat a műveleteket említsd, amikből 1 vagy több történt! Ha a 'HIBÁK' mezőben látsz valamit (pl. jogosultsági probléma), KÖTELEZŐ elmondanod a felhasználónak! Használj Markdown formázást a kiemelésekhez!
            
            `;
            
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