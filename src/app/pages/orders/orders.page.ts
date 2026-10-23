import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.ordersService.getOrders().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ data }) => {
        this.orders = data;
        this.counts = {
          total: data.length,
          pending: data.filter((order) => order.dispatch_status === 'pending').length,
          sent: data.filter((order) => order.dispatch_status === 'sent').length,
          error: data.filter((order) => order.dispatch_status === 'error').length,
        };
        this.lastUpdated = new Date();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = this.orders === null
          ? 'No se pudieron cargar las órdenes. Intenta nuevamente.'
          : 'No se pudieron actualizar las órdenes. Se muestran los últimos datos disponibles.';
        this.isLoading = false;
      },
    });
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
