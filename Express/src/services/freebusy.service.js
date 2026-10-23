const { toZonedTime, fromZonedTime } = require('date-fns-tz');

exports.findAvailableTimeSlots = (params, events) => {
  const {
    searchStart, searchEnd,
    durationMinutes = 0,
    durationDays = 0,
    allowedDays = [1, 2, 3, 4, 5, 6, 0], 
    startHour = 0, endHour = 24,
    requiredAttendees = [],     
    optionalAttendees = [],     
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0,
    timeZone = 'UTC'
  } = params;

  const totalDurationMinutes = (durationDays * 24 * 60) + durationMinutes;
  const durationMs = totalDurationMinutes * 60000;
  const intraDayDurationMs = durationMinutes * 60000;
  const bufferBeforeMs = bufferBeforeMinutes * 60000;
  const bufferAfterMs = bufferAfterMinutes * 60000;
  const availableSlots = [];

  const localStartZoned = toZonedTime(searchStart, timeZone);
  localStartZoned.setUTCHours(0, 0, 0, 0);

  const localEndZoned = toZonedTime(searchEnd, timeZone);
  localEndZoned.setUTCHours(23, 59, 59, 999);

  const checkCollisions = (checkStart, checkEnd) => {
    let isRequiredBusy = false;
    const busyOptionalUsers = new Set();

    for (const event of events) {
      if (event.allowOverlap) continue;
      
      if (event.fromDate < checkEnd && event.toDate > checkStart) {
        const eventUsers = event.attendees
          .filter(a => a.status !== 'DECLINED')
          .map(a => a.userId.toString());
          
        eventUsers.push(event.organizerId.toString());

        if (requiredAttendees.some(reqId => eventUsers.includes(reqId))) {
          isRequiredBusy = true;
          break;
        }
        
        optionalAttendees.forEach(optId => {
          if (eventUsers.includes(optId)) {
            busyOptionalUsers.add(optId);
          }
        });
      }
    }

    return { isRequiredBusy, busyOptionalCount: busyOptionalUsers.size };
  };

  let currentDayZoned = new Date(localStartZoned);

  while (currentDayZoned <= localEndZoned) {
    const dayOfWeek = currentDayZoned.getUTCDay();

    if (allowedDays.includes(dayOfWeek)) {
      const y = currentDayZoned.getUTCFullYear();
      const m = String(currentDayZoned.getUTCMonth() + 1).padStart(2, '0');
      const d = String(currentDayZoned.getUTCDate()).padStart(2, '0');
      const prefix = `${y}-${m}-${d}`;

      let activeStartAbsolute = fromZonedTime(`${prefix}T${String(startHour).padStart(2, '0')}:00:00`, timeZone);
      let activeEndAbsolute;

      if (endHour === 24) {
         const nextDay = new Date(currentDayZoned);
         nextDay.setUTCDate(nextDay.getUTCDate() + 1);
         const ny = nextDay.getUTCFullYear();
         const nm = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
         const nd = String(nextDay.getUTCDate()).padStart(2, '0');
         activeEndAbsolute = fromZonedTime(`${ny}-${nm}-${nd}T00:00:00`, timeZone);
      } else {
         activeEndAbsolute = fromZonedTime(`${prefix}T${String(endHour).padStart(2, '0')}:00:00`, timeZone);
      }

      const stepMs = 30 * 60000; 
      let slotStartAbsolute = new Date(activeStartAbsolute);
      
      while ((slotStartAbsolute.getTime() + intraDayDurationMs) <= activeEndAbsolute.getTime() && 
             (slotStartAbsolute.getTime() + durationMs) <= searchEnd.getTime()) {
        
        const slotEndAbsolute = new Date(slotStartAbsolute.getTime() + durationMs);
        let isAllDaysAllowed = true;
        
        let checkDayZoned = toZonedTime(slotStartAbsolute, timeZone);
        checkDayZoned.setUTCHours(0, 0, 0, 0);
        
        let endCheckDayZoned = toZonedTime(slotEndAbsolute, timeZone);
        endCheckDayZoned.setUTCHours(0, 0, 0, 0);
        
        const exactSlotEndZoned = toZonedTime(slotEndAbsolute, timeZone);
        if (exactSlotEndZoned.getUTCHours() === 0 && exactSlotEndZoned.getUTCMinutes() === 0 && slotEndAbsolute.getTime() > slotStartAbsolute.getTime()) {
           endCheckDayZoned.setUTCDate(endCheckDayZoned.getUTCDate() - 1);
        }

        let tempDayZoned = new Date(checkDayZoned);
        while (tempDayZoned <= endCheckDayZoned) {
          if (!allowedDays.includes(tempDayZoned.getUTCDay())) {
            isAllDaysAllowed = false;
            break;
          }
          tempDayZoned.setUTCDate(tempDayZoned.getUTCDate() + 1);
        }

        if (isAllDaysAllowed) {
          const checkStart = new Date(slotStartAbsolute.getTime() - bufferBeforeMs);
          const checkEnd = new Date(slotEndAbsolute.getTime() + bufferAfterMs);
          const { isRequiredBusy, busyOptionalCount } = checkCollisions(checkStart, checkEnd);

          if (!isRequiredBusy) {
            availableSlots.push({
              start: new Date(slotStartAbsolute),
              end: new Date(slotEndAbsolute),
              availableOptionalCount: optionalAttendees.length - busyOptionalCount
            });
          }
        }
        slotStartAbsolute = new Date(slotStartAbsolute.getTime() + stepMs);
      }
    }
    currentDayZoned.setUTCDate(currentDayZoned.getUTCDate() + 1);
  }

  const exactStartLimitMs = new Date(searchStart).getTime();
  const exactEndLimitMs = new Date(searchEnd).getTime();

  const filteredSlots = availableSlots.filter(slot => {
    return slot.start.getTime() >= exactStartLimitMs && slot.end.getTime() <= exactEndLimitMs;
  });

  filteredSlots.sort((a, b) => {
    return a.start.getTime() - b.start.getTime();
  });

  return filteredSlots;
};