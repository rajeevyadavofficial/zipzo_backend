import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import type {
  OrderStatus,
  ProductStatus,
  ProductUnit,
  StoreStatus,
  StoreType
} from "@zipzo/shared";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined
});

export interface StoreRecord {
  id: string;
  name: string;
  type: StoreType;
  status: StoreStatus;
  ownerUserId: string | null;
  phone: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRecord {
  id: string;
  storeId: string;
  name: string;
  category: string;
  description: string | null;
  unit: ProductUnit;
  price: number;
  stockQuantity: number;
  status: ProductStatus;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderRecord {
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
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      "ownerUserId" TEXT,
      phone TEXT NOT NULL,
      "addressLine" TEXT NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      "storeId" TEXT NOT NULL REFERENCES stores(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      unit TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      "stockQuantity" DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL,
      "imageUrl" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      "customerName" TEXT NOT NULL,
      "customerPhone" TEXT NOT NULL,
      "storeId" TEXT NOT NULL REFERENCES stores(id),
      status TEXT NOT NULL,
      "paymentMethod" TEXT NOT NULL,
      "paymentStatus" TEXT NOT NULL,
      "deliveryAddress" TEXT NOT NULL,
      subtotal DOUBLE PRECISION NOT NULL,
      "deliveryFee" DOUBLE PRECISION NOT NULL,
      total DOUBLE PRECISION NOT NULL,
      notes TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES orders(id),
      "productId" TEXT NOT NULL REFERENCES products(id),
      "productNameSnapshot" TEXT NOT NULL,
      quantity DOUBLE PRECISION NOT NULL,
      "unitPriceSnapshot" DOUBLE PRECISION NOT NULL,
      "lineTotal" DOUBLE PRECISION NOT NULL
    );

    CREATE INDEX IF NOT EXISTS stores_type_idx ON stores(type);
    CREATE INDEX IF NOT EXISTS stores_status_idx ON stores(status);
    CREATE INDEX IF NOT EXISTS products_store_idx ON products("storeId");
    CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
    CREATE INDEX IF NOT EXISTS orders_store_idx ON orders("storeId");
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
  `);
}

export async function seedInitialData() {
  const existing = await pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM stores");
  if (Number(existing.rows[0]?.count ?? 0) > 0) {
    return;
  }

  await pool.query(
    `
      INSERT INTO stores (
        id, name, type, status, "ownerUserId", phone, "addressLine", latitude, longitude
      ) VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9),
        ($10, $11, $12, $13, $14, $15, $16, $17, $18)
    `,
    [
      "store_meromart",
      "MeroMart Fresh",
      "company",
      "approved",
      null,
      "9800000000",
      "New Baneshwor, Kathmandu",
      27.688,
      85.335,
      "store_demo_dokaan",
      "Sharma Grocery Dokaan",
      "shop",
      "approved",
      "seller_demo",
      "9811111111",
      "Old Baneshwor, Kathmandu",
      27.693,
      85.338
    ]
  );

  await pool.query(
    `
      INSERT INTO products (
        id, "storeId", name, category, description, unit, price, "stockQuantity", status, "imageUrl"
      ) VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
        ($11, $12, $13, $14, $15, $16, $17, $18, $19, $20),
        ($21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
    `,
    [
      "prod_chicken_broiler",
      "store_meromart",
      "Broiler Chicken",
      "Meat",
      "Fresh cleaned broiler chicken.",
      "kg",
      420,
      30,
      "active",
      null,
      "prod_coke_225",
      "store_meromart",
      "Coca-Cola 2.25L",
      "Soft Drinks",
      null,
      "piece",
      260,
      48,
      "active",
      null,
      "prod_rice_5kg",
      "store_demo_dokaan",
      "Jeera Masino Rice 5kg",
      "Grocery",
      null,
      "piece",
      850,
      12,
      "active",
      null
    ]
  );
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
