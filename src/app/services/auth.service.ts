import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { Credentials, LoginResponse, UserResponse } from '../models/auth.model';
import { AuthSessionService } from './auth-session.service';

export type SessionResult = 'authenticated' | 'anonymous' | 'connection-error';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly session = inject(AuthSessionService);
  private validation?: { version: number; request: Observable<SessionResult> };

  login(credentials: Credentials): Observable<void> {
    return this.http.post<LoginResponse>('/api/v1/auth/login', credentials).pipe(
      tap(({ data }) => this.session.authenticate(
        { access_token: data.access_token, expires_at: data.expires_at }, data.user,
      )),
      map(() => undefined),
    );
  }

  ensureAuthenticated(recheck = false): Observable<SessionResult> {
    if (this.session.isLoggingOut) return of('anonymous');
    const current = this.session.current;
    if (!current) return of('anonymous');
    if (this.session.status === 'authenticated') return of('authenticated');
    if (this.validation?.version === current.version) return this.validation.request;
    if (this.session.status === 'connection-error' && !recheck) return of('connection-error');

    this.session.startChecking();
    const { token, version } = current;
    const request = this.http.get<UserResponse>('/api/v1/auth/me').pipe(
      map(({ data }): SessionResult => this.session.validate(token, version, data) ? 'authenticated' : 'anonymous'),
      catchError((error: unknown): Observable<SessionResult> => {
        if (!this.session.isCurrent(token, version)) return of('anonymous');
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.session.clear();
          return of('anonymous');
        }
        this.session.connectionError(token, version);
        return of('connection-error');
      }),
      finalize(() => {
        if (this.validation?.version === version) this.validation = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.validation = { version, request };
    return request;
  }

  logout(): Observable<'done' | 'unconfirmed'> {
    const current = this.session.current;
    if (!current || this.session.isLoggingOut) return of('done');
    this.session.isLoggingOut = true;
    return this.http.delete<void>('/api/v1/auth/logout').pipe(
      map(() => 'done' as const),
      catchError((error: unknown) => of(error instanceof HttpErrorResponse && error.status === 401
        ? 'done' as const : 'unconfirmed' as const)),
      tap((result) => {
        if (this.session.isCurrent(current.token, current.version)) {
          this.session.clear(result === 'unconfirmed' ? 'logout-unconfirmed' : null);
        }
      }),
    );
  }
}
