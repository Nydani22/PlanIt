const { RRule } = require('rrule');

function expandEventInWindow(event, searchStart, searchEnd) {
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
    dtstart: shiftToRrule(event.fromDate),
  };

  if (event.recurrence.untilDate) {
    ruleOptions.until = shiftToRrule(event.recurrence.untilDate);
  }

  if (event.recurrence.frequency === 'WEEKLY' && event.recurrence.daysOfWeek && event.recurrence.daysOfWeek.length > 0) {
    ruleOptions.byweekday = event.recurrence.daysOfWeek.map(dayNum => dayMapping[dayNum]);
  }

  const rule = new RRule(ruleOptions);
  
  const generatedDatesRrule = rule.between(shiftToRrule(searchStart), shiftToRrule(searchEnd), true);

  const expandedEvents = [];
  
  const cancelledTimestamps = event.recurrence.cancelledDates 
    ? event.recurrence.cancelledDates.map(d => new Date(d).getTime()) 
    : [];

  for (const rruleDate of generatedDatesRrule) {
    const startDate = shiftFromRrule(rruleDate);

    if (!cancelledTimestamps.includes(startDate.getTime())) {
      expandedEvents.push({
        _id: event._id,
        eventName: event.eventName,
        isExternal: event.isExternal,
        organizerId: event.organizerId,
        category: event.category,
        attendees: event.attendees,
        fromDate: startDate, 
        toDate: new Date(startDate.getTime() + durationMs)
      });
    }
  }

  return expandedEvents;
}

module.exports = { expandEventInWindow };