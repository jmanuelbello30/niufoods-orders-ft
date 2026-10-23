import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrdersResponse, RetryDispatchResponse } from '../models/order.model';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrdersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the relative orders URL and returns the response', () => {
    const response: OrdersResponse = { data: [] };
    let result: OrdersResponse | undefined;
    service.getOrders().subscribe((value) => result = value);
    const request = http.expectOne('/api/v1/orders');
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(result).toEqual(response);
  });

  it('propagates HTTP errors', () => {
    let status: number | undefined;
    service.getOrders().subscribe({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) status = error.status;
      },
    });
    http.expectOne('/api/v1/orders').flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });
    expect(status).toBe(503);
  });

  it('posts an empty body and returns the retry response without requiring a restaurant', () => {
    const response: RetryDispatchResponse = { data: { id: 7, dispatch_status: 'sent', dispatched_at: '2026-10-23T00:11:15Z' } };
    let result: RetryDispatchResponse | undefined;
    service.retryDispatch(7).subscribe((value) => result = value);
    const request = http.expectOne('/api/v1/orders/7/retry_dispatch');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(response);
    expect(result).toEqual(response);
  });
});
