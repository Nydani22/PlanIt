const { RRule } = require('rrule');

/**
 * Kibontja az ismétlődő eseményeket egy megadott keresési időablakban.
 */
function expandEventInWindow(event, searchStart, searchEnd) {
  // Ha nincs ismétlődés, nincs mit kibontani (a séma 'NONE' default értéke alapján)
  if (!event.recurrence || event.recurrence.frequency === 'NONE') {
    return [event];
  }

  const freqMapping = {
    'DAILY': RRule.DAILY,
    'WEEKLY': RRule.WEEKLY
  };

  const dayMapping = {
    0: RRule.SU, 1: RRule.MO, 2: RRule.TU, 
    3: RRule.WE, 4: RRule.TH, 5: RRule.FR, 6: RRule.SA
  };

  const durationMs = new Date(event.toDate).getTime() - new Date(event.fromDate).getTime();

  // --- ÚJ: Időzóna kompenzáló segédfüggvények ---
  // Mivel az adatbázis UTC-ben tárol, az rrule viszont a Date objektum helyi összetevőit olvassa,
  // el kell tolnunk a percekkel, hogy ne csússzanak el a találatok.
  const shiftToRrule = (d) => {
    const date = new Date(d);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  };
  
  const shiftFromRrule = (d) => {
    const date = new Date(d);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  };

  const ruleOptions = {
    freq: freqMapping[event.recurrence.frequency],
    // Alkalmazzuk az eltolást a kezdődátumra
    dtstart: shiftToRrule(event.fromDate),
  };

  // untilDate kezelése a sémából (eltolással)
  if (event.recurrence.untilDate) {
    ruleOptions.until = shiftToRrule(event.recurrence.untilDate);
  }

  // Heti ismétlődés napjainak kezelése a daysOfWeek tömb alapján
  if (event.recurrence.frequency === 'WEEKLY' && event.recurrence.daysOfWeek && event.recurrence.daysOfWeek.length > 0) {
    ruleOptions.byweekday = event.recurrence.daysOfWeek.map(dayNum => dayMapping[dayNum]);
  }

  const rule = new RRule(ruleOptions);
  
  // A keresési ablak végeit is kompenzálva adjuk át
  const generatedDatesRrule = rule.between(shiftToRrule(searchStart), shiftToRrule(searchEnd), true);

  const expandedEvents = [];
  
  // Törölt dátumok (cancelledDates) előkészítése a sémából
  const cancelledTimestamps = event.recurrence.cancelledDates 
    ? event.recurrence.cancelledDates.map(d => new Date(d).getTime()) 
    : [];

  for (const rruleDate of generatedDatesRrule) {
    // Visszatoljuk a legenerált dátumot a valós (UTC-vel szinkronban lévő) időpontra
    const startDate = shiftFromRrule(rruleDate);

    // Így már a timestamp alapú egyezés is tökéletesen fog működni
    if (!cancelledTimestamps.includes(startDate.getTime())) {
      expandedEvents.push({
        _id: event._id,
        eventName: event.eventName,
        isExternal: event.isExternal,
        organizerId: event.organizerId,
        category: event.category, // Séma alapján kötelező mező
        attendees: event.attendees, // Résztvevők listája
        fromDate: startDate, 
        toDate: new Date(startDate.getTime() + durationMs)
      });
    }
  }

  return expandedEvents;
}

module.exports = { expandEventInWindow };