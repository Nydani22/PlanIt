import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, inject, Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, firstValueFrom, timer } from 'rxjs';
import { tap, catchError, filter, take, retry } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment'; 
import { AuthResponse, LoginCredentials, RegisterData } from '../../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private http = inject(HttpClient);
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<AuthResponse | null>(null);
  
  private platformId = inject(PLATFORM_ID);

  private isTokenValid(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const decodedJson = atob(payload);
      const decodedToken = JSON.parse(decodedJson);
      if (!decodedToken.exp) {
        return false;
      }
      const expirationDate = decodedToken.exp * 1000;
      return Date.now() < (expirationDate - 30000);
    } catch (error) {
      return false;
    }
  }
  
  async initAuth(): Promise<boolean> {
    const token = this.getToken();
    
    if (!token || token === 'undefined') {
      return true;
    }

    if (this.isTokenValid(token)) {
      return true;
    }

    try {
      await firstValueFrom(this.refreshToken());
      return true;
    } catch (error) {
      console.warn('Munkamenet lejárt vagy a szerver nem elérhető.');
      return true;
    }
  }

  register(userData: RegisterData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap((res: AuthResponse) => {
        if (res && res.accessToken) {
          this.setToken(res.accessToken);
        }
      })
    );
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap((res: AuthResponse) => {
        this.setToken(res.accessToken);
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1)
      ) as Observable<AuthResponse>;
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap((res: AuthResponse) => {
        this.isRefreshing = false;
        this.setToken(res.accessToken);
        this.refreshTokenSubject.next(res);
      }),
      catchError((err) => {
        this.isRefreshing = false;
        if (err.status === 401 || err.status === 403) {
          this.logout();
        }
        return throwError(() => err);
      })
    );
  }

  setToken(token: string | null | undefined): void {
    if (isPlatformBrowser(this.platformId)) {
      if (token && token !== 'undefined' && typeof token === 'string' && token.length > 10) {
        localStorage.setItem('token', token);
      }
    }
  }
  
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null; 
  }

  getCurrentUserId(): string {
    const token = this.getToken();
    if (!token) {
      return '';
    }

    try {
      const payload = token.split('.')[1];
      const decodedJson = atob(payload);
      const decodedToken = JSON.parse(decodedJson);
      return decodedToken.id || '';
      
    } catch (error) {
      console.error('Hiba a token dekódolásakor:', error);
      return '';
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
        next: () => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        },
        error: () => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      });
    }
  }
}