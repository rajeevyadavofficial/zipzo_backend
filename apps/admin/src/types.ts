export type StoreType = "company" | "shop";
export type StoreStatus = "draft" | "pending_approval" | "approved" | "suspended";
export type ProductStatus = "draft" | "active" | "inactive" | "out_of_stock";
export type OrderStatus =
  | "placed"
  | "accepted"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Store {
  id: string;
  name: string;
  type: StoreType;
  status: StoreStatus;
  phone: string;
  addressLine: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  category: string;
  unit: "piece" | "kg" | "gram" | "liter" | "ml" | "crate";
  price: number;
  stockQuantity: number;
  status: ProductStatus;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  storeId: string;
  status: OrderStatus;
  paymentMethod: "cod";
  paymentStatus: "pending" | "collected" | "refunded";
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}
