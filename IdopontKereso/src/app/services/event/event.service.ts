import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppEvent } from '../../models/event.model';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = `${environment.apiUrl}/api/events`;

  private http = inject(HttpClient);

  createEvent(event: AppEvent): Observable<AppEvent> {
    return this.http.post<AppEvent>(`${this.apiUrl}/create`, event);
  }

  getEvents(startDate?: Date, endDate?: Date): Observable<AppEvent[]> {
    let params = new HttpParams();
  
    if (startDate && endDate) {
      params = params.set('startDate', startDate.toISOString());
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<AppEvent[]>(this.apiUrl, { params });
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