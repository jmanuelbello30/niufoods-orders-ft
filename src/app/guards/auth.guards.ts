import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureAuthenticated().pipe(map((result) => result === 'authenticated'
    ? true : router.parseUrl(result === 'connection-error' ? '/session' : '/login')));
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureAuthenticated().pipe(map((result) => result === 'anonymous'
    ? true : router.parseUrl(result === 'connection-error' ? '/session' : '/')));
};
