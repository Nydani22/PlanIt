import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, filter, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})

export class Auth {
  private apiUrl = 'http://localhost:3000/api/auth';
  private http = inject(HttpClient);
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  initAuth(): Promise<any> {
    return new Promise((resolve) => {
      const token = this.getToken();
      if (!token || token === 'undefined') {
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
        //console.log('Szerver válasza:', res);
        //console.log(this.getToken())
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
    if (token && token !== 'undefined' && typeof token === 'string' && token.length > 10) {
      localStorage.setItem('token', token);
    }
  }
  
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout(): void {
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