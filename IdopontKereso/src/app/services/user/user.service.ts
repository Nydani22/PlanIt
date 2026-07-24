import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly API_URL = 'http://localhost:3000/api/users';
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


  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}