import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthResponse } from '../../models/auth.model';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (req.url.includes('/refresh') || req.url.includes('/login')) {
    return next(req);
  }

  let authReq = req;
  if (token && token !== 'undefined') {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        
        return authService.refreshToken().pipe(
          switchMap((res: AuthResponse) => {
            
            if (res && res.accessToken) {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${res.accessToken}` }
              });            
              return next(retryReq);
            }
            
            authService.logout();
            return throwError(() => new Error('Sikertelen token frissítés'));
          }),
          catchError((refreshErr) => {
            authService.logout();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
}