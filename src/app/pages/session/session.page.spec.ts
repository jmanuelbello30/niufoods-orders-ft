import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { AuthSessionService } from '../../services/auth-session.service';
import { SessionPage } from './session.page';

describe('SessionPage', () => {
  let http: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SessionPage],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.authenticate({ access_token: 'opaque', expires_at: new Date(Date.now() + 60_000).toISOString() },
      { id: 1, email: 'staff@example.test' });
    session.connectionError('opaque', session.current?.version ?? -1);
  });

  afterEach(() => { http.verify(); session.clear(); sessionStorage.clear(); });

  it('offers retry and discards local data when returning to login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SessionPage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Volver a intentar');
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(page.textContent).toContain('Comprobando sesión');
    const request = http.expectOne('/api/v1/auth/me');
    fixture.componentInstance.backToLogin();
    expect(session.current).toBeNull();
    expect(sessionStorage.getItem('niufoods-orders-session')).toBeNull();
    request.flush({ data: { id: 1, email: 'staff@example.test' } });
    expect(session.status).toBe('anonymous');
    expect(navigate).toHaveBeenCalledWith('/login', { replaceUrl: true });
    fixture.destroy();
  });

  it('cancels the session check when the page is destroyed', () => {
    const fixture = TestBed.createComponent(SessionPage);
    session.startChecking();
    fixture.detectChanges();
    const request = http.expectOne('/api/v1/auth/me');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});
