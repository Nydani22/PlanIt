import { CommonModule, registerLocaleData } from '@angular/common';
import { Component, OnInit, inject, LOCALE_ID } from '@angular/core';
import localeHu from '@angular/common/locales/hu';
import { CalendarModule, CalendarEvent, CalendarView, CalendarEventTimesChangedEvent, CalendarDateFormatter } from 'angular-calendar';
import { MatButton, MatButtonModule } from "@angular/material/button";
import { Subject } from 'rxjs';
import { EventService } from '../../services/event/event.service';
import { AuthService } from '../../services/auth/auth.service';
import { UserService } from '../../services/user/user.service';
import { AppEvent } from '../../models/event.model';
import { UserSettings } from '../../models/user.model';
import { CustomDateFormatter } from './custom-date-formatter.provider';

registerLocaleData(localeHu);

const VIEW_MAP: Record<UserSettings['defaultView'], CalendarView> = {
  month: CalendarView.Month,
  week: CalendarView.Week,
  day: CalendarView.Day
};

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, CalendarModule, MatButtonModule, MatButton],
  providers: [
    { provide: LOCALE_ID, useValue: 'hu' },
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter
    }
  ],
  templateUrl: './calendar-view.html',
  styleUrl: './calendar-view.scss'
})
export class CalendarViewComponent implements OnInit {
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  view: CalendarView = CalendarView.Week;
  viewDate: Date = new Date();
  refresh = new Subject<void>();
  CalendarView = CalendarView;

  dayStartHour: number = 6;
  dayEndHour: number = 22;
  hourSegments: number = 2;
  excludeDays: number[] = [];

  events: CalendarEvent[] = [];

  ngOnInit(): void {
    if (this.authService.getToken()) {
      this.loadUserSettings();
      this.loadEvents();
    }
  }

  private loadUserSettings() {
    const userId = this.authService.getCurrentUserId();

    if (!userId) {
      return;
    }

    this.userService.getUser(userId).subscribe({
      next: (user) => {
        const settings = user.settings;
        if (!settings) {
          return;
        }

        this.dayStartHour = settings.dayStartHour;
        this.dayEndHour = settings.dayEndHour;
        this.hourSegments = settings.hourSegments;
        this.view = VIEW_MAP[settings.defaultView] ?? CalendarView.Week;
        this.excludeDays = settings.hideWeekends ? [0, 6] : [];

        this.refresh.next();
      },
      error: (err) => {
        console.error('Hiba történt a felhasználói beállítások betöltésekor:', err);
      }
    });
  }

  loadEvents() {
    this.eventService.getEvents().subscribe({
      next: (data: AppEvent[]) => {
        this.events = this.expandEvents(data);
        this.refresh.next();
      },
      error: (err) => {
        console.error('Hiba történt az események betöltésekor:', err);
      }
    });
  }

  private expandEvents(events: AppEvent[]): CalendarEvent[] {
    const calendarEvents: CalendarEvent[] = [];
    const MAX_RECURRENCE_YEARS = 1;

    events.forEach(item => {
      const startDate = new Date(item.fromDate);
      const endDate = new Date(item.toDate);
      const duration = endDate.getTime() - startDate.getTime();

      const baseEvent: CalendarEvent = {
        title: item.eventName,
        start: startDate,
        end: endDate,
        allDay: item.isAllDay,
        meta: {
          description: item.description,
          originalId: item._id,
          recurrence: item.recurrence
        }
      };

      if (!item.recurrence || item.recurrence.frequency === 'none') {
        calendarEvents.push(baseEvent);
        return;
      }

      const recurrence = item.recurrence;

      const limitDate = recurrence.untilDate
        ? new Date(recurrence.untilDate)
        : new Date(startDate.getFullYear() + MAX_RECURRENCE_YEARS, startDate.getMonth(), startDate.getDate());

      if (recurrence.frequency === 'DAILY') {
        let currentStart = new Date(startDate);
        while (currentStart <= limitDate) {
          calendarEvents.push({
            ...baseEvent,
            start: new Date(currentStart),
            end: new Date(currentStart.getTime() + duration)
          });
          currentStart.setDate(currentStart.getDate() + 1);
        }
      }
      else if (recurrence.frequency === 'WEEKLY') {
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          let dayIterator = new Date(startDate);
          while (dayIterator <= limitDate) {
            const jsDay = dayIterator.getDay();
            if (recurrence.daysOfWeek.includes(jsDay)) {
              calendarEvents.push({
                ...baseEvent,
                start: new Date(dayIterator),
                end: new Date(dayIterator.getTime() + duration)
              });
            }
            dayIterator.setDate(dayIterator.getDate() + 1);
          }
        }
        else {
          let currentStart = new Date(startDate);
          while (currentStart <= limitDate) {
            calendarEvents.push({
              ...baseEvent,
              start: new Date(currentStart),
              end: new Date(currentStart.getTime() + duration)
            });
            currentStart.setDate(currentStart.getDate() + 7);
          }
        }
      }
      else {
        calendarEvents.push(baseEvent);
      }
    });

    return calendarEvents;
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    this.events = this.events.map((iEvent) => {
      if (iEvent === event) {
        return {
          ...event,
          start: newStart,
          end: newEnd,
        };
      }
      return iEvent;
    });
  }

  setView(view: CalendarView) {
    this.view = view;
  }
}