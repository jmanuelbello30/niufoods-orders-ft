import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrdersResponse } from '../models/order.model';
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
});
