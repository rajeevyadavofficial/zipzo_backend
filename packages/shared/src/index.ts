export const storeTypes = ["company", "shop"] as const;
export type StoreType = (typeof storeTypes)[number];

export const storeStatuses = [
  "draft",
  "pending_approval",
  "approved",
  "suspended"
] as const;
export type StoreStatus = (typeof storeStatuses)[number];

export const productStatuses = [
  "draft",
  "active",
  "inactive",
  "out_of_stock"
] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const orderStatuses = [
  "placed",
  "accepted",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled"
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const productUnits = [
  "piece",
  "kg",
  "gram",
  "liter",
  "ml",
  "crate"
] as const;
export type ProductUnit = (typeof productUnits)[number];

export interface StoreSummary {
  id: string;
  name: string;
  type: StoreType;
  status: StoreStatus;
  addressLine: string;
}

export interface ProductSummary {
  id: string;
  storeId: string;
  name: string;
  category: string;
  unit: ProductUnit;
  price: number;
  stockQuantity: number;
  status: ProductStatus;
}
