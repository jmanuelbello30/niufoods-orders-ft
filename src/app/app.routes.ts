import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/orders/orders.page').then((module) => module.OrdersPage),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((module) => module.LoginPage),
  },
  {
    path: 'session',
    loadComponent: () => import('./pages/session/session.page').then((module) => module.SessionPage),
  },
  { path: '**', redirectTo: '' },
];
