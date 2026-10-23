import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { AuthSessionService } from '../../services/auth-session.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let http: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
  });

  afterEach(() => { http.verify(); session.clear(); sessionStorage.clear(); });

  it('validates visible fields and prevents overlapping requests', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ingresa un correo electrónico válido');
    expect(http.match('/api/v1/auth/login')).toHaveLength(0);
    page.form.setValue({ email: 'staff@example.test', password: ' a password ' });
    page.submit();
    page.submit();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button[type=submit]')?.hasAttribute('disabled')).toBe(true);
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.body.password).toBe(' a password ');
    request.flush('', { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(page.form.controls.email.value).toBe('staff@example.test');
    expect(page.form.controls.password.value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Correo o contraseña incorrectos');
  });

  it.each([429, 0])('shows an accessible error for %i', (status) => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.form.setValue({ email: 'staff@example.test', password: 'password' });
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/login').flush('', { status, statusText: 'Error' });
    fixture.detectChanges();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role=alert]');
    expect(alert?.textContent).toContain(status === 429 ? 'Demasiados intentos' : 'No pudimos conectarnos');
  });

  it('navigates with replaceUrl after successful login', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.form.setValue({ email: 'staff@example.test', password: 'password' });
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/login').flush({ data: {
      access_token: 'opaque', expires_at: new Date(Date.now() + 60_000).toISOString(), token_type: 'Bearer',
      user: { id: 1, email: 'staff@example.test' },
    } });
    expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
    expect(session.status).toBe('authenticated');
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
  });
});
