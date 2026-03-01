import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from './auth';
import { catchError, EMPTY, switchMap, throwError } from 'rxjs';


export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);
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
        switchMap((res: any) => {
          
          if (res && res.accessToken) {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` }
            });
          
            return next(retryReq);
          }
          
          authService.logout();
          return EMPTY;
        }),
        catchError((refreshErr) => {
          authService.logout();
          return EMPTY;
        })
      );
    }
    return throwError(() => error);
  })
);
}