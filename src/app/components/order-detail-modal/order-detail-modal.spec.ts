import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderDetailResponse } from '../../models/order.model';
import { OrderDetailModal } from './order-detail-modal';

const detail: OrderDetailResponse = {
  data: {
    id: 6, restaurant_id: 3, restaurant: { id: 3, name: 'Niu Foods Ñuñoa', code: 'NUNO' },
    total_amount: 50690, client_total_amount: 50690, order_type: 'delivery',
    created_at: '2026-10-23T00:01:56.520Z', dispatch_status: 'sent',
    customer: { name: 'Simulation Customer 6', phone: '+56000000000' },
    delivery_address: 'Fictional Street 6', dispatched_at: '2026-10-23T00:01:56.549Z',
    last_dispatch_error: null,
    items: [
      { id: 14, product_id: 10, product_name: 'Agua Mineral 500 ml', sku: 'SKU-010', quantity: 3, unit_price: 1590, subtotal: 4770 },
      { id: 15, product_id: 3, product_name: 'Avocado Roll', sku: 'SKU-003', quantity: 4, unit_price: 6990, subtotal: 27960 },
      { id: 16, product_id: 5, product_name: 'Gyozas de Pollo x5', sku: 'SKU-005', quantity: 4, unit_price: 4490, subtotal: 17960 },
    ],
  },
};

describe('OrderDetailModal', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<OrderDetailModal> | undefined;
  let originalOverflow: string;
  let showDescriptor: PropertyDescriptor | undefined;
  let closeDescriptor: PropertyDescriptor | undefined;

  beforeEach(async () => {
    originalOverflow = document.body.style.overflow;
    showDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true, value: function (this: HTMLDialogElement): void { this.setAttribute('open', ''); },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true, value: function (this: HTMLDialogElement): void {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
    await TestBed.configureTestingModule({
      imports: [OrderDetailModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
    document.body.style.overflow = originalOverflow;
    if (showDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showDescriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (closeDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  function open(id: number | null): ComponentFixture<OrderDetailModal> {
    fixture = TestBed.createComponent(OrderDetailModal);
    fixture.componentRef.setInput('orderId', id);
    fixture.detectChanges();
    return fixture;
  }

  it('opens as a modal, focuses close, locks scroll and shows a loading state', () => {
    document.body.style.overflow = 'auto';
    const opened = open(6);
    const element = opened.nativeElement as HTMLElement;
    const dialog = element.querySelector('dialog');
    expect(dialog?.open).toBe(true);
    expect(dialog?.getAttribute('aria-labelledby')).toBe('order-detail-title');
    expect(element.querySelector('#order-detail-title')?.textContent).toContain('Orden #6');
    expect(document.activeElement).toBe(element.querySelector('.btn-close'));
    expect(document.body.style.overflow).toBe('hidden');
    expect(element.textContent).toContain('Cargando detalle');
    http.expectOne('/api/v1/orders/6').flush(detail);
    opened.detectChanges();
    expect(element.textContent).not.toContain('Cargando detalle');
    opened.destroy();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('renders the verified detail contract without recalculating the persisted total', () => {
    const opened = open(6);
    http.expectOne('/api/v1/orders/6').flush(detail);
    opened.detectChanges();
    const element = opened.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Niu Foods Ñuñoa');
    expect(element.textContent).toContain('Delivery');
    expect(element.textContent).toContain('Simulation Customer 6');
    expect(element.textContent).toContain('+56000000000');
    expect(element.textContent).toContain('Fictional Street 6');
    expect(element.textContent).toContain('Enviada a tienda');
    expect(element.textContent).toContain('Avocado Roll');
    expect(element.textContent).toContain('Agua Mineral 500 ml');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(element.querySelector('tbody tr')?.textContent).toContain(opened.componentInstance.formatAmount(1590));
    expect(element.querySelector('.order-total')?.textContent).toContain(opened.componentInstance.formatAmount(50690));
    expect(element.textContent).toContain(opened.componentInstance.formatDate(detail.data.created_at));
    expect(element.textContent).not.toContain('Despacho a tienda');
    expect(element.textContent).not.toContain('Fecha de despacho');
    expect(element.textContent).not.toContain('Horario de Santiago');
    expect(element.querySelector('.order-total')?.closest('section')?.nextElementSibling).toBeNull();
  });

  it('shows clear fallbacks without rendering operational details after the total', () => {
    const opened = open(8);
    const response: OrderDetailResponse = { data: {
      id: 8, restaurant_id: 1, restaurant: { id: 1, name: 'Niu Foods Providencia', code: 'PROV' },
      total_amount: 8990, order_type: 'pickup', created_at: '2026-10-23T00:11:15.025Z',
      dispatch_status: 'error', last_dispatch_error: '<script>alert("x")</script>', items: [],
    } };
    http.expectOne('/api/v1/orders/8').flush(response);
    opened.detectChanges();
    const element = opened.nativeElement as HTMLElement;
    expect(element.textContent).toContain('No disponible');
    expect(element.textContent).not.toContain('Dirección de entrega');
    expect(element.textContent).toContain('No hay productos registrados');
    expect(element.textContent).not.toContain('<script>alert("x")</script>');
    expect(element.textContent).not.toContain('Último error de despacho');
  });

  it('does not fetch an invalid ID and shows an error', () => {
    const opened = open(0);
    expect(opened.nativeElement.textContent).toContain('Identificador de orden inválido');
    expect(opened.nativeElement.querySelector('dialog').open).toBe(true);
    expect(http.match(() => true)).toHaveLength(0);
  });

  it('shows a not-found message for HTTP 404', () => {
    const opened = open(999);
    http.expectOne('/api/v1/orders/999').flush('', { status: 404, statusText: 'Not Found' });
    opened.detectChanges();
    expect(opened.nativeElement.textContent).toContain('No encontramos esta orden');
    expect(opened.nativeElement.textContent).not.toContain('Volver a intentar');
  });

  it('offers a retry after a connection error without duplicate requests', () => {
    const opened = open(6);
    http.expectOne('/api/v1/orders/6').error(new ProgressEvent('error'));
    opened.detectChanges();
    const element = opened.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Comprueba tu conexión');
    (element.querySelector('.alert button') as HTMLButtonElement).click();
    opened.detectChanges();
    expect(element.textContent).toContain('Cargando detalle');
    const requests = http.match('/api/v1/orders/6');
    expect(requests).toHaveLength(1);
    requests[0].flush(detail);
    opened.detectChanges();
    expect(element.textContent).toContain('Simulation Customer 6');
  });

  it('cancels loading when closed and restores scroll via the close event', () => {
    document.body.style.overflow = 'auto';
    const opened = open(6);
    const request = http.expectOne('/api/v1/orders/6');
    let closed = 0;
    opened.componentInstance.closed.subscribe(() => closed++);
    (opened.nativeElement.querySelector('.order-dialog__footer button') as HTMLButtonElement).click();
    expect(request.cancelled).toBe(true);
    expect(closed).toBe(1);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('closes on native Escape cancellation without closing on backdrop clicks', () => {
    const opened = open(6);
    const dialog = (opened.nativeElement as HTMLElement).querySelector('dialog');
    const request = http.expectOne('/api/v1/orders/6');
    let closed = 0;
    opened.componentInstance.closed.subscribe(() => closed++);
    dialog?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dialog?.open).toBe(true);
    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog?.close(); // Simulate the browser's default action for Escape in jsdom.
    expect(closed).toBe(1);
    expect(request.cancelled).toBe(true);
  });

  it('clears old data and cancels the previous request when selection changes', () => {
    const opened = open(6);
    const first = http.expectOne('/api/v1/orders/6');
    opened.componentInstance.loadDetail();
    expect(first.cancelled).toBe(false);
    expect(http.match('/api/v1/orders/6')).toHaveLength(0);
    opened.componentRef.setInput('orderId', 8);
    opened.detectChanges();
    expect(first.cancelled).toBe(true);
    expect(opened.componentInstance.detail).toBeNull();
    expect(opened.nativeElement.textContent).toContain('Orden #8');
    expect(opened.nativeElement.textContent).toContain('Cargando detalle');
    http.expectOne('/api/v1/orders/8').flush({ data: { ...detail.data, id: 8, restaurant: { id: 1, name: 'Niu Foods Providencia', code: 'PROV' }, items: [] } });
    opened.detectChanges();
    expect(opened.nativeElement.textContent).toContain('Niu Foods Providencia');
    expect(opened.nativeElement.textContent).not.toContain('Niu Foods Ñuñoa');
  });
});
