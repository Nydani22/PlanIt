import { CommonModule, registerLocaleData } from '@angular/common';
import { Component, OnInit, inject, LOCALE_ID, signal } from '@angular/core';
import localeHu from '@angular/common/locales/hu';
import { CalendarModule, CalendarEvent, CalendarView, CalendarEventTimesChangedEvent, CalendarDateFormatter } from 'angular-calendar';
import { MatDialog } from '@angular/material/dialog';
import { MatButton, MatButtonModule } from "@angular/material/button";
import { Subject } from 'rxjs';
import { EventService } from '../../services/event/event.service';
import { AuthService } from '../../services/auth/auth.service';
import { UserService } from '../../services/user/user.service';
import { AppEvent } from '../../models/event.model';
import { UserSettings } from '../../models/user.model';
import { CustomDateFormatter } from './custom-date-formatter.provider';
import { EventDialogComponent } from '../event-dialog/event-dialog';

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
  private dialog = inject(MatDialog);

  view: CalendarView = CalendarView.Week;
  viewDate: Date = new Date();
  refresh = new Subject<void>();
  CalendarView = CalendarView;

  dayStartHour: number = 6;
  dayEndHour: number = 22;
  hourSegments: number = 2;
  excludeDays: number[] = [];
  isLoading = signal(true);

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

    this.userService.getCurrentUser().subscribe({
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
        this.isLoading.set(false);
        this.refresh.next();
      },
      error: (err) => {
        console.error('Hiba történt a felhasználói beállítások betöltésekor:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadEvents() {
    const currentViewDate = new Date(this.viewDate);
    const startDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1);
    const endDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 2, 0, 23, 59, 59);
    this.eventService.getEvents(startDate, endDate).subscribe({
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
      let startDate: Date;
      let endDate: Date;

      if (item.isAllDay) {
        const utcStart = new Date(item.fromDate);
        const utcEnd = new Date(item.toDate);
        
        startDate = new Date(utcStart.getUTCFullYear(), utcStart.getUTCMonth(), utcStart.getUTCDate(), 0, 0, 0);
        endDate = new Date(utcEnd.getUTCFullYear(), utcEnd.getUTCMonth(), utcEnd.getUTCDate(), 23, 59, 59);
      } else {
        startDate = new Date(item.fromDate);
        endDate = new Date(item.toDate);
      }
      const duration = endDate.getTime() - startDate.getTime();

      let displayTitle = item.eventName;
      
      if (!item.isAllDay) {
        const startTimeStr = startDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        const endTimeStr = endDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        
        displayTitle = `${startTimeStr} - ${endTimeStr} | ${item.eventName}`;
      }

      const baseEvent: CalendarEvent = {
        id: item._id,
        title: displayTitle,
        start: startDate,
        end: endDate,
        allDay: item.isAllDay,
        color: item.color ? {
          primary: `${item.color}`,
          secondary: `color-mix(in srgb, ${item.color} 20%, white)`,
          secondaryText: `${item.color}`
        } : undefined,
        draggable: true, 
        resizable: {
          beforeStart: true,
          afterEnd: true,
        },
        meta: {
          description: item.description,
          originalId: item._id,
          recurrence: item.recurrence,
          originalEvent: item
        }/*,
        actions: [
          {
            label: ' 🗑️ ',
            a11yLabel: 'Törlés',
            onClick: ({ event }: { event: CalendarEvent }): void => {
              console.log('Törlésre kattintottak:', event);
            },
          }
        ]*/
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
            id: `${item._id}-${currentStart.getTime()}`,
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
                id: `${item._id}-${dayIterator.getTime()}`,
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
              id: `${item._id}-${currentStart.getTime()}`,
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

  onEventClick(calendarEvent: CalendarEvent): void {
    const originalAppEvent = calendarEvent.meta?.originalEvent;
    
    if (!originalAppEvent) return;

    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      restoreFocus: false,
      autoFocus: false,
      disableClose: true,
      data: { event: originalAppEvent }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadEvents();
      }
    });
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    const originalEvent = event.meta?.originalEvent;
    
    if (!originalEvent || !originalEvent._id) {
      return;
    }

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
    
    this.refresh.next();

    const targetEnd = newEnd ? newEnd : newStart;
    
    const payload: AppEvent = {
      ...originalEvent,
      fromDate: newStart,
      toDate: targetEnd
    };

    this.eventService.updateEvent(originalEvent._id, payload).subscribe({
      next: () => {
        this.loadEvents();
      },
      error: (err) => {
        console.error('Hiba az esemény mozgatásakor:', err);
        this.loadEvents(); 
      }
    });
  }

  setView(view: CalendarView) {
    this.view = view;
  }
}