import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of } from 'rxjs';
import { Order } from '../../models/order.model';
import { OrdersService } from '../../services/orders.service';

@Component({
  selector: 'app-orders-page',
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.scss',
})
export class OrdersPage implements OnInit {
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
  lastUpdated: Date | null = null;
  retryingOrderId: number | null = null;
  blockedOrderIds = new Set<number>();
  retryMessage: { orderId: number; text: string; kind: 'success' | 'warning' | 'error' } | null = null;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    if (this.isLoading || this.retryingOrderId !== null) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.ordersService.getOrders().pipe(
      finalize(() => this.isLoading = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ data }) => {
        this.setOrders(data);
        this.blockedOrderIds.clear();
        this.retryMessage = null;
        this.lastUpdated = new Date();
      },
      error: () => {
        this.errorMessage = this.orders === null
          ? 'No se pudieron cargar las órdenes. Intenta nuevamente.'
          : 'No se pudieron actualizar las órdenes. Se muestran los últimos datos disponibles.';
      },
    });
  }

  retryDispatch(id: number): void {
    const currentOrders = this.orders;
    const current = currentOrders?.find((order) => order.id === id);
    if (this.isLoading || this.retryingOrderId !== null || this.blockedOrderIds.has(id) ||
        !currentOrders || !current || current.dispatch_status === 'sent') return;

    this.retryingOrderId = id;
    this.retryMessage = null;
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
          break;
      }
    });
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
