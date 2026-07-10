import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})

export class EventService {
  private apiUrl = 'http://localhost:3000/api/events';

  constructor(private http: HttpClient, private authService: AuthService) { }

  createEvent(eventData: any): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post(`${this.apiUrl}/create`, eventData, { headers });
  }

  getEvents(): Observable<any[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<any[]>(`${this.apiUrl}`, { headers });
  }
}


