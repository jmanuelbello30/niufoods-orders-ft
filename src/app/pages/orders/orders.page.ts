import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of } from 'rxjs';
import { OrderDetailModal } from '../../components/order-detail-modal/order-detail-modal';
import { Order } from '../../models/order.model';
import { OrdersService } from '../../services/orders.service';

@Component({
  selector: 'app-orders-page',
  imports: [OrderDetailModal],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.scss',
})
export class OrdersPage implements OnInit, OnDestroy {
  private readonly ordersService = inject(OrdersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly moneyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
  private readonly dateFormatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  private readonly timeFormatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  orders: Order[] | null = null;
  counts = { total: 0, pending: 0, sent: 0, error: 0 };
  isLoading = false;
  errorMessage: string | null = null;
  errorMessageDismissing = false;
  private errorNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  private errorFadeTimer: ReturnType<typeof setTimeout> | null = null;
  lastUpdated: Date | null = null;
  retryingOrderId: number | null = null;
  blockedOrderIds = new Set<number>();
  retryMessage: { orderId: number; text: string; kind: 'success' | 'warning' | 'error' } | null = null;
  transientRetryMessage = false;
  retryMessageDismissing = false;
  refreshNotice = false;
  refreshNoticeDismissing = false;
  private retryNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  private retryFadeTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshFadeTimer: ReturnType<typeof setTimeout> | null = null;
  selectedOrderId: number | null = null;
  private detailOrigin: HTMLButtonElement | null = null;

  ngOnInit(): void {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.clearErrorNoticeTimers();
    this.clearRetryNoticeTimers();
    this.clearRefreshNoticeTimers();
  }

  openDetail(id: number, origin: HTMLButtonElement): void {
    this.detailOrigin = origin;
    this.selectedOrderId = id;
  }

  closeDetail(): void {
    this.selectedOrderId = null;
    this.detailOrigin?.focus({ preventScroll: true });
    this.detailOrigin = null;
  }

  refresh(showSuccessNotice = false): void {
    if (this.isLoading || this.retryingOrderId !== null) return;

    if (showSuccessNotice) this.clearRefreshNotice();
    this.isLoading = true;
    this.clearErrorNotice();
    this.ordersService.getOrders().pipe(
      finalize(() => this.isLoading = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ data }) => {
        this.setOrders(data);
        this.blockedOrderIds.clear();
        this.clearRetryNotice();
        this.lastUpdated = new Date();
        if (showSuccessNotice) this.showRefreshNotice();
      },
      error: () => {
        this.errorMessage = this.orders === null
          ? 'No se pudieron cargar las órdenes. Intenta nuevamente.'
          : 'No se pudieron actualizar las órdenes. Se muestran los últimos datos disponibles.';
        if (this.orders !== null) {
          this.errorNoticeTimer = setTimeout(() => this.dismissErrorNotice(), 5000);
        }
      },
    });
  }

  retryDispatch(id: number): void {
    const currentOrders = this.orders;
    const current = currentOrders?.find((order) => order.id === id);
    if (this.isLoading || this.retryingOrderId !== null || this.blockedOrderIds.has(id) ||
        !currentOrders || !current || current.dispatch_status === 'sent') return;

    this.retryingOrderId = id;
    this.clearRetryNotice();
    this.ordersService.retryDispatch(id).pipe(
      map((response) => ({ kind: 'retry' as const, response })),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.blockedOrderIds.add(id);
          return this.ordersService.getOrders().pipe(
            map((response) => ({ kind: 'conflict' as const, response })),
            catchError(() => of({ kind: 'sync-error' as const })),
          );
        }
        return of({ kind: 'failure' as const });
      }),
      finalize(() => this.retryingOrderId = null),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((result) => {
      switch (result.kind) {
        case 'retry': {
          const updated = result.response.data;
          this.setOrders(currentOrders.map((order) => order.id === id
            ? { ...order, ...updated, id: order.id, restaurant: updated.restaurant ?? order.restaurant }
            : order));
          this.retryMessage = {
            orderId: id,
            text: updated.dispatch_status === 'sent'
              ? `La orden #${id} fue enviada a tienda`
              : `No se pudo enviar la orden #${id}. Puedes volver a intentarlo`,
            kind: updated.dispatch_status === 'sent' ? 'success' : 'warning',
          };
          this.transientRetryMessage = true;
          this.retryNoticeTimer = setTimeout(() => this.dismissRetryNotice(),
            updated.dispatch_status === 'sent' ? 3000 : 5000);
          break;
        }
        case 'conflict':
          this.setOrders(result.response.data);
          this.blockedOrderIds.clear();
          this.lastUpdated = new Date();
          this.retryMessage = { orderId: id, text: `La orden #${id} ya fue enviada. Se actualizó el listado.`, kind: 'warning' };
          break;
        case 'sync-error':
          this.retryMessage = { orderId: id, text: `La orden #${id} ya fue enviada, pero no se pudo actualizar el listado. Pulsa Actualizar para confirmar su estado.`, kind: 'warning' };
          break;
        case 'failure':
          this.blockedOrderIds.add(id);
          this.retryMessage = { orderId: id, text: `No se pudo confirmar el resultado de la orden #${id}. Pulsa Actualizar antes de volver a intentarlo.`, kind: 'error' };
          this.transientRetryMessage = true;
          this.retryNoticeTimer = setTimeout(() => this.dismissRetryNotice(), 5000);
          break;
      }
    });
  }

  dismissRetryNotice(): void {
    if (!this.retryMessage || this.retryMessageDismissing) return;
    this.clearRetryNoticeTimers();
    this.retryMessageDismissing = true;
    this.retryFadeTimer = setTimeout(() => this.clearRetryNotice(), 250);
  }

  dismissErrorNotice(): void {
    if (!this.errorMessage || this.errorMessageDismissing || this.orders === null) return;
    this.clearErrorNoticeTimers();
    this.errorMessageDismissing = true;
    this.errorFadeTimer = setTimeout(() => this.clearErrorNotice(), 250);
  }

  dismissRefreshNotice(): void {
    if (!this.refreshNotice || this.refreshNoticeDismissing) return;
    this.clearRefreshNoticeTimers();
    this.refreshNoticeDismissing = true;
    this.refreshFadeTimer = setTimeout(() => this.clearRefreshNotice(), 250);
  }

  private showRefreshNotice(): void {
    this.clearRefreshNotice();
    this.refreshNotice = true;
    this.refreshNoticeTimer = setTimeout(() => this.dismissRefreshNotice(), 5000);
  }

  private clearRetryNotice(): void {
    this.clearRetryNoticeTimers();
    this.retryMessage = null;
    this.transientRetryMessage = false;
    this.retryMessageDismissing = false;
  }

  private clearErrorNotice(): void {
    this.clearErrorNoticeTimers();
    this.errorMessage = null;
    this.errorMessageDismissing = false;
  }

  private clearRefreshNotice(): void {
    this.clearRefreshNoticeTimers();
    this.refreshNotice = false;
    this.refreshNoticeDismissing = false;
  }

  private clearRetryNoticeTimers(): void {
    if (this.retryNoticeTimer !== null) clearTimeout(this.retryNoticeTimer);
    if (this.retryFadeTimer !== null) clearTimeout(this.retryFadeTimer);
    this.retryNoticeTimer = null;
    this.retryFadeTimer = null;
  }

  private clearErrorNoticeTimers(): void {
    if (this.errorNoticeTimer !== null) clearTimeout(this.errorNoticeTimer);
    if (this.errorFadeTimer !== null) clearTimeout(this.errorFadeTimer);
    this.errorNoticeTimer = null;
    this.errorFadeTimer = null;
  }

  private clearRefreshNoticeTimers(): void {
    if (this.refreshNoticeTimer !== null) clearTimeout(this.refreshNoticeTimer);
    if (this.refreshFadeTimer !== null) clearTimeout(this.refreshFadeTimer);
    this.refreshNoticeTimer = null;
    this.refreshFadeTimer = null;
  }

  private setOrders(data: Order[]): void {
    this.orders = data;
    this.counts = {
      total: data.length,
      pending: data.filter((order) => order.dispatch_status === 'pending').length,
      sent: data.filter((order) => order.dispatch_status === 'sent').length,
      error: data.filter((order) => order.dispatch_status === 'error').length,
    };
  }

  formatAmount(amount: number): string {
    return this.moneyFormatter.format(amount);
  }

  formatDate(date: string): string {
    return this.dateFormatter.format(new Date(date));
  }

  formatTime(date: Date): string {
    return this.timeFormatter.format(date);
  }
}
