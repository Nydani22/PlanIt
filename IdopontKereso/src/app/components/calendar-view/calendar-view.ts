import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CalendarModule, CalendarEvent, CalendarView, CalendarEventTimesChangedEvent } from 'angular-calendar';
import { MatButton, MatButtonModule } from "@angular/material/button";
import { Subject } from 'rxjs';
import { Event } from '../../services/event';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, CalendarModule, MatButtonModule, MatButton],
  templateUrl: './calendar-view.html',
  styleUrl: './calendar-view.css'
})
export class CalendarViewComponent implements OnInit {
  view: CalendarView = CalendarView.Week;
  viewDate: Date = new Date();
  refresh = new Subject<void>();
  CalendarView = CalendarView;
  
  events: CalendarEvent[] = [];

  constructor(
    private eventService: Event,
    private authService: Auth
  ) {}

  ngOnInit(): void {
    if (this.authService.getToken()) {
      this.loadEvents();
    }
  }

  loadEvents() {
    this.eventService.getEvents().subscribe({
      next: (data: any[]) => {
        this.events = data.map((item) => {
          return {
            title: item.eventName,
            start: new Date(item.fromDate),
            end: new Date(item.toDate),
            meta: {
              description: item.description,
              originalId: item._id
            }
          };
        });

        this.refresh.next();
      },
      error: (err) => {
        console.error('Hiba történt az események betöltésekor:', err);
      }
    });
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