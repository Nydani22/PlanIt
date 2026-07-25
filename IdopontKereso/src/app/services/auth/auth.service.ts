import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, inject, Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, filter, take } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment'; 

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private http = inject(HttpClient);
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  
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
  
  initAuth(): Promise<any> {
    return new Promise((resolve) => {
      const token = this.getToken();
      
      if (!token || token === 'undefined') {
        resolve(true);
        return;
      }

      if (this.isTokenValid(token)) {
        resolve(true);
        return;
      }

      this.refreshToken().subscribe({
        next: () => {
          resolve(true);
        },
        error: () => {
          console.warn('Munkamenet lejárt, bejelentkezés szükséges.');
          resolve(true); 
        }
      });
    });
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap((res: any) => {
        this.setToken(res.accessToken);
      })
    );
  }

  refreshToken(): Observable<any> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1)
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.http.post(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap((res: any) => {
        this.isRefreshing = false;
        this.setToken(res.accessToken);
        this.refreshTokenSubject.next(res.accessToken);
      }),
      catchError((err) => {
        this.isRefreshing = false;
        this.logout();
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
      localStorage.removeItem('token');
      this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
        next: () => {
          window.location.href = '/login';
        },
        error: () => {
          window.location.href = '/login';
        }
      });
    }
  }
}