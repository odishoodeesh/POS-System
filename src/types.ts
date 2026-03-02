export interface User {
  id: string;
  username: string;
  role: 'owner' | 'manager' | 'cashier';
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category_id: number;
  category_name?: string;
  image_url?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: number;
  total: number;
  tax: number;
  discount: number;
  payment_method: string;
  created_at: string;
  user_id: string;
}

export interface Receipt {
  id: string;
  order_id: number;
  type: 'customer' | 'merchant' | 'kitchen' | 'refund' | 'gift_card';
  status: 'printed' | 'digital_only';
  created_at: string;
  total: number;
  tax: number;
  discount: number;
  payment_method: string;
  cashier_name: string;
  items: ReceiptItem[];
  taxes: ReceiptTax[];
}

export interface ReceiptItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  name: string;
  sku: string;
}

export interface ReceiptTax {
  id: number;
  receipt_id: string;
  tax_name: string;
  rate: number;
  amount: number;
}

export interface ReceiptSettings {
  id: number;
  business_name: string;
  branch_name: string;
  address: string;
  phone: string;
  tax_id: string;
  logo_url?: string;
  footer_message: string;
  return_policy: string;
  show_tax: number;
  show_cashier: number;
  show_sku: number;
  font_size: 'small' | 'medium' | 'large';
}
