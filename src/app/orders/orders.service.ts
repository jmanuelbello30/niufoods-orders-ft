import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OrdersResponse } from './order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  getOrders(): Observable<OrdersResponse> {
    return this.http.get<OrdersResponse>('/api/v1/orders');
  }
}
