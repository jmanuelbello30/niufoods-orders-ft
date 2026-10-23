import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OrderDetailResponse, OrdersResponse, RetryDispatchResponse } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  getOrders(): Observable<OrdersResponse> {
    return this.http.get<OrdersResponse>('/api/v1/orders');
  }

  getOrder(id: number): Observable<OrderDetailResponse> {
    return this.http.get<OrderDetailResponse>(`/api/v1/orders/${id}`);
  }

  retryDispatch(id: number): Observable<RetryDispatchResponse> {
    return this.http.post<RetryDispatchResponse>(`/api/v1/orders/${id}/retry_dispatch`, {});
  }
}
