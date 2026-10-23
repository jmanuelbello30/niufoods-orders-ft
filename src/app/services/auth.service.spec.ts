import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';

const key = 'niufoods-orders-session';
const user = { id: 1, email: 'staff@example.test' };
const future = () => new Date(Date.now() + 60_000).toISOString();

describe('Authentication', () => {
  let http: HttpTestingController;
  let session: AuthSessionService;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
    session.clear();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('logs in with the original password and stores only token and expiry', () => {
    let completed = false;
    auth.login({ email: user.email, password: ' secret ' }).subscribe(() => completed = true);
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual({ email: user.email, password: ' secret ' });
    const expiresAt = future();
    request.flush({ data: { access_token: 'opaque', token_type: 'Bearer', expires_at: expiresAt, user } });
    expect(completed).toBe(true);
    expect(session.status).toBe('authenticated');
    expect(session.user).toEqual(user);
    expect(JSON.parse(sessionStorage.getItem(key) ?? '')).toEqual({ access_token: 'opaque', expires_at: expiresAt });
  });

  it.each([401, 429, 0])('propagates failed login %i without creating a session', (status) => {
    let received = false;
    auth.login({ email: user.email, password: 'wrong' }).subscribe({ error: () => received = true });
    http.expectOne('/api/v1/auth/login').flush({ errors: [] }, { status, statusText: 'Error' });
    expect(received).toBe(true);
    expect(session.current).toBeNull();
  });

  it('shares one /me request and does not recheck a validated session', () => {
    session.authenticate({ access_token: 'opaque', expires_at: future() }, user);
    session.connectionError('opaque', session.current?.version ?? -1);
    session.startChecking();
    const results: string[] = [];
    auth.ensureAuthenticated().subscribe((result) => results.push(result));
    auth.ensureAuthenticated().subscribe((result) => results.push(result));
    const requests = http.match('/api/v1/auth/me');
    expect(requests).toHaveLength(1);
    expect(requests[0].request.headers.get('Authorization')).toBe('Bearer opaque');
    requests[0].flush({ data: user });
    expect(results).toEqual(['authenticated', 'authenticated']);
    auth.ensureAuthenticated().subscribe((result) => results.push(result));
    expect(results).toHaveLength(3);
    expect(http.match('/api/v1/auth/me')).toHaveLength(0);
  });

  it('keeps the token after a restoration connection failure, then retries', () => {
    session.authenticate({ access_token: 'opaque', expires_at: future() }, user);
    session.connectionError('opaque', session.current?.version ?? -1);
    session.startChecking();
    let result = '';
    auth.ensureAuthenticated().subscribe((value) => result = value);
    http.expectOne('/api/v1/auth/me').flush('', { status: 503, statusText: 'Unavailable' });
    expect(result).toBe('connection-error');
    expect(sessionStorage.getItem(key)).toContain('opaque');
    auth.ensureAuthenticated(true).subscribe((value) => result = value);
    http.expectOne('/api/v1/auth/me').flush({ data: user });
    expect(result).toBe('authenticated');
  });

  it('clears revoked restoration without clearing a newer login from an old /me response', () => {
    session.authenticate({ access_token: 'old', expires_at: future() }, user);
    session.connectionError('old', session.current?.version ?? -1);
    session.startChecking();
    auth.ensureAuthenticated().subscribe();
    const stale = http.expectOne('/api/v1/auth/me');
    session.authenticate({ access_token: 'new', expires_at: future() }, user);
    stale.flush('', { status: 401, statusText: 'Unauthorized' });
    expect(session.current?.token).toBe('new');
    session.connectionError('new', session.current?.version ?? -1);
    session.startChecking();
    auth.ensureAuthenticated().subscribe();
    http.expectOne('/api/v1/auth/me').flush('', { status: 401, statusText: 'Unauthorized' });
    expect(session.current).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it.each([204, 401, 503])('clears local session after logout response %i', (status) => {
    session.authenticate({ access_token: 'opaque', expires_at: future() }, user);
    let result = '';
    auth.logout().subscribe((value) => result = value);
    const request = http.expectOne('/api/v1/auth/logout');
    expect(request.request.headers.get('Authorization')).toBe('Bearer opaque');
    if (status === 204) request.flush(null, { status: 204, statusText: 'No Content' });
    else request.flush('', { status, statusText: 'Error' });
    expect(result).toBe(status === 503 ? 'unconfirmed' : 'done');
    expect(session.current).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(session.notice).toBe(status === 503 ? 'logout-unconfirmed' : null);
  });

  it('expires using Rails timestamp and cancels the previous session timer', () => {
    vi.useFakeTimers();
    session.authenticate({ access_token: 'old', expires_at: new Date(Date.now() + 1000).toISOString() }, user);
    session.authenticate({ access_token: 'new', expires_at: new Date(Date.now() + 3000).toISOString() }, user);
    vi.advanceTimersByTime(1000);
    expect(session.current?.token).toBe('new');
    vi.advanceTimersByTime(2000);
    expect(session.current).toBeNull();
    expect(session.notice).toBe('expired');
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('rejects corrupt, empty and expired stored sessions', () => {
    for (const value of ['not-json', '{}', '{"access_token":" ","expires_at":"2027-01-01T00:00:00Z"}',
      '{"access_token":"opaque","expires_at":"2027-02-30T00:00:00Z"}',
      JSON.stringify({ access_token: 'old', expires_at: new Date(Date.now() - 1000).toISOString() })]) {
      sessionStorage.setItem(key, value);
      const restored = TestBed.runInInjectionContext(() => new AuthSessionService());
      expect(restored.current).toBeNull();
      expect(sessionStorage.getItem(key)).toBeNull();
    }
  });

  it('uses memory if writing to sessionStorage fails', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
    try {
      session.authenticate({ access_token: 'memory', expires_at: future() }, user);
      expect(session.current?.token).toBe('memory');
      expect(session.persistenceWarning).toBe(true);
    } finally { write.mockRestore(); }
  });
});

describe('Persisted session restoration', () => {
  it('loads only token and expiry, waits for /me and recovers the user in memory', () => {
    sessionStorage.setItem(key, JSON.stringify({ access_token: 'restored', expires_at: future() }));
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ] });
    const restored = TestBed.inject(AuthSessionService);
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    expect(restored.status).toBe('checking');
    expect(restored.user).toBeNull();
    let result = '';
    auth.ensureAuthenticated().subscribe((value) => result = value);
    const request = http.expectOne('/api/v1/auth/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer restored');
    request.flush({ data: user });
    expect(result).toBe('authenticated');
    expect(restored.user).toEqual(user);
    expect(JSON.parse(sessionStorage.getItem(key) ?? '')).not.toHaveProperty('user');
    http.verify();
    restored.clear();
    sessionStorage.clear();
  });
});
