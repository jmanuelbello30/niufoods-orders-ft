import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import { OrderDetail } from '../../models/order.model';
import { OrdersService } from '../../services/orders.service';

@Component({
  selector: 'app-order-detail-modal',
  templateUrl: './order-detail-modal.html',
  styleUrl: './order-detail-modal.scss',
})
export class OrderDetailModal implements AfterViewInit, OnChanges, OnDestroy {
  @Input() orderId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('dialog') private dialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

  private readonly ordersService = inject(OrdersService);
  private request?: Subscription;
  private requestedId: number | null = null;
  private previousOverflow: string | null = null;
  private isOpen = false;
  private readonly moneyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  });
  private readonly dateFormatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  detail: OrderDetail | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  errorKind: 'invalid' | 'not-found' | 'connection' | null = null;

  ngAfterViewInit(): void {
    const dialog = this.dialog?.nativeElement;
    if (!dialog) return;
    dialog.showModal();
    this.isOpen = true;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.closeButton?.nativeElement.focus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['orderId']) this.loadDetail();
  }

  loadDetail(): void {
    const id = this.orderId;
    if (this.isLoading && this.requestedId === id) return;
    this.request?.unsubscribe();
    this.request = undefined;
    this.requestedId = id;
    this.detail = null;
    this.errorMessage = null;
    this.errorKind = null;
    this.isLoading = false;

    if (!Number.isSafeInteger(id) || id === null || id <= 0) {
      this.errorKind = 'invalid';
      this.errorMessage = 'Identificador de orden inválido';
      return;
    }

    this.isLoading = true;
    this.request = this.ordersService.getOrder(id).pipe(
      finalize(() => this.isLoading = false),
    ).subscribe({
      next: ({ data }) => this.detail = data,
      error: (error: unknown) => {
        this.errorKind = error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'connection';
        this.errorMessage = this.errorKind === 'not-found'
          ? 'No encontramos esta orden'
          : 'No pudimos cargar el detalle. Comprueba tu conexión y vuelve a intentarlo.';
      },
    });
  }

  close(): void {
    this.dialog?.nativeElement.close();
  }

  onDialogClosed(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.request?.unsubscribe();
    this.restoreScroll();
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.isOpen = false;
    if (this.dialog?.nativeElement.open) this.dialog.nativeElement.close();
    this.restoreScroll();
  }

  private restoreScroll(): void {
    if (this.previousOverflow === null) return;
    document.body.style.overflow = this.previousOverflow;
    this.previousOverflow = null;
  }

  formatAmount(amount: number): string {
    return this.moneyFormatter.format(amount);
  }

  formatDate(date: string | null | undefined): string {
    return date ? this.dateFormatter.format(new Date(date)) : 'No disponible';
  }
}
