import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    expect(Array.from(element.querySelectorAll('tbody th')).map((node) => node.textContent?.trim())).toEqual(['#8', '#7', '#6']);
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
    expect(element.textContent).not.toContain('Listado de órdenes actualizado');
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
    expect(element.textContent).toContain('Listado de órdenes actualizado');
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

  it('fades out the failed dispatch notice after five seconds, without changing the order state', () => {
    vi.useFakeTimers();
    let fixture: ComponentFixture<OrdersPage> | undefined;
    try {
      fixture = loadedPage();
      const element = fixture.nativeElement as HTMLElement;
      fixture.componentInstance.retryDispatch(6);
      http.expectOne('/api/v1/orders/6/retry_dispatch').flush({ data: { id: 6, dispatch_status: 'error' } });
      fixture.detectChanges();
      expect(element.querySelector('#retry-feedback-6')?.textContent).toContain('No se pudo enviar la orden #6');
      expect(element.querySelector('#retry-feedback-6 .btn-close')?.getAttribute('aria-label')).toContain('#6');
      vi.advanceTimersByTime(4999);
      fixture.detectChanges();
      expect(element.querySelector('#retry-feedback-6')).not.toBeNull();
      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(element.querySelector('#retry-feedback-6')?.classList.contains('notification--leaving')).toBe(true);
      vi.advanceTimersByTime(249);
      expect(element.querySelector('#retry-feedback-6')).not.toBeNull();
      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(element.querySelector('#retry-feedback-6')).toBeNull();
      expect(element.querySelector('tbody tr:nth-child(3)')?.textContent).toContain('Error de envío');
    } finally {
      fixture?.destroy();
      vi.useRealTimers();
    }
  });

  it('allows manually dismissing the failed dispatch notice with a fade', () => {
    vi.useFakeTimers();
    let fixture: ComponentFixture<OrdersPage> | undefined;
    try {
      fixture = loadedPage();
      const element = fixture.nativeElement as HTMLElement;
      fixture.componentInstance.retryDispatch(7);
      http.expectOne('/api/v1/orders/7/retry_dispatch').flush({ data: { id: 7, dispatch_status: 'error' } });
      fixture.detectChanges();
      const close = element.querySelector('#retry-feedback-7 .btn-close');
      if (!(close instanceof HTMLButtonElement)) throw new Error('Missing notification close button');
      close.click();
      fixture.detectChanges();
      expect(element.querySelector('#retry-feedback-7')?.classList.contains('notification--leaving')).toBe(true);
      vi.advanceTimersByTime(250);
      fixture.detectChanges();
      expect(element.querySelector('#retry-feedback-7')).toBeNull();
      vi.advanceTimersByTime(5000);
      expect(element.querySelector('#retry-feedback-7')).toBeNull();
    } finally {
      fixture?.destroy();
      vi.useRealTimers();
    }
  });

  it('shows a green notice only after a successful manual refresh, then fades it out', () => {
    vi.useFakeTimers();
    let fixture: ComponentFixture<OrdersPage> | undefined;
    try {
      fixture = loadedPage();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).not.toContain('Listado de órdenes actualizado');
      const refreshButton = element.querySelector('.refresh-button');
      if (!(refreshButton instanceof HTMLButtonElement)) throw new Error('Missing refresh button');
      refreshButton.click();
      fixture.detectChanges();
      expect(element.textContent).not.toContain('Listado de órdenes actualizado');
      http.expectOne('/api/v1/orders').flush({ data: orders });
      fixture.detectChanges();
      const notice = element.querySelector('.alert-success.notification');
      expect(notice?.textContent).toContain('Listado de órdenes actualizado');
      expect(notice?.getAttribute('role')).toBe('status');
      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(notice?.classList.contains('notification--leaving')).toBe(true);
      vi.advanceTimersByTime(250);
      fixture.detectChanges();
      expect(element.textContent).not.toContain('Listado de órdenes actualizado');
    } finally {
      fixture?.destroy();
      vi.useRealTimers();
    }
  });

  it('allows closing the green notice manually without affecting the list', () => {
    vi.useFakeTimers();
    let fixture: ComponentFixture<OrdersPage> | undefined;
    try {
      fixture = loadedPage();
      const element = fixture.nativeElement as HTMLElement;
      const originalOrders = fixture.componentInstance.orders;
      const refreshButton = element.querySelector('.refresh-button');
      if (!(refreshButton instanceof HTMLButtonElement)) throw new Error('Missing refresh button');
      refreshButton.click();
      http.expectOne('/api/v1/orders').flush({ data: orders });
      fixture.detectChanges();
      const close = element.querySelector('.alert-success.notification .btn-close');
      if (!(close instanceof HTMLButtonElement)) throw new Error('Missing notification close button');
      close.click();
      fixture.detectChanges();
      expect(element.querySelector('.alert-success.notification')?.classList.contains('notification--leaving')).toBe(true);
      vi.advanceTimersByTime(250);
      fixture.detectChanges();
      expect(element.querySelector('.alert-success.notification')).toBeNull();
      expect(fixture.componentInstance.orders).toBe(originalOrders);
    } finally {
      fixture?.destroy();
      vi.useRealTimers();
    }
  });

  it('does not announce an update after a failed manual refresh or an automatic 409 sync', () => {
    const fixture = loadedPage();
    const element = fixture.nativeElement as HTMLElement;
    const refreshButton = element.querySelector('.refresh-button');
    if (!(refreshButton instanceof HTMLButtonElement)) throw new Error('Missing refresh button');
    refreshButton.click();
    http.expectOne('/api/v1/orders').flush('', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Listado de órdenes actualizado');
    fixture.componentInstance.retryDispatch(7);
    http.expectOne('/api/v1/orders/7/retry_dispatch').flush('', { status: 409, statusText: 'Conflict' });
    http.expectOne('/api/v1/orders').flush({ data: orders });
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Listado de órdenes actualizado');
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

  it('opens the selected order from its ID, restores focus and preserves the list on reopening', () => {
    const showDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
    const previousOverflow = document.body.style.overflow;
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true, value: function (this: HTMLDialogElement): void { this.setAttribute('open', ''); },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true, value: function (this: HTMLDialogElement): void {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });

    let fixture: ComponentFixture<OrdersPage> | undefined;
    try {
      fixture = loadedPage();
      const element = fixture.nativeElement as HTMLElement;
      const previousOrders = fixture.componentInstance.orders;
      const previousCounts = fixture.componentInstance.counts;
      const previousTime = fixture.componentInstance.lastUpdated;
      const tableWrapper = element.querySelector('.table-responsive');
      if (!(tableWrapper instanceof HTMLElement)) throw new Error('Missing table wrapper');
      tableWrapper.scrollTop = 42;
      const first = element.querySelector('tbody tr:nth-child(2) .order-detail-button');
      if (!(first instanceof HTMLButtonElement)) throw new Error('Missing first order button');
      expect(first.getAttribute('aria-label')).toBe('Ver detalle de la orden #7');
      expect(first.querySelector('svg')).not.toBeNull();
      expect(first.textContent?.trim()).toBe('');
      const orderNumber = first.closest('th');
      expect(orderNumber?.textContent?.trim()).toBe('#7');
      orderNumber?.click();
      fixture.detectChanges();
      expect(element.querySelector('dialog')).toBeNull();
      first.focus();
      first.click();
      fixture.detectChanges();
      expect(element.querySelector('#order-detail-title')?.textContent).toContain('Orden #7');
      const firstRequest = http.expectOne('/api/v1/orders/7');
      expect(document.body.style.overflow).toBe('hidden');
      const close = element.querySelector('dialog .order-dialog__footer button');
      if (!(close instanceof HTMLButtonElement)) throw new Error('Missing close button');
      close.click();
      fixture.detectChanges();
      expect(firstRequest.cancelled).toBe(true);
      expect(document.activeElement).toBe(first);
      expect(document.body.style.overflow).toBe(previousOverflow);
      expect(tableWrapper.scrollTop).toBe(42);

      const second = element.querySelector('tbody tr:first-child .order-detail-button');
      if (!(second instanceof HTMLButtonElement)) throw new Error('Missing second order button');
      second.click();
      fixture.detectChanges();
      expect(element.querySelector('#order-detail-title')?.textContent).toContain('Orden #8');
      expect(element.textContent).not.toContain('Cargando detalle de la orden #7');
      http.expectOne('/api/v1/orders/8').flush({ data: {
        ...orders[0], customer: { name: 'Client 8', phone: '+56000000000' }, items: [],
      } });
      fixture.detectChanges();
      expect(element.textContent).toContain('Client 8');
      expect(fixture.componentInstance.orders).toBe(previousOrders);
      expect(fixture.componentInstance.counts).toBe(previousCounts);
      expect(fixture.componentInstance.lastUpdated).toBe(previousTime);
      expect(tableWrapper.scrollTop).toBe(42);
    } finally {
      fixture?.destroy();
      document.body.style.overflow = previousOverflow;
      if (showDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showDescriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
      if (closeDescriptor) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    }
  });
});
