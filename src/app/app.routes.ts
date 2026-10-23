import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./orders/orders.page').then((module) => module.OrdersPage),
  },
];
