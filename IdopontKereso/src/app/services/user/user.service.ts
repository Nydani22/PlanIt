import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

export interface TokenResponse {
  success: boolean;
  message: string;
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly API_URL = `${environment.apiUrl}/api/users`;
  private http = inject(HttpClient);
  
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me`);
  }

  
  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/${id}`);
  }


  updateUser(id: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/${id}`, userData);
  }


  deleteUser(id: string): Observable<User> {
    return this.http.delete<User>(`${this.API_URL}/${id}`);
  }

  regenerateCalendarToken(): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.API_URL}/regenerate-feed-token`, {});
  }
}