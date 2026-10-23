import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
});
