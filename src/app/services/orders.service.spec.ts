import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrderDetailResponse, OrdersResponse, RetryDispatchResponse } from '../models/order.model';
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

  it('requests a single order detail by GET and returns its items', () => {
    const response: OrderDetailResponse = {
      data: {
        id: 6, restaurant_id: 3, restaurant: { id: 3, name: 'Niu Foods Ñuñoa', code: 'NUNO' },
        total_amount: 50690, order_type: 'delivery', created_at: '2026-10-23T00:01:56.520Z',
        dispatch_status: 'sent', customer: { name: 'Simulation Customer 6', phone: '+56000000000' },
        delivery_address: 'Fictional Street 6', dispatched_at: '2026-10-23T00:01:56.549Z',
        items: [{ id: 14, product_id: 10, product_name: 'Agua Mineral 500 ml', sku: 'SKU-010', quantity: 3, unit_price: 1590, subtotal: 4770 }],
      },
    };
    let result: OrderDetailResponse | undefined;
    service.getOrder(6).subscribe((value) => result = value);
    const request = http.expectOne('/api/v1/orders/6');
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(result).toEqual(response);
  });

  it('propagates a detail 404', () => {
    let status: number | undefined;
    service.getOrder(999).subscribe({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) status = error.status;
      },
    });
    http.expectOne('/api/v1/orders/999').flush('', { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
  });
});
