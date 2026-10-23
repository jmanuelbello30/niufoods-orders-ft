import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthNotice, AuthStatus, AuthUser, StoredSession } from '../models/auth.model';

const STORAGE_KEY = 'niufoods-orders-session';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly router = inject(Router);
  private readonly statusSubject = new BehaviorSubject<AuthStatus>('anonymous');
  readonly status$ = this.statusSubject.asObservable();
  private session: StoredSession | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private version = 0;

  user: AuthUser | null = null;
  notice: AuthNotice = null;
  persistenceWarning = false;
  isLoggingOut = false;

  constructor() {
    this.restore();
  }

  get status(): AuthStatus { return this.statusSubject.value; }

  get current(): { token: string; version: number } | null {
    if (!this.session) return null;
    if (Date.parse(this.session.expires_at) <= Date.now()) {
      this.expire();
      return null;
    }
    return { token: this.session.access_token, version: this.version };
  }

  isCurrent(token: string, version: number): boolean {
    return this.current?.token === token && this.version === version;
  }

  authenticate(data: StoredSession, user: AuthUser): void {
    this.replace(data, user, 'authenticated');
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.persistenceWarning = false;
    } catch {
      this.persistenceWarning = true;
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Memory remains authoritative. */ }
    }
  }

  validate(token: string, version: number, user: AuthUser): boolean {
    if (!this.isCurrent(token, version)) return false;
    this.user = user;
    this.statusSubject.next('authenticated');
    return true;
  }

  connectionError(token: string, version: number): void {
    if (this.isCurrent(token, version)) this.statusSubject.next('connection-error');
  }

  startChecking(): void {
    if (this.current && this.status !== 'authenticated') this.statusSubject.next('checking');
  }

  clear(notice: AuthNotice = null): void {
    this.version++;
    this.session = null;
    this.user = null;
    this.notice = notice;
    this.persistenceWarning = false;
    this.cancelTimer();
    this.statusSubject.next('anonymous');
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Session remains cleared in memory. */ }
  }

  invalidate(token: string, version: number): void {
    if (!this.isCurrent(token, version)) return;
    this.clear('expired');
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private restore(): void {
    let parsed: unknown;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw === null) return;
      parsed = JSON.parse(raw) as unknown;
    } catch {
      this.clear();
      return;
    }
    if (!isStoredSession(parsed)) {
      this.clear();
      return;
    }
    if (Date.parse(parsed.expires_at) <= Date.now()) {
      this.clear('expired');
      return;
    }
    this.replace(parsed, null, 'checking');
  }

  private replace(data: StoredSession, user: AuthUser | null, status: AuthStatus): void {
    this.cancelTimer();
    this.version++;
    this.session = data;
    this.user = user;
    this.notice = null;
    this.statusSubject.next(status);
    this.scheduleExpiry();
  }

  private scheduleExpiry(): void {
    if (!this.session) return;
    const remaining = Date.parse(this.session.expires_at) - Date.now();
    if (remaining <= 0) { this.expire(); return; }
    this.timer = setTimeout(() => this.scheduleExpiry(), Math.min(remaining, 2_147_483_647));
  }

  private expire(): void {
    if (!this.session) return;
    this.clear('expired');
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private cancelTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (!('access_token' in value) || !('expires_at' in value)) return false;
  if (typeof value.access_token !== 'string' || value.access_token.trim().length === 0 ||
      typeof value.expires_at !== 'string') return false;
  const date = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value.expires_at);
  if (!date || !Number.isFinite(Date.parse(value.expires_at))) return false;
  const year = Number(date[1]);
  const month = Number(date[2]);
  const day = Number(date[3]);
  return month >= 1 && month <= 12 && day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}
