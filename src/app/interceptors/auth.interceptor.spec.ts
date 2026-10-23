import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let session: AuthSessionService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    session = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    session.authenticate({ access_token: 'opaque', expires_at: new Date(Date.now() + 60_000).toISOString() },
      { id: 1, email: 'staff@example.test' });
  });

  afterEach(() => { http.verify(); session.clear(); sessionStorage.clear(); });

  it('adds Bearer only for own API, never for login or other origins', () => {
    for (const url of ['/api/v1/orders', '/api/v1/auth/me', '/api/v1/auth/logout',
      '/api/v1/auth/login', 'https://external.test/api/v1/orders', '//external.test/api/v1/orders',
      '/images/niu-foods-logo.jpg', '/api/v1-evil/orders']) {
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe(
        ['/api/v1/orders', '/api/v1/auth/me', '/api/v1/auth/logout'].includes(url) ? 'Bearer opaque' : null,
      );
      request.flush({});
    }
  });

  it('redirects once for concurrent authenticated 401s and propagates both errors', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    let errors = 0;
    client.get('/api/v1/orders').subscribe({ error: () => errors++ });
    client.get('/api/v1/orders/7').subscribe({ error: () => errors++ });
    const requests = http.match((request) => request.url.startsWith('/api/v1/orders'));
    expect(requests).toHaveLength(2);
    requests[0].flush('', { status: 401, statusText: 'Unauthorized' });
    requests[1].flush('', { status: 401, statusText: 'Unauthorized' });
    expect(errors).toBe(2);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(session.current).toBeNull();
  });

  it('ignores a late 401 for an old session and non-401 failures', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    client.get('/api/v1/orders').subscribe({ error: () => undefined });
    const stale = http.expectOne('/api/v1/orders');
    session.authenticate({ access_token: 'new', expires_at: new Date(Date.now() + 60_000).toISOString() },
      { id: 2, email: 'other@example.test' });
    stale.flush('', { status: 401, statusText: 'Unauthorized' });
    client.get('/api/v1/orders').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/orders').flush('', { status: 503, statusText: 'Unavailable' });
    expect(session.current?.token).toBe('new');
    expect(navigate).not.toHaveBeenCalled();
  });
});
