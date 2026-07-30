/**
 * free-busy.service.js
 * Intelligens időpontkereső algoritmus
 */

exports.findAvailableTimeSlots = (params, events) => {
  const {
    searchStart, searchEnd,
    durationMinutes = 0,
    durationDays = 0,           // ÚJ: Többnapos események hossza napokban
    allowedDays = [1, 2, 3, 4, 5], 
    startHour = 9, endHour = 17,  
    requiredAttendees = [],     
    optionalAttendees = [],     
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0
  } = params;

  const durationMs = durationMinutes * 60000;
  const bufferBeforeMs = bufferBeforeMinutes * 60000;
  const bufferAfterMs = bufferAfterMinutes * 60000;
  const availableSlots = [];

  let currentDay = new Date(searchStart);
  currentDay.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(searchEnd);
  endDay.setUTCHours(23, 59, 59, 999);

  // Segédfüggvény az ütközések vizsgálatára, hogy ne duplikáljuk a kódot
  const checkCollisions = (checkStart, checkEnd) => {
    let isRequiredBusy = false;
    let busyOptionalCount = 0;

    for (const event of events) {
      if (event.fromDate < checkEnd && event.toDate > checkStart) {
        const eventUsers = event.attendees.map(a => a.userId.toString());
        eventUsers.push(event.organizerId.toString());

        if (requiredAttendees.some(reqId => eventUsers.includes(reqId))) {
          isRequiredBusy = true;
          break;
        }

        optionalAttendees.forEach(optId => {
          if (eventUsers.includes(optId)) {
            busyOptionalCount++;
          }
        });
      }
    }
    return { isRequiredBusy, busyOptionalCount };
  };

  while (currentDay <= endDay) {
    const dayOfWeek = currentDay.getUTCDay();

    if (allowedDays.includes(dayOfWeek)) {
      // --- 1. ESET: TÖBBNAPOS ESEMÉNY (durationDays > 0) ---
      if (durationDays > 0) {
        
        // ÚJ: Ellenőrizzük, hogy a többnapos esemény MINDEN napja engedélyezett-e!
        let isAllDaysAllowed = true;
        for (let i = 0; i < durationDays; i++) {
          const checkDate = new Date(currentDay);
          checkDate.setUTCDate(checkDate.getUTCDate() + i);
          
          if (!allowedDays.includes(checkDate.getUTCDay())) {
            isAllDaysAllowed = false;
            break; // Ha találunk egy tiltott napot (pl. vasárnap), azonnal megszakítjuk
          }
        }

        // Csak akkor megyünk tovább, ha a teljes blokk engedélyezett napokra esik
        if (isAllDaysAllowed) {
          let slotStart = new Date(currentDay);
          slotStart.setUTCHours(startHour, 0, 0, 0);

          let slotEnd = new Date(currentDay);
          // Hozzáadjuk a napokat (pl. 3 napos esemény esetén +2 nap a kezdethez képest)
          slotEnd.setUTCDate(slotEnd.getUTCDate() + (durationDays - 1));
          slotEnd.setUTCHours(endHour, 0, 0, 0);

          // Csak akkor vizsgáljuk, ha a vége nem csúszik túl a teljes keresési ablakon
          if (slotEnd <= endDay) {
            const checkStart = new Date(slotStart.getTime() - bufferBeforeMs);
            const checkEnd = new Date(slotEnd.getTime() + bufferAfterMs);

            // Itt már az új (előzőleg javított) checkCollisions függvényed hívódik meg
            const { isRequiredBusy, busyOptionalCount } = checkCollisions(checkStart, checkEnd);

            if (!isRequiredBusy) {
              availableSlots.push({
                start: new Date(slotStart),
                end: new Date(slotEnd),
                availableOptionalCount: optionalAttendees.length - busyOptionalCount
              });
            }
          }
        }
      }
      // --- 2. ESET: NAPON BELÜLI ESEMÉNY (durationDays === 0) ---
      else {
        let slotStart = new Date(currentDay);
        slotStart.setUTCHours(startHour, 0, 0, 0);

        const dailyEnd = new Date(currentDay);
        dailyEnd.setUTCHours(endHour, 0, 0, 0);
        const stepMs = 30 * 60000; 

        while (slotStart.getTime() + durationMs <= dailyEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + durationMs);
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
          slotStart = new Date(slotStart.getTime() + stepMs);
        }
      }
    }
    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
  }

  // Eredmények szűrése és rendezése
  // A start limit a kezdőnap 00:00:00-ja lesz
  const startLimitDate = new Date(searchStart);
  startLimitDate.setUTCHours(0, 0, 0, 0);
  const startLimitMs = startLimitDate.getTime();

  // Az endLimitMs-hez felhasználhatjuk a kód elején már létrehozott endDay változót, 
  // ami pontosan a zárónap 23:59:59.999-es időpontját tartalmazza.
  const endLimitMs = endDay.getTime();

  const filteredSlots = availableSlots.filter(slot => {
    return slot.start.getTime() >= startLimitMs && slot.end.getTime() <= endLimitMs;
  });

  filteredSlots.sort((a, b) => {
    if (b.availableOptionalCount !== a.availableOptionalCount) {
      return b.availableOptionalCount - a.availableOptionalCount;
    }
    return a.start.getTime() - b.start.getTime();
  });

  return filteredSlots;
};