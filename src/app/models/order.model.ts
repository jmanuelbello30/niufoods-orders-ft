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

export interface OrderCustomer {
  name: string | null;
  phone: string | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderDetail extends Order {
  client_total_amount?: number | null;
  customer?: OrderCustomer | null;
  delivery_address?: string | null;
  dispatched_at?: string | null;
  last_dispatch_error?: string | null;
  items: OrderItem[];
}

export interface OrderDetailResponse {
  data: OrderDetail;
}
