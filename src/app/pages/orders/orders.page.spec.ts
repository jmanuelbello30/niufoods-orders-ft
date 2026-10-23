import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { Order } from '../../models/order.model';
import { OrdersPage } from './orders.page';

const orders: Order[] = [
  { id: 8, restaurant_id: 1, restaurant: { id: 1, name: 'Niu Foods Providencia', code: 'PROV' }, total_amount: 8990, order_type: 'pickup', created_at: '2026-10-23T00:11:15.025Z', dispatch_status: 'sent' },
  { id: 7, restaurant_id: 1, restaurant: { id: 1, name: 'Niu Foods Providencia', code: 'PROV' }, total_amount: 15000, order_type: 'delivery', created_at: '2026-10-23T00:10:34.847Z', dispatch_status: 'error' },
  { id: 6, restaurant_id: 1, restaurant: { id: 1, name: 'Niu Foods Providencia', code: 'PROV' }, total_amount: 1000, order_type: 'pickup', created_at: '2026-10-23T00:01:56.520Z', dispatch_status: 'pending' },
];

describe('OrdersPage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function loadedPage(): ComponentFixture<OrdersPage> {
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    http.expectOne('/api/v1/orders').flush({ data: orders });
    fixture.detectChanges();
    return fixture;
  }

  it('shows a loading indicator and no misleading zeros during initial load', () => {
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cargando órdenes');
    expect(fixture.nativeElement.querySelector('.stat-card strong').textContent).toBe('—');
    expect(fixture.nativeElement.querySelector('button.refresh-button').disabled).toBe(true);
    http.expectOne('/api/v1/orders').flush({ data: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading).toBe(false);
  });

  it('renders received orders in order with computed counts, labels and Santiago time', () => {
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    http.expectOne('/api/v1/orders').flush({ data: orders });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(Array.from(element.querySelectorAll('.stat-card strong')).map((node) => node.textContent)).toEqual(['3', '1', '1', '1']);
    expect(Array.from(element.querySelectorAll('tbody th')).map((node) => node.textContent)).toEqual(['#8', '#7', '#6']);
    expect(element.textContent).toContain('Retiro');
    expect(element.textContent).toContain('Delivery');
    expect(element.textContent).toContain('Enviada a tienda');
    expect(element.textContent).toContain('Error de envío');
    expect(element.textContent).toContain('Pendiente');
    expect(element.textContent).toContain(fixture.componentInstance.formatAmount(8990));
    expect(fixture.componentInstance.formatAmount(8990)).toMatch(/8[.,]990/);
    expect(element.querySelectorAll('tr.orders-table__error')).toHaveLength(1);
    expect(element.querySelector('tbody tr')?.textContent).toContain(fixture.componentInstance.formatDate(orders[0].created_at));
    expect(fixture.componentInstance.formatDate('2026-01-15T12:00:00Z')).toContain('09:00');
    expect(fixture.componentInstance.formatDate('2026-07-15T12:00:00Z')).toContain('08:00');
    expect(element.textContent).toContain('Última actualización:');
  });

  it('shows zero counts and an empty message when no orders are returned', () => {
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    http.expectOne('/api/v1/orders').flush({ data: [] });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(Array.from(element.querySelectorAll('.stat-card strong')).map((node) => node.textContent)).toEqual(['0', '0', '0', '0']);
    expect(element.textContent).toContain('No hay órdenes registradas');
    expect(fixture.componentInstance.lastUpdated).not.toBeNull();
  });

  it('allows retry after an initial error', () => {
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    http.expectOne('/api/v1/orders').flush('Error', { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No se pudieron cargar');
    expect(element.querySelector('.stat-card strong')?.textContent).toBe('—');
    expect(fixture.componentInstance.lastUpdated).toBeNull();
    expect(fixture.componentInstance.isLoading).toBe(false);
    (element.querySelector('.alert button') as HTMLButtonElement).click();
    http.expectOne('/api/v1/orders').flush({ data: orders });
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('keeps previous data and time if a refresh fails and prevents overlapping requests', () => {
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    http.expectOne('/api/v1/orders').flush({ data: orders });
    fixture.detectChanges();
    const previousTime = fixture.componentInstance.lastUpdated;
    const button = fixture.nativeElement.querySelector('.refresh-button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    fixture.componentInstance.refresh();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Actualizando…');
    const requests = http.match('/api/v1/orders');
    expect(requests).toHaveLength(1);
    requests[0].flush('Error', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(element.querySelector('.stat-card strong')?.textContent).toBe('3');
    expect(element.textContent).toContain('No se pudieron actualizar');
    expect(fixture.componentInstance.lastUpdated).toBe(previousTime);
    expect(fixture.componentInstance.isLoading).toBe(false);
    expect(button.disabled).toBe(false);
    button.click();
    http.expectOne('/api/v1/orders').flush({ data: [] });
    fixture.detectChanges();
    expect(element.textContent).not.toContain('No se pudieron actualizar');
    expect(element.textContent).toContain('No hay órdenes registradas');
  });

  it('renders retry actions only for pending and error orders', () => {
    const fixture = loadedPage();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('thead th')).toHaveLength(7);
    expect(element.querySelectorAll('tbody .retry-button')).toHaveLength(2);
    expect(element.querySelector('tbody tr:first-child td:last-child')?.textContent).toContain('—');
    expect(element.querySelector('tbody tr:nth-child(2) .retry-button')?.getAttribute('aria-label')).toContain('#7');
  });

  it('applies a sent retry result without losing restaurant or changing the list timestamp', () => {
    const fixture = loadedPage();
    const previousTime = fixture.componentInstance.lastUpdated;
    fixture.componentInstance.retryDispatch(7);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reintentando…');
    expect((fixture.nativeElement.querySelector('.refresh-button') as HTMLButtonElement).disabled).toBe(true);
    expect(Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.retry-button')).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    fixture.componentInstance.retryDispatch(6);
    fixture.componentInstance.refresh();
    expect(http.match('/api/v1/orders')).toHaveLength(0);
    const requests = http.match('/api/v1/orders/7/retry_dispatch');
    expect(requests).toHaveLength(1);
    requests[0].flush({ data: { id: 7, dispatch_status: 'sent', dispatched_at: '2026-10-23T00:15:00Z' } });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody tr:nth-child(2)')?.textContent).toContain('Niu Foods Providencia');
    expect(element.querySelector('tbody tr:nth-child(2)')?.textContent).toContain('Enviada a tienda');
    expect(element.querySelector('tbody tr:nth-child(2) .retry-button')).toBeNull();
    expect(Array.from(element.querySelectorAll('.stat-card strong')).map((node) => node.textContent)).toEqual(['3', '1', '2', '0']);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('La orden #7 fue enviada a tienda');
    expect(element.querySelector('tbody tr:nth-child(2) td:last-child span')?.getAttribute('aria-describedby')).toBe('retry-feedback-7');
    expect(fixture.componentInstance.lastUpdated).toBe(previousTime);
    expect(fixture.componentInstance.retryingOrderId).toBeNull();
    expect((element.querySelector('.refresh-button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('uses the actual error status from HTTP 200 and permits retrying again', () => {
    const fixture = loadedPage();
    const previousTime = fixture.componentInstance.lastUpdated;
    fixture.componentInstance.retryDispatch(6);
    http.expectOne('/api/v1/orders/6/retry_dispatch').flush({ data: { id: 6, dispatch_status: 'error', last_dispatch_error: 'Failed' } });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(Array.from(element.querySelectorAll('.stat-card strong')).map((node) => node.textContent)).toEqual(['3', '0', '1', '2']);
    expect(element.querySelector('tbody tr:nth-child(3)')?.textContent).toContain('Niu Foods Providencia');
    expect(element.querySelector('tbody tr:nth-child(3)')?.textContent).toContain('Error de envío');
    expect(element.textContent).toContain('No se pudo enviar la orden #6. Puedes volver a intentarlo');
    expect(fixture.componentInstance.lastUpdated).toBe(previousTime);
    fixture.componentInstance.retryDispatch(6);
    http.expectOne('/api/v1/orders/6/retry_dispatch').flush({ data: { id: 6, dispatch_status: 'sent' } });
  });

  it('synchronizes after 409 and holds all actions until the list responds', () => {
    const fixture = loadedPage();
    fixture.componentInstance.retryDispatch(7);
    http.expectOne('/api/v1/orders/7/retry_dispatch').flush('', { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.refresh-button') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance.refresh();
    fixture.componentInstance.retryDispatch(6);
    const requests = http.match('/api/v1/orders');
    expect(requests).toHaveLength(1);
    requests[0].flush({ data: [orders[0], { ...orders[1], dispatch_status: 'sent' }, orders[2]] });
    fixture.detectChanges();
    expect(fixture.componentInstance.retryingOrderId).toBeNull();
    expect(fixture.componentInstance.blockedOrderIds.size).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('La orden #7 ya fue enviada');
    expect(Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.stat-card strong')).map((node) => node.textContent)).toEqual(['3', '1', '2', '0']);
    expect((fixture.nativeElement.querySelector('.refresh-button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('keeps the row blocked when synchronization after 409 fails until a successful refresh', () => {
    const fixture = loadedPage();
    fixture.componentInstance.retryDispatch(7);
    http.expectOne('/api/v1/orders/7/retry_dispatch').flush('', { status: 409, statusText: 'Conflict' });
    http.expectOne('/api/v1/orders').flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('La orden #7 ya fue enviada');
    expect(element.querySelector('tbody tr:nth-child(2)')?.textContent).toContain('Error de envío');
    expect((element.querySelector('tbody tr:nth-child(2) .retry-button') as HTMLButtonElement).disabled).toBe(true);
    expect((element.querySelector('.refresh-button') as HTMLButtonElement).disabled).toBe(false);
    fixture.componentInstance.retryDispatch(7);
    expect(http.match('/api/v1/orders/7/retry_dispatch')).toHaveLength(0);
    fixture.componentInstance.refresh();
    http.expectOne('/api/v1/orders').flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.blockedOrderIds.has(7)).toBe(true);
    fixture.componentInstance.refresh();
    http.expectOne('/api/v1/orders').flush({ data: [orders[0], { ...orders[1], dispatch_status: 'sent' }, orders[2]] });
    fixture.detectChanges();
    expect(fixture.componentInstance.blockedOrderIds.size).toBe(0);
    expect(element.querySelector('tbody tr:nth-child(2)')?.textContent).toContain('Enviada a tienda');
  });

  it('keeps orders unchanged on a network error and blocks only the uncertain order until refresh', () => {
    const fixture = loadedPage();
    const previousTime = fixture.componentInstance.lastUpdated;
    fixture.componentInstance.retryDispatch(7);
    http.expectOne('/api/v1/orders/7/retry_dispatch').error(new ProgressEvent('error'));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No se pudo confirmar el resultado de la orden #7');
    expect(element.querySelector('tbody tr:nth-child(2) .retry-button')?.getAttribute('aria-describedby')).toBe('retry-feedback-7');
    expect(Array.from(element.querySelectorAll('.stat-card strong')).map((node) => node.textContent)).toEqual(['3', '1', '1', '1']);
    expect(element.querySelector('tbody tr:nth-child(2)')?.textContent).toContain('Error de envío');
    expect((element.querySelector('tbody tr:nth-child(2) .retry-button') as HTMLButtonElement).disabled).toBe(true);
    expect((element.querySelector('tbody tr:nth-child(3) .retry-button') as HTMLButtonElement).disabled).toBe(false);
    expect((element.querySelector('.refresh-button') as HTMLButtonElement).disabled).toBe(false);
    expect(fixture.componentInstance.lastUpdated).toBe(previousTime);
    fixture.componentInstance.retryDispatch(7);
    expect(http.match('/api/v1/orders/7/retry_dispatch')).toHaveLength(0);
    fixture.componentInstance.refresh();
    http.expectOne('/api/v1/orders').flush({ data: orders });
    fixture.detectChanges();
    expect(fixture.componentInstance.blockedOrderIds.size).toBe(0);
    fixture.componentInstance.retryDispatch(7);
    http.expectOne('/api/v1/orders/7/retry_dispatch').flush({ data: { id: 7, dispatch_status: 'sent' } });
  });

  it('treats other HTTP errors as uncertain without changing the order', () => {
    const fixture = loadedPage();
    fixture.componentInstance.retryDispatch(6);
    http.expectOne('/api/v1/orders/6/retry_dispatch').flush('Unavailable', { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.orders?.[2].dispatch_status).toBe('pending');
    expect(fixture.componentInstance.blockedOrderIds.has(6)).toBe(true);
    expect(fixture.componentInstance.retryingOrderId).toBeNull();
    expect((fixture.nativeElement.querySelector('.refresh-button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('cancels an outstanding retry when the page is destroyed', () => {
    const fixture = loadedPage();
    fixture.componentInstance.retryDispatch(7);
    const request = http.expectOne('/api/v1/orders/7/retry_dispatch');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
    expect(fixture.componentInstance.retryingOrderId).toBeNull();
  });

  it('prevents retrying during list loading and ignores sent or unknown orders', () => {
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    fixture.componentInstance.retryDispatch(7);
    http.expectOne('/api/v1/orders').flush({ data: orders });
    fixture.componentInstance.retryDispatch(8);
    fixture.componentInstance.retryDispatch(999);
    expect(http.match('/api/v1/orders/8/retry_dispatch')).toHaveLength(0);
    expect(http.match('/api/v1/orders/999/retry_dispatch')).toHaveLength(0);
  });
});
