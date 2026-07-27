const { RRule } = require('rrule');

/**
 * Kibontja az ismétlődő eseményeket egy megadott keresési időablakban.
 */
function expandEventInWindow(event, searchStart, searchEnd) {
  // Ha nincs ismétlődés, nincs mit kibontani (a séma 'NONE' default értéke alapján)
  if (!event.recurrence || event.recurrence.frequency === 'NONE') {
    return [];
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

  const ruleOptions = {
    freq: freqMapping[event.recurrence.frequency],
    dtstart: new Date(event.fromDate),
  };

  // untilDate kezelése a sémából
  if (event.recurrence.untilDate) {
    ruleOptions.until = new Date(event.recurrence.untilDate);
  }

  // Heti ismétlődés napjainak kezelése a daysOfWeek tömb alapján
  if (event.recurrence.frequency === 'WEEKLY' && event.recurrence.daysOfWeek && event.recurrence.daysOfWeek.length > 0) {
    ruleOptions.byweekday = event.recurrence.daysOfWeek.map(dayNum => dayMapping[dayNum]);
  }

  const rule = new RRule(ruleOptions);
  const generatedDates = rule.between(new Date(searchStart), new Date(searchEnd), true);

  const expandedEvents = [];
  
  // Törölt dátumok (cancelledDates) előkészítése a sémából
  const cancelledTimestamps = event.recurrence.cancelledDates 
    ? event.recurrence.cancelledDates.map(d => new Date(d).getTime()) 
    : [];

  for (const startDate of generatedDates) {
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