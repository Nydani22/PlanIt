/**
 * free-busy.service.js
 * Intelligens időpontkereső algoritmus
 */

/**
 * @param {Object} params - A keresési beállítások (a frontendről jön)
 * @param {Array} events - A korábban kibontott és összefésült események tömbje
 * @returns {Array} - A felkínálható, rangsorolt szabad időpontok
 */
exports.findAvailableTimeSlots = (params, events) => {
  const {
    searchStart, searchEnd,
    durationMinutes,            // pl. 60 (1 óra)
    allowedDays = [1, 2, 3, 4, 5], // 0: Vasárnap - 6: Szombat (Alap: H-P)
    startHour = 9, endHour = 17,   // Munkaidő (09:00 - 17:00)
    requiredAttendees = [],     // ['userId1', 'userId2']
    optionalAttendees = [],     // ['userId3']
    bufferMinutes = 0           // pl. 15 (perc szünet)
  } = params;

  const durationMs = durationMinutes * 60000;
  const bufferMs = bufferMinutes * 60000;
  const availableSlots = [];

  // 1. Felkészítjük a keresési ablak kezdetét és végét
  let currentDay = new Date(searchStart);
  currentDay.setHours(0, 0, 0, 0);
  const endDay = new Date(searchEnd);
  endDay.setHours(23, 59, 59, 999);

  // Végigiterálunk a napokon a keresési ablakban
  while (currentDay <= endDay) {
    const dayOfWeek = currentDay.getDay();

    // 2. Napok preferenciája (Csak a megengedett napokon keresünk)
    if (allowedDays.includes(dayOfWeek)) {
      
      // Beállítjuk a nap kezdetét és végét a kért "Órakeret" alapján
      let slotStart = new Date(currentDay);
      slotStart.setHours(startHour, 0, 0, 0);

      const dayEnd = new Date(currentDay);
      dayEnd.setHours(endHour, 0, 0, 0);

      // Keresési "lépésköz" (pl. 30 percenként próbálkozunk betenni a találkozót)
      const stepMs = 30 * 60000; 

      // 3. Idősávok vizsgálata az adott napon
      // Addig lépkedünk, amíg a találkozó hossza még belefér a napba
      while (slotStart.getTime() + durationMs <= dayEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        // Pufferidő hozzáadása a vizsgálathoz (kiterjesztjük a vizsgált sávot)
        const checkStart = new Date(slotStart.getTime() - bufferMs);
        const checkEnd = new Date(slotEnd.getTime() + bufferMs);

        let isRequiredBusy = false;
        let busyOptionalCount = 0;

        // 4. Ütközések ellenőrzése az eseményeken
        for (const event of events) {
          // Ha az esemény idősávja BELELÓG a pufferelt vizsgált sávba
          if (event.fromDate < checkEnd && event.toDate > checkStart) {
            
            // Kigyűjtjük az eseményen résztvevők ID-jait (Szervező + Meghívottak)
            const eventUsers = event.attendees.map(a => a.userId.toString());
            eventUsers.push(event.organizerId.toString());

            // A) Kötelező résztvevők ellenőrzése
            const hasRequiredConflict = requiredAttendees.some(reqId => eventUsers.includes(reqId));
            if (hasRequiredConflict) {
              isRequiredBusy = true;
              break; // Nincs értelme tovább vizsgálni ezt az idősávot, azonnal kiejtjük
            }

            // B) Opcionális résztvevők ellenőrzése
            // Megszámoljuk, hány opcionális résztvevő nem ér rá ebben a sávban
            optionalAttendees.forEach(optId => {
              if (eventUsers.includes(optId)) {
                busyOptionalCount++;
              }
            });
          }
        }

        // 5. Ha minden KÖTELEZŐ résztvevő ráér, elmentjük a lehetséges idősávot
        if (!isRequiredBusy) {
          availableSlots.push({
            start: new Date(slotStart),
            end: new Date(slotEnd),
            // Kiszámoljuk, hány opcionális résztvevő tud eljönni
            availableOptionalCount: optionalAttendees.length - busyOptionalCount
          });
        }

        // Lépünk a következő idősávra (pl. 09:00 után 09:30-ra)
        slotStart = new Date(slotStart.getTime() + stepMs);
      }
    }
    // Lépés a következő napra
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // 6. Eredmények rangsorolása (A legfontosabb varázslat!)
  availableSlots.sort((a, b) => {
    // 1. Elsődleges szempont: Ahol a legtöbb OPTIONAL résztvevő ráér, az kerüljön előre
    if (b.availableOptionalCount !== a.availableOptionalCount) {
      return b.availableOptionalCount - a.availableOptionalCount;
    }
    // 2. Másodlagos szempont: Ha döntetlen, akkor időrendben (hamarabbi időpontok előre)
    return a.start.getTime() - b.start.getTime();
  });

  return availableSlots;
};