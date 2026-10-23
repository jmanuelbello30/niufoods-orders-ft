import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthSessionService } from '../services/auth-session.service';
import { authGuard, guestGuard } from './auth.guards';

@Component({ template: '' })
class EmptyPage {}

describe('auth guards', () => {
  let router: Router;
  let session: AuthSessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideRouter([
        { path: '', component: EmptyPage, canActivate: [authGuard] },
        { path: 'login', component: EmptyPage, canActivate: [guestGuard] },
        { path: 'session', component: EmptyPage },
      ]),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ] });
    router = TestBed.inject(Router);
    session = TestBed.inject(AuthSessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); session.clear(); sessionStorage.clear(); });

  it('redirects anonymous dashboard access to login without requesting orders', async () => {
    await router.navigateByUrl('/');
    expect(router.url).toBe('/login');
    expect(http.match('/api/v1/orders')).toHaveLength(0);
  });

  it('waits for /me before allowing dashboard and redirects authenticated guests', async () => {
    session.authenticate({ access_token: 'opaque', expires_at: new Date(Date.now() + 60_000).toISOString() },
      { id: 1, email: 'staff@example.test' });
    session.connectionError('opaque', session.current?.version ?? -1);
    session.startChecking();
    const navigation = router.navigateByUrl('/');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(session.status).toBe('checking');
    http.expectOne('/api/v1/auth/me').flush({ data: { id: 1, email: 'staff@example.test' } });
    await navigation;
    expect(router.url).toBe('/');
    await router.navigateByUrl('/login');
    expect(router.url).toBe('/');
    expect(http.match('/api/v1/auth/me')).toHaveLength(0);
  });

  it('routes connection failures to retry screen without deleting the session', async () => {
    session.authenticate({ access_token: 'opaque', expires_at: new Date(Date.now() + 60_000).toISOString() },
      { id: 1, email: 'staff@example.test' });
    session.connectionError('opaque', session.current?.version ?? -1);
    session.startChecking();
    const navigation = router.navigateByUrl('/');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    http.expectOne('/api/v1/auth/me').flush('', { status: 503, statusText: 'Unavailable' });
    await navigation;
    expect(router.url).toBe('/session');
    expect(session.current?.token).toBe('opaque');
  });

  it('rejects expired sessions before any /me request', async () => {
    session.authenticate({ access_token: 'expired', expires_at: new Date(Date.now() - 1000).toISOString() },
      { id: 1, email: 'staff@example.test' });
    await router.navigateByUrl('/');
    expect(router.url).toBe('/login');
    expect(http.match('/api/v1/auth/me')).toHaveLength(0);
  });
});
