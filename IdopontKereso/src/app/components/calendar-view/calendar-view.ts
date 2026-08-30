import { CommonModule, registerLocaleData } from '@angular/common';
import { Component, OnInit, inject, LOCALE_ID, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import localeHu from '@angular/common/locales/hu';
import { CalendarModule, CalendarEvent, CalendarView, CalendarEventTimesChangedEvent, CalendarDateFormatter } from 'angular-calendar';
import { MatDialog } from '@angular/material/dialog';
import { MatButton, MatButtonModule } from "@angular/material/button";
import { Subject } from 'rxjs';
import { EventService } from '../../services/event/event.service';
import { AuthService } from '../../services/auth/auth.service';
import { UserService } from '../../services/user/user.service';
import { AppEvent } from '../../models/event.model';
import { User, UserSettings } from '../../models/user.model';
import { CustomDateFormatter } from './custom-date-formatter.provider';
import { EventDialogComponent } from '../event-dialog/event-dialog';
import { SnackbarService } from '../../services/snackbar/snackbar.service';
import { CalendarRefreshService } from '../../services/calendarRefresh/calendar-refresh.service';
import { HostListener } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';
import { Group } from '../../models/group.model';

registerLocaleData(localeHu);

const VIEW_MAP: Record<UserSettings['defaultView'], CalendarView> = {
  month: CalendarView.Month,
  week: CalendarView.Week,
  day: CalendarView.Day
};

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, CalendarModule, MatButtonModule, MatButton, MatIconModule],
  providers: [
    { provide: LOCALE_ID, useValue: 'hu' },
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter
    }
  ],
  templateUrl: './calendar-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './calendar-view.scss'
})
export class CalendarViewComponent implements OnInit {
  private eventService = inject(EventService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackbarService = inject(SnackbarService);
  private calendarRefreshService = inject(CalendarRefreshService);
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

  dragToCreateActive = false;
  dragStart: Date | null = null;
  dragEnd: Date | null = null;
  private readonly dragTempEventId = 'drag-ghost-event';

  constructor() {
    effect(() => {
      const newDate = this.calendarRefreshService.selectedDate();
      if (this.viewDate.getTime() !== newDate.getTime()) {
        this.viewDate = newDate;
        this.loadEvents();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const interactionsOn = this.calendarRefreshService.interactionsEnabled();
      
      this.events = this.events.map(event => {
        const originalEvent = event.meta?.originalEvent;
        const isGroupEvent = event.meta?.originalEvent?.attendees?.length > 1;
        const isExternalEvent = originalEvent?.isExternal;

        return {
          ...event,
          draggable: interactionsOn && !isGroupEvent && !isExternalEvent,
          resizable: (!interactionsOn || isGroupEvent) ? undefined : {
            beforeStart: true,
            afterEnd: true,
          }
        };
      });
      
      this.refresh.next();
    });
  }

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
      next: (user: User) => {
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
        this.snackbarService.showError('Hiba történt a felhasználói beállítások betöltésekor.');
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
        this.snackbarService.showError('Hiba történt az események betöltésekor.');
      }
    });
  }

  private expandEvents(events: AppEvent[]): CalendarEvent[] {
    const calendarEvents: CalendarEvent[] = [];
    const MAX_RECURRENCE_YEARS = 1;
    const currentUserId = this.authService.getCurrentUserId();

    events.forEach(item => {
      let startDate: Date;
      let endDate: Date;

      if (item.isAllDay) {
        const localStart = new Date(item.fromDate);
        const localEnd = new Date(item.toDate);
        
        startDate = new Date(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 0, 0, 0);
        endDate = new Date(localEnd.getFullYear(), localEnd.getMonth(), localEnd.getDate(), 23, 59, 59);
      } else {
        startDate = new Date(item.fromDate);
        endDate = new Date(item.toDate);
      }
      const duration = endDate.getTime() - startDate.getTime();

      let displayTitle = item.eventName;
      
      if (!item.isAllDay) {
        const isMultiDay = startDate.toDateString() !== endDate.toDateString();
        
        if (isMultiDay) {
          const startStr = startDate.toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const endStr = endDate.toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          
          displayTitle = `${startStr} - ${endStr} | ${item.eventName}`;
        } else {
          const startTimeStr = startDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
          const endTimeStr = endDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
          
          displayTitle = `${startTimeStr} - ${endTimeStr} | ${item.eventName}`;
        }
      }

      const isGroupEvent = item.attendees && item.attendees.length > 1;
      const interactionsOn = this.calendarRefreshService.interactionsEnabled();
      const isExternalEvent = item.isExternal
      const organizer = item.organizerId as string | User | undefined;
      const organizerId = typeof organizer === 'object' && organizer !== null
        ? organizer._id
        : organizer;

      let isGroupAdminOrOwner = false;

      const group = item.groupId as string | Group | undefined;

      if (group && typeof group === 'object' && Array.isArray(group.members)) {
        
        const myMembership = group.members.find(m => {
          const memberUser = m.userId as unknown as string | User;
          const mUserId = typeof memberUser === 'object' && memberUser !== null
            ? memberUser._id 
            : memberUser;
            
          return mUserId === currentUserId;
        });

        if (myMembership && (myMembership.role === 'OWNER' || myMembership.role === 'ADMIN')) {
          isGroupAdminOrOwner = true;
        }
      }
      const canEdit = (organizerId === currentUserId || isGroupAdminOrOwner) && !isExternalEvent;

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
        cssClass: 'select-none',
        draggable: interactionsOn && !isGroupEvent && !isExternalEvent,
        resizable: (!interactionsOn || isGroupEvent || isExternalEvent) ? undefined : {
          beforeStart: true,
          afterEnd: true,
        },
        meta: {
          description: item.description,
          originalId: item._id,
          recurrence: item.recurrence,
          originalEvent: item,
          canEdit: canEdit,
          isMultiDay: startDate.toDateString() !== endDate.toDateString()
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
      data: { event: originalAppEvent }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadEvents();
        this.calendarRefreshService.triggerRefresh();
      }
    });
  }

  onDeleteEvent(mouseEvent: MouseEvent, calendarEvent: CalendarEvent): void {
    mouseEvent.stopPropagation();
    const originalEvent = calendarEvent.meta?.originalEvent;
    
    if (!originalEvent || !originalEvent._id) return;

    const confirmDialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      restoreFocus: false,
      autoFocus: false,
      data: {
        title: 'Esemény törlése',
        message: 'Biztosan törölni szeretnéd ezt az eseményt? Ezt a műveletet nem lehet visszavonni.',
        confirmText: 'Törlés',
        cancelText: 'Mégsem',
        color: 'warn' 
      }
    });

    confirmDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.eventService.deleteEvent(originalEvent._id).subscribe({
          next: () => {
            this.snackbarService.showSuccess('Esemény sikeresen törölve.');
            this.loadEvents();
            this.calendarRefreshService.triggerRefresh();
          },
          error: () => this.snackbarService.showError('Hiba az esemény törlésekor.')
        });
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

    if (originalEvent.attendees && originalEvent.attendees.length > 1) {
      this.snackbarService.showWarning('Csoportos esemény időpontja nem módosítható húzással!');
      this.loadEvents();
      return;
    }

    if (originalEvent.isExternal) {
      this.snackbarService.showWarning('Külső (importált) esemény időpontja nem módosítható!');
      this.loadEvents();
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

    const originalStartDate = new Date(originalEvent.fromDate);
    const occurrenceOldStart = new Date(event.start);
    
    const isFirstOccurrence = 
      originalStartDate.getFullYear() === occurrenceOldStart.getFullYear() &&
      originalStartDate.getMonth() === occurrenceOldStart.getMonth() &&
      originalStartDate.getDate() === occurrenceOldStart.getDate();

    let updatedFromDate = new Date(originalEvent.fromDate);
    let updatedToDate = new Date(originalEvent.toDate);
    
    const durationMs = updatedToDate.getTime() - updatedFromDate.getTime();

    if (isFirstOccurrence) {
      updatedFromDate = new Date(newStart);
      updatedToDate = newEnd ? new Date(newEnd) : new Date(newStart.getTime() + durationMs);
    } else {
      updatedFromDate.setHours(newStart.getHours(), newStart.getMinutes(), 0, 0);
      
      if (newEnd) {
        updatedToDate.setHours(newEnd.getHours(), newEnd.getMinutes(), 0, 0);
      } else {
        updatedToDate = new Date(updatedFromDate.getTime() + durationMs);
      }
    }

    const payload: AppEvent = {
      ...originalEvent,
      fromDate: updatedFromDate,
      toDate: updatedToDate
    };

    this.eventService.updateEvent(originalEvent._id, payload).subscribe({
      next: () => {
        this.loadEvents();
        this.calendarRefreshService.triggerRefresh();
      },
      error: (err) => {
        this.snackbarService.showError('Hiba az esemény mozgatásakor.');
        this.loadEvents(); 
      }
    });
  }
  
  private createDefaultEvent(start: Date, end: Date): void {
    
    const tempEventId = 'temp-' + Date.now();
    const tempEvent: CalendarEvent = {
      id: tempEventId,
      title: 'Létrehozás folyamatban...',
      start: start,
      end: end,
      color: {
        primary: '#3b82f6',
        secondary: 'color-mix(in srgb, #3b82f6 20%, white)',
        secondaryText: '#3b82f6'
      },
      cssClass: 'animate-pulse pointer-events-none opacity-80' 
    };

    this.events = [...this.events, tempEvent];
    this.refresh.next();

    const newEventPayload: Partial<AppEvent> = {
      eventName: 'Új esemény',
      description: '',
      location: '',
      category: 'OTHER',
      isAllDay: false,
      fromDate: start,               
      toDate: end,             
      recurrence: {
        frequency: 'NONE',
        daysOfWeek: []
      },
      color: "#3b82f6"
    };

    this.eventService.createEvent(newEventPayload as AppEvent).subscribe({
      next: () => {
        this.loadEvents();
        this.calendarRefreshService.triggerRefresh();
      },
      error: (err) => {
        this.events = this.events.filter(e => e.id !== tempEventId);
        this.refresh.next();
        this.snackbarService.showError('Hiba az esemény létrehozásakor.');
      }
    });
  }


  startDragToCreate(segmentDate: Date) {
    if (!this.calendarRefreshService.interactionsEnabled()) return; 
    
    this.dragToCreateActive = true;
    this.dragStart = segmentDate;
    this.dragEnd = segmentDate;

    const segmentDurationMs = (60 / this.hourSegments) * 60 * 1000;
    const end = new Date(segmentDate.getTime() + segmentDurationMs);
    
    const ghostEvent: CalendarEvent = {
      id: this.dragTempEventId,
      title: 'Kijelölés...',
      start: segmentDate,
      end: end,
      color: {
        primary: '#9ca3af',
        secondary: 'color-mix(in srgb, #9ca3af 20%, white)',
        secondaryText: '#9ca3af'
      },
      cssClass: 'opacity-50 pointer-events-none'
    };

    this.events = [...this.events, ghostEvent];
    this.refresh.next();
  }

  dragToCreate(segmentDate: Date) {
    if (this.dragToCreateActive && this.dragStart) {
      this.dragEnd = segmentDate;

      let start = this.dragStart < this.dragEnd ? this.dragStart : this.dragEnd;
      let end = this.dragStart < this.dragEnd ? this.dragEnd : this.dragStart;
      
      const segmentDurationMs = (60 / this.hourSegments) * 60 * 1000;
      const finalEnd = new Date(end.getTime() + segmentDurationMs);

      this.events = this.events.map(event => {
        if (event.id === this.dragTempEventId) {
          return {
            ...event,
            start: start,
            end: finalEnd
          };
        }
        return event;
      });
      
      this.refresh.next();
    }
  }

  @HostListener('document:mouseup')
  endDragToCreate() {
    if (this.dragToCreateActive && this.dragStart && this.dragEnd) {
      this.dragToCreateActive = false;
      
      this.events = this.events.filter(e => e.id !== this.dragTempEventId);
      
      let start = this.dragStart < this.dragEnd ? this.dragStart : this.dragEnd;
      let end = this.dragStart < this.dragEnd ? this.dragEnd : this.dragStart;
      
      const segmentDurationMs = (60 / this.hourSegments) * 60 * 1000;
      end = new Date(end.getTime() + segmentDurationMs);

      this.createDefaultEvent(start, end);
      
      this.dragStart = null;
      this.dragEnd = null;
    }
  }

  setView(view: CalendarView) {
    this.view = view;
  }
}