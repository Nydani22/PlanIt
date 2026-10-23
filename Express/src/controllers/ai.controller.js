const { generateAIContent } = require('../services/ai.service');
const eventService = require('../services/event.service');
const groupService = require('../services/group.service');
const freeBusyService = require('../services/freebusy.service');
const { fromZonedTime } = require('date-fns-tz');

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

const buildSystemInstruction = (pastEvents, upcomingEvents, historyText, currentTime, timeZone) => `
    Információk a felhasználóról:
    - Aktuális helyi idő: ${currentTime}
    - Felhasználó időzónája: ${timeZone}

    SZIGORÚ IDŐZÓNA ÉS DÁTUM SZABÁLYOK: 
    1. A fenti 'Aktuális helyi idő' és a naptáresemények 'start' / 'end' mezői mind azonos formátumban (YYYY-MM-DD, HH:mm:ss) vannak, a felhasználó helyi idejében!
    2. BEVITEL (Eszközök használatakor): Az eszközök a dátumokat (fromDate, toDate, stb.) SZIGORÚAN A FELHASZNÁLÓ HELYI IDEJÉBEN várják (YYYY-MM-DDTHH:mm:ss formátumban)! NE számold át UTC-re, hagyd meg az eredeti időzóna szerinti értéket, a szerver majd elvégzi a konverziót!

    KÖVETKEZŐ (JÖVŐBELI VAGY FOLYAMATBAN LÉVŐ) ESEMÉNYEK:
    Ezek az események még nem kezdődtek el, vagy épp most zajlanak. Ha a felhasználó a "következő" programját kérdezi, KIZÁRÓLAG EBBŐL A LISTÁBÓL válaszd a legelsőt!
    ${JSON.stringify(upcomingEvents)}

    MÚLTBELI ESEMÉNYEK:
    Ezek az események már VÉGET ÉRTEK. Szigorúan TILOS őket jövőbeli vagy következő eseményként kezelni! Csak akkor használd őket, ha a felhasználó kifejezetten a múltra kérdez (pl. "Mi volt tegnap?").
    ${JSON.stringify(pastEvents)}

    EDDIGI BESZÉLGETÉS ELŐZMÉNYE:
    ${historyText}

    SZIGORÚ SZABÁLYOK ÉS HATÁROK: 
    1. Te egy Naptár Asszisztens vagy. A feladatod az események kezelése és a naptár lekérdezése.
    2. SZINKRONIZÁLÁS (Képek, beosztások): 
       - Ha a felhasználó egy beosztás szinkronizálását kéri, KÖTELEZŐ a 'syncSchedule' eszközt használnod! 
       - Ne ellenőrizgesd a meglévő eseményeket, csak olvasd le az új listát pontosan (a helyi idő szerint), és add át a 'syncSchedule' eszköznek. A szerver megoldja a frissítést és a törlést!
    3. Ha új eseményt kér (és még nincs a naptárban), használd a 'createEvents' eszközt! Az eszközök SZIGORÚAN a HELYI IDŐT várják ('fromDate', 'toDate')!
    4. Ha módosítani akar: Keresd meg a TELJES listában az 'id'-t. Csak használd az 'updateEvents' vagy 'deleteEvents' eszközt az adott azonosítóval!
    5. Ha TÖRÖLNI akar: Keresd meg az 'id'-t, és használd a 'deleteEvents' eszközt!
    6. Ha nem egyértelmű az azonosítás, kérdezz vissza eszközhívás nélkül!
    7. Válaszgeneráláskor formázz Markdown kiemelésekkel (**dátum**, **időpont**)!
`;

const processToolCalls = async (functionCalls, userId, timeZone) => {
    const results = {
        pendingCreations: [],
        pendingUpdates: [],
        pendingDeletions: [],
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
                        fromDate: fromZonedTime(eventArgs.fromDate, timeZone),
                        toDate: fromZonedTime(eventArgs.toDate, timeZone),
                        isAllDay: eventArgs.isAllDay ?? false,
                        category: eventArgs.category || 'OTHER',
                        organizerId: userId,
                        attendees: attendees,
                        ...(groupId && { groupId: groupId })
                    };

                    delete newEventPayload.groupName;
                    delete newEventPayload.optionalAttendees;

                    results.pendingCreations.push(newEventPayload);
                }
                
                if (results.pendingCreations.length > 0) {
                    results.hasModification = true;
                }
            break;

            case 'updateEvents':
                for (const updateArgs of call.args.updates) {
                    const { eventId, ...updateData } = updateArgs;
                    
                    const existingEvent = await eventService.getEventById(eventId, userId);
                    
                    if (existingEvent) {
                        const hasPermission = await eventService.checkEventPermission(existingEvent, userId);
                        if (!hasPermission) {
                            results.actionErrors.push(`Nincs jogosultságod a(z) '${existingEvent.eventName}' esemény módosításához.`);
                            continue;
                        }

                        if (updateData.fromDate) updateData.fromDate = fromZonedTime(updateData.fromDate, timeZone);
                        if (updateData.toDate) updateData.toDate = fromZonedTime(updateData.toDate, timeZone);

                        results.pendingUpdates.push({ eventId, ...updateData });
                        results.hasModification = true;
                    }
                }
                break;

            case 'deleteEvents':
                for (const eventId of call.args.eventIds) {
                    const existingEvent = await eventService.getEventById(eventId, userId);
                    if (existingEvent) {
                        const hasPermission = await eventService.checkEventPermission(existingEvent, userId);
                        if (!hasPermission) {
                            results.actionErrors.push(`Nincs jogosultságod a(z) '${existingEvent.eventName}' esemény törléséhez.`);
                            continue;
                        }

                        results.pendingDeletions.push({
                            eventId: eventId,
                            eventName: existingEvent.eventName,
                            fromDate: existingEvent.fromDate
                        });
                        results.hasModification = true;
                    }
                }
                break;

            case 'syncSchedule':
                const { targetEventName } = call.args;
                
                if (!call.args.shifts || call.args.shifts.length === 0) {
                    break;
                }

                const shifts = call.args.shifts.map(s => ({
                    ...s,
                    fromDate: fromZonedTime(s.fromDate, timeZone),
                    toDate: fromZonedTime(s.toDate, timeZone)
                }));

                const shiftStartTimes = shifts.map(s => s.fromDate.getTime());
                const shiftEndTimes = shifts.map(s => s.toDate.getTime());
                
                const minDate = new Date(Math.min(...shiftStartTimes));
                const maxDate = new Date(Math.max(...shiftEndTimes));
                
                maxDate.setDate(maxDate.getDate() + 1);
                
                const EventModel = require('../models/Event.model');
                const existingEvents = await EventModel.find({
                    organizerId: userId,
                    groupId: { $exists: false },
                    fromDate: { $gte: minDate },
                    toDate: { $lte: maxDate }
                });

                const processedIds = new Set();
                
                const normalizeStr = (str) => {
                    if (!str) return '';
                    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/gi, '').toLowerCase();
                };
                
                const targetNorm = normalizeStr(targetEventName);

                const toCompareStr = (dateObj) => {
                    const d = new Date(dateObj);
                    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                };

                const toDateStr = (dateObj) => {
                    const d = new Date(dateObj);
                    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                };

                const uniqueShifts = [];
                const shiftSignatures = new Set();
                
                for (const s of shifts) {
                    const sig = `${normalizeStr(s.eventName)}_${toCompareStr(s.fromDate)}`;
                    if (!shiftSignatures.has(sig)) {
                        shiftSignatures.add(sig);
                        uniqueShifts.push(s);
                    }
                }

                const shiftEventNorms = [...new Set(uniqueShifts.map(s => normalizeStr(s.eventName)))];

                for (const shift of uniqueShifts) {
                    const shiftStartStr = toCompareStr(shift.fromDate);
                    const shiftEndStr = toCompareStr(shift.toDate);
                    const shiftDateStr = toDateStr(shift.fromDate);
                    
                    const shiftNameClean = shift.eventName.trim().toLowerCase();
                    const shiftNameNorm = normalizeStr(shift.eventName);
                    let existingMatch = null;

                    existingMatch = existingEvents.find(e => {
                        if (processedIds.has(e._id.toString())) return false;
                        return e.eventName.trim().toLowerCase() === shiftNameClean &&
                               toCompareStr(e.fromDate) === shiftStartStr &&
                               toCompareStr(e.toDate) === shiftEndStr;
                    });

                    if (!existingMatch) {
                        existingMatch = existingEvents.find(e => {
                            if (processedIds.has(e._id.toString())) return false;
                            return e.eventName.trim().toLowerCase() === shiftNameClean &&
                                   toDateStr(e.fromDate) === shiftDateStr;
                        });
                    }

                    if (!existingMatch) {
                        existingMatch = existingEvents.find(e => {
                            if (processedIds.has(e._id.toString())) return false;
                            if (toCompareStr(e.fromDate) === shiftStartStr && toCompareStr(e.toDate) === shiftEndStr) {
                                const oldNorm = normalizeStr(e.eventName);
                                return oldNorm.includes(shiftNameNorm) || shiftNameNorm.includes(oldNorm);
                            }
                            return false;
                        });
                    }

                    if (!existingMatch) {
                        existingMatch = existingEvents.find(e => {
                            if (processedIds.has(e._id.toString())) return false;
                            if (toDateStr(e.fromDate) === shiftDateStr) {
                                const oldNorm = normalizeStr(e.eventName);
                                return oldNorm.includes(shiftNameNorm) || shiftNameNorm.includes(oldNorm);
                            }
                            return false;
                        });
                    }

                    if (existingMatch) {
                        processedIds.add(existingMatch._id.toString());
                        
                        const oldNorm = normalizeStr(existingMatch.eventName);
                        const newNorm = shiftNameNorm;
                        
                        const oldLocation = (existingMatch.location || '').trim();
                        const newLocation = (shift.location && shift.location.trim() !== '') ? shift.location.trim() : oldLocation;
                        
                        const oldDescription = (existingMatch.description || '').trim();
                        const newDescription = (shift.description && shift.description.trim() !== '') ? shift.description.trim() : oldDescription;
                        
                        const oldIsAllDay = Boolean(existingMatch.isAllDay);
                        const newIsAllDay = Boolean(shift.isAllDay);

                        const timeChanged = toCompareStr(existingMatch.fromDate) !== shiftStartStr || 
                                            toCompareStr(existingMatch.toDate) !== shiftEndStr;

                        if (timeChanged || 
                            oldNorm !== newNorm ||
                            oldLocation !== newLocation ||
                            oldDescription !== newDescription ||
                            oldIsAllDay !== newIsAllDay) {
                            
                            results.pendingUpdates.push({
                                eventId: existingMatch._id,
                                organizerId: existingMatch.organizerId,
                                groupId: existingMatch.groupId,
                                isExternal: existingMatch.isExternal,
                                fromDate: shift.fromDate,
                                toDate: shift.toDate,
                                eventName: shift.eventName,
                                category: shift.category || existingMatch.category,
                                location: newLocation,
                                description: newDescription,
                                isAllDay: newIsAllDay
                            });
                        }
                    } else {
                        results.pendingCreations.push({
                            ...shift,
                            category: shift.category || 'WORK',
                            isAllDay: shift.isAllDay || false,
                            attendees: [{ userId: userId, status: 'ACCEPTED', attendanceType: 'REQUIRED' }]
                        });
                    }
                }

                for (const oldEvent of existingEvents) {
                    if (!processedIds.has(oldEvent._id.toString())) {
                        const oldNorm = normalizeStr(oldEvent.eventName);
                        
                        const isDuplicateOrCancelled = 
                            shiftEventNorms.some(norm => oldNorm.includes(norm) || norm.includes(oldNorm)) || 
                            (targetNorm && oldNorm.includes(targetNorm));

                        if (isDuplicateOrCancelled) {
                            results.pendingDeletions.push({
                                eventId: oldEvent._id,
                                eventName: oldEvent.eventName,
                                fromDate: oldEvent.fromDate
                            });
                        }
                    }
                }

                if (results.pendingCreations.length > 0 || results.pendingUpdates.length > 0 || results.pendingDeletions.length > 0) {
                    results.hasModification = true;
                }
                break;
                
            case 'getEvents':
                const startD = fromZonedTime(call.args.startDate, timeZone);
                const endD = fromZonedTime(call.args.endDate, timeZone);
                const events = await eventService.getUserEvents(userId, startD, endD);
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
                const { durationMinutes, groupName, allowedDays, startHour, endHour } = call.args;
                
                const searchStart = fromZonedTime(call.args.searchStart, timeZone);
                const searchEnd = fromZonedTime(call.args.searchEnd, timeZone);

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
                            results.actionErrors.push(`Nincs jogosultságod a(z) '${targetGroup.groupName}' csoport tagjainak szabad időpontjait lekérdezni.`);
                            break;
                        }
                    } else {
                        results.actionErrors.push(`Nem található '${groupName}' nevű csoport a szabad időpont kereséséhez.`);
                        break;
                    }
                }

                const allAttendeeIds = [...new Set(requiredAttendees)];
                const expandedEvents = await eventService.getExpandedEventsForUsers(
                    searchStart, 
                    searchEnd, 
                    allAttendeeIds
                );

                const searchParams = {
                    searchStart: searchStart,
                    searchEnd: searchEnd,
                    durationMinutes: durationMinutes,
                    allowedDays: allowedDays || [1, 2, 3, 4, 5, 6, 0],
                    startHour: startHour,
                    endHour: endHour,
                    timeZone: timeZone,
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
        const { message, timeZone, history } = req.body;
        const file = req.file;
        const userId = req.user.id;

        const now = new Date();
        const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        const windowEvents = await eventService.getExpandedEventsForUsers(
            new Date(now.getTime() - ninetyDays), 
            new Date(now.getTime() + ninetyDays), 
            [userId]
        );

        const pastEvents = [];
        const upcomingEvents = [];

        windowEvents.forEach(e => {
            const mappedEvent = { 
                id: e._id, 
                title: e.eventName, 
                isGroupEvent: !!e.groupId,
                start: new Date(e.fromDate).toLocaleString('en-CA', { timeZone: timeZone || 'UTC', hour12: false }), 
                end: new Date(e.toDate).toLocaleString('en-CA', { timeZone: timeZone || 'UTC', hour12: false }) 
            };
            
            if (new Date(e.toDate) < now) {
                pastEvents.push(mappedEvent);
            } else {
                upcomingEvents.push(mappedEvent);
            }
        });

        const historyText = formatChatHistory(history);
        
        const userTz = timeZone || 'UTC';
        const formattedNow = new Date().toLocaleString('en-CA', { timeZone: userTz, hour12: false });        
        const systemInstruction = buildSystemInstruction(pastEvents, upcomingEvents, historyText, formattedNow, userTz);

        let contents = [systemInstruction + "\n\nFelhasználó kérése: " + (message || "Elemezd ezt a képet!")];
        if (file) {
            contents.push({ inlineData: { data: file.buffer.toString("base64"), mimeType: file.mimetype } });
        }

        const result = await generateAIContent(contents);
        const response = await result.response;
        let functionCalls = response.functionCalls();
        
        if (functionCalls && functionCalls.length > 0) {
            const toolResults = await processToolCalls(functionCalls, userId, timeZone);

            if (toolResults.hasModification) {
                return res.json({
                    success: true,
                    action: 'reviewRequired',
                    message: 'Előkészítettem a kért módosításokat. Kérlek, nézd át és hagyd jóvá őket a felületen!',
                    pendingCreations: toolResults.pendingCreations,
                    pendingUpdates: toolResults.pendingUpdates,
                    pendingDeletions: toolResults.pendingDeletions,
                    actionErrors: toolResults.actionErrors
                });
            } 
            
            else {
                const summaryPrompt = `
                A felhasználó kérése ez volt: "${message}"
                A lekérdezett nyers adatok:
                - Események: ${JSON.stringify(toolResults.fetchedEventsSummary)}
                - Csoportok: ${JSON.stringify(toolResults.fetchedGroupsSummary)}
                - Szabad időpontok: ${JSON.stringify(toolResults.fetchedTimeSlots)}
                
                Válaszold meg a felhasználó kérdését a fenti adatok alapján, barátságos stílusban!
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