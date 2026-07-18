import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppEvent } from '../../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = 'http://localhost:3000/api/events';

  private http = inject(HttpClient);

  createEvent(event: AppEvent): Observable<AppEvent> {
    return this.http.post<AppEvent>(`${this.apiUrl}/create`, event);
  }

  getEvents(): Observable<AppEvent[]> {
    return this.http.get<AppEvent[]>(`${this.apiUrl}`);
  }

  getEventById(eventId: string): Observable<AppEvent> {
    return this.http.get<AppEvent>(`${this.apiUrl}/${eventId}`);
  }

  updateEvent(eventId: string, eventData: Partial<AppEvent>): Observable<AppEvent> {
    return this.http.put<AppEvent>(`${this.apiUrl}/${eventId}`, eventData);
  }

  deleteEvent(eventId: string): Observable<AppEvent> {
    return this.http.delete<AppEvent>(`${this.apiUrl}/${eventId}`);
  }

  updateAttendeeStatus(eventId: string, status: string): Observable<AppEvent> {
    return this.http.patch<AppEvent>(`${this.apiUrl}/${eventId}/status`, { status });
  }

  cancelEventInstance(eventId: string, dateToCancel: string | Date): Observable<AppEvent> {
    return this.http.patch<AppEvent>(`${this.apiUrl}/${eventId}/cancel-instance`, { dateToCancel });
  }
}