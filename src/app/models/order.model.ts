export interface Restaurant {
  id: number;
  name: string;
  code: string;
}

export interface Order {
  id: number;
  restaurant_id: number;
  restaurant: Restaurant;
  total_amount: number;
  order_type: 'pickup' | 'delivery';
  created_at: string;
  dispatch_status: 'pending' | 'sent' | 'error';
}

export interface OrdersResponse {
  data: Order[];
}

export interface RetryDispatchOrder extends Partial<Omit<Order, 'id' | 'dispatch_status'>> {
  id: number;
  dispatch_status: 'sent' | 'error';
  dispatched_at?: string | null;
  last_dispatch_error?: string | null;
}

export interface RetryDispatchResponse {
  data: RetryDispatchOrder;
}
