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
