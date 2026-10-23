import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthSessionService } from './services/auth-session.service';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('shows the welcome title before login without changing the logo or router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-header__title')?.textContent).toBe('Bienvenido');
    expect(compiled.querySelector('img')?.getAttribute('src')).toBe('/images/niu-foods-logo.jpg');
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('shows the dashboard title after login and welcomes users again after logout', () => {
    const session = TestBed.inject(AuthSessionService);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const title = (fixture.nativeElement as HTMLElement).querySelector('.site-header__title');
    session.authenticate({ access_token: 'opaque', expires_at: new Date(Date.now() + 60_000).toISOString() },
      { id: 1, email: 'staff@example.test' });
    fixture.detectChanges();
    expect(title?.textContent).toBe('Panel de órdenes');
    session.clear();
    fixture.detectChanges();
    expect(title?.textContent).toBe('Bienvenido');
  });

  it('removes the protected outlet during logout and clears session after a server failure', async () => {
    sessionStorage.clear();
    const session = TestBed.inject(AuthSessionService);
    session.authenticate({ access_token: 'opaque', expires_at: new Date(Date.now() + 60_000).toISOString() },
      { id: 1, email: 'staff@example.test' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('staff@example.test');
    fixture.componentInstance.logout();
    fixture.componentInstance.logout();
    fixture.detectChanges();
    expect(element.querySelector('router-outlet')).toBeNull();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/auth/logout').flush('', { status: 503, statusText: 'Unavailable' });
    await Promise.resolve();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith('/login', { replaceUrl: true });
    expect(element.textContent).not.toContain('staff@example.test');
    expect(sessionStorage.getItem('niufoods-orders-session')).toBeNull();
    http.verify();
    fixture.destroy();
    session.clear();
  });
});
