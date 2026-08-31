exports.findAvailableTimeSlots = (params, events) => {
  const {
    searchStart, searchEnd,
    durationMinutes = 0,
    durationDays = 0,
    allowedDays = [1, 2, 3, 4, 5], 
    startHour = 9, endHour = 17,  
    requiredAttendees = [],     
    optionalAttendees = [],     
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0
  } = params;

  const totalDurationMinutes = (durationDays * 24 * 60) + durationMinutes;
  const durationMs = totalDurationMinutes * 60000;
  const intraDayDurationMs = durationMinutes * 60000;
  const bufferBeforeMs = bufferBeforeMinutes * 60000;
  const bufferAfterMs = bufferAfterMinutes * 60000;
  const availableSlots = [];

  let currentDay = new Date(searchStart);
  currentDay.setHours(0, 0, 0, 0); 
  const endDay = new Date(searchEnd);
  endDay.setHours(23, 59, 59, 999);

  const checkCollisions = (checkStart, checkEnd) => {
    let isRequiredBusy = false;
    let busyOptionalCount = 0;

    for (const event of events) {
      if (event.allowOverlap) continue;
      
      if (event.fromDate < checkEnd && event.toDate > checkStart) {
        const eventUsers = event.attendees.map(a => a.userId.toString());
        eventUsers.push(event.organizerId.toString());

        if (requiredAttendees.some(reqId => eventUsers.includes(reqId))) {
          isRequiredBusy = true;
          break;
        }
        optionalAttendees.forEach(optId => {
          if (eventUsers.includes(optId)) busyOptionalCount++;
        });
      }
    }
    return { isRequiredBusy, busyOptionalCount };
  };

  while (currentDay <= endDay) {
    const dayOfWeek = currentDay.getDay();

    if (allowedDays.includes(dayOfWeek)) {
      let slotStart = new Date(currentDay);
      slotStart.setHours(startHour, 0, 0, 0);

      const activeEnd = new Date(currentDay);
      activeEnd.setHours(endHour, 0, 0, 0);
      
      if (endHour <= startHour) {
        activeEnd.setDate(activeEnd.getDate() + 1);
      }

      const stepMs = 30 * 60000; 
      
      while ((slotStart.getTime() + intraDayDurationMs) <= activeEnd.getTime() && (slotStart.getTime() + durationMs) <= endDay.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        
        let isAllDaysAllowed = true;
        let checkDay = new Date(slotStart);
        checkDay.setHours(0, 0, 0, 0);
        
        let endCheckDay = new Date(slotEnd);
        endCheckDay.setHours(0, 0, 0, 0);
        
        if (slotEnd.getHours() === 0 && slotEnd.getMinutes() === 0 && slotEnd.getTime() > slotStart.getTime()) {
           endCheckDay.setDate(endCheckDay.getDate() - 1);
        }

        let tempDay = new Date(checkDay);
        while (tempDay <= endCheckDay) {
          if (!allowedDays.includes(tempDay.getDay())) {
            isAllDaysAllowed = false;
            break;
          }
          tempDay.setDate(tempDay.getDate() + 1);
        }

        if (isAllDaysAllowed) {
          const checkStart = new Date(slotStart.getTime() - bufferBeforeMs);
          const checkEnd = new Date(slotEnd.getTime() + bufferAfterMs);
          const { isRequiredBusy, busyOptionalCount } = checkCollisions(checkStart, checkEnd);

          if (!isRequiredBusy) {
            availableSlots.push({
              start: new Date(slotStart),
              end: new Date(slotEnd),
              availableOptionalCount: optionalAttendees.length - busyOptionalCount
            });
          }
        }
        slotStart = new Date(slotStart.getTime() + stepMs);
      }
    }
    currentDay.setDate(currentDay.getDate() + 1);
  }

  const startLimitDate = new Date(searchStart);
  startLimitDate.setHours(0, 0, 0, 0);
  const startLimitMs = startLimitDate.getTime();
  const endLimitMs = endDay.getTime();

  const filteredSlots = availableSlots.filter(slot => {
    return slot.start.getTime() >= startLimitMs && slot.end.getTime() <= endLimitMs;
  });

  filteredSlots.sort((a, b) => {
    if (b.availableOptionalCount !== a.availableOptionalCount) return b.availableOptionalCount - a.availableOptionalCount;
    return a.start.getTime() - b.start.getTime();
  });

  return filteredSlots;
};