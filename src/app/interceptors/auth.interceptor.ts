import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionService);
  let url: URL;
  try { url = new URL(request.url, location.href); }
  catch { return next(request); }
  if (url.origin !== location.origin || !url.pathname.startsWith('/api/v1/') ||
      url.pathname === '/api/v1/auth/login') return next(request);

  const current = session.current;
  if (!current) return next(request);
  const authorized = request.clone({ setHeaders: { Authorization: `Bearer ${current.token}` } });
  return next(authorized).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401 &&
        url.pathname !== '/api/v1/auth/logout' &&
        session.status === 'authenticated') session.invalidate(current.token, current.version);
    return throwError(() => error);
  }));
};
