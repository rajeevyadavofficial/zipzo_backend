import cors from "cors";
import express, { type Request, type Response } from "express";
import { ZodError } from "zod";
import {
  createId,
  initializeDatabase,
  pool,
  seedInitialData,
  type OrderItemRecord,
  type OrderRecord,
  type ProductRecord,
  type StoreRecord
} from "./data.js";
import {
  createOrderSchema,
  createProductSchema,
  createStoreSchema,
  updateOrderStatusSchema,
  updateProductSchema,
  updateStoreStatusSchema
} from "./schemas.js";
import type { StoreStatus } from "@zipzo/shared";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "zipzo-api",
    database: "postgresql",
    modes: ["MeroMart", "MeroDokaan"]
  });
});

app.get("/api/v1/stores", async (request, response) => {
  const type = request.query.type?.toString();
  const result = type
    ? await pool.query<StoreRecord>('SELECT * FROM stores WHERE type = $1 ORDER BY "createdAt" ASC', [type])
    : await pool.query<StoreRecord>('SELECT * FROM stores ORDER BY "createdAt" ASC');

  response.json({ data: result.rows });
});

app.get("/api/v1/stores/:id", async (request, response) => {
  const store = await findStore(request.params.id);
  if (!store) {
    response.status(404).json({ error: "Store not found" });
    return;
  }

  response.json({ data: store });
});

app.post("/api/v1/stores", async (request, response) => {
  const input = createStoreSchema.parse(request.body);
  const status: StoreStatus = input.type === "company" ? "approved" : "pending_approval";
  const store = await pool.query<StoreRecord>(
    `
      INSERT INTO stores (
        id, name, type, status, "ownerUserId", phone, "addressLine", latitude, longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      createId("store"),
      input.name,
      input.type,
      status,
      input.ownerUserId ?? null,
      input.phone,
      input.addressLine,
      input.latitude ?? null,
      input.longitude ?? null
    ]
  );

  response.status(201).json({ data: store.rows[0] });
});

app.patch("/api/v1/stores/:id/status", async (request, response) => {
  const input = updateStoreStatusSchema.parse(request.body);
  const result = await pool.query<StoreRecord>(
    'UPDATE stores SET status = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
    [input.status, request.params.id]
  );

  if (!result.rows[0]) {
    response.status(404).json({ error: "Store not found" });
    return;
  }

  response.json({ data: result.rows[0] });
});

app.get("/api/v1/products", async (request, response) => {
  const storeId = request.query.storeId?.toString();
  const category = request.query.category?.toString();
  const products = await listProducts(storeId, category);

  response.json({ data: products });
});

app.get("/api/v1/products/:id", async (request, response) => {
  const product = await findProduct(request.params.id);
  if (!product) {
    response.status(404).json({ error: "Product not found" });
    return;
  }

  response.json({ data: product });
});

app.post("/api/v1/products", async (request, response) => {
  const input = createProductSchema.parse(request.body);
  const store = await findStore(input.storeId);
  if (!store) {
    response.status(400).json({ error: "Store does not exist" });
    return;
  }

  if (store.type === "shop" && store.status !== "approved") {
    response.status(409).json({ error: "Shop must be approved before adding products" });
    return;
  }

  const product = await pool.query<ProductRecord>(
    `
      INSERT INTO products (
        id, "storeId", name, category, description, unit, price, "stockQuantity", status, "imageUrl"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      createId("prod"),
      input.storeId,
      input.name,
      input.category,
      input.description ?? null,
      input.unit,
      input.price,
      input.stockQuantity,
      input.status,
      input.imageUrl ?? null
    ]
  );

  response.status(201).json({ data: product.rows[0] });
});

app.patch("/api/v1/products/:id", async (request, response) => {
  const input = updateProductSchema.parse(request.body);
  const current = await findProduct(request.params.id);
  if (!current) {
    response.status(404).json({ error: "Product not found" });
    return;
  }

  const next = {
    ...current,
    ...input,
    description: input.description ?? current.description,
    imageUrl: input.imageUrl ?? current.imageUrl
  };

  const product = await pool.query<ProductRecord>(
    `
      UPDATE products
      SET name = $1, category = $2, description = $3, unit = $4, price = $5,
        "stockQuantity" = $6, status = $7, "imageUrl" = $8, "updatedAt" = NOW()
      WHERE id = $9
      RETURNING *
    `,
    [
      next.name,
      next.category,
      next.description,
      next.unit,
      next.price,
      next.stockQuantity,
      next.status,
      next.imageUrl,
      next.id
    ]
  );

  response.json({ data: product.rows[0] });
});

app.get("/api/v1/orders", async (_request, response) => {
  const result = await pool.query<OrderRecord>('SELECT * FROM orders ORDER BY "createdAt" ASC');
  const orders = await Promise.all(result.rows.map(toOrderResponse));
  response.json({ data: orders });
});

app.get("/api/v1/orders/:id", async (request, response) => {
  const order = await findOrder(request.params.id);
  if (!order) {
    response.status(404).json({ error: "Order not found" });
    return;
  }

  response.json({ data: await toOrderResponse(order) });
});

app.post("/api/v1/orders", async (request, response) => {
  const input = createOrderSchema.parse(request.body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const storeResult = await client.query<StoreRecord>("SELECT * FROM stores WHERE id = $1", [input.storeId]);
    const store = storeResult.rows[0];
    if (!store || store.status !== "approved") {
      throw new OrderBuildError("Store is not available for orders");
    }

    const orderProducts = [];
    for (const item of input.items) {
      const productResult = await client.query<ProductRecord>(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );
      const product = productResult.rows[0];

      if (!product || product.storeId !== input.storeId || product.status !== "active") {
        throw new OrderBuildError(`Product ${item.productId} is not available from this store`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new OrderBuildError(`Product ${product.name} does not have enough stock`);
      }

      orderProducts.push({ product, quantity: item.quantity });
    }

    const subtotal = orderProducts.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);
    const deliveryFee = subtotal >= 1500 ? 0 : 100;
    const orderId = createId("order");

    const orderResult = await client.query<OrderRecord>(
      `
        INSERT INTO orders (
          id, "customerName", "customerPhone", "storeId", status, "paymentMethod", "paymentStatus",
          "deliveryAddress", subtotal, "deliveryFee", total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [
        orderId,
        input.customerName,
        input.customerPhone,
        input.storeId,
        "placed",
        "cod",
        "pending",
        input.deliveryAddress,
        subtotal,
        deliveryFee,
        subtotal + deliveryFee,
        input.notes ?? null
      ]
    );

    for (const item of orderProducts) {
      await client.query(
        `
          INSERT INTO order_items (
            id, "orderId", "productId", "productNameSnapshot", quantity, "unitPriceSnapshot", "lineTotal"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          createId("item"),
          orderId,
          item.product.id,
          item.product.name,
          item.quantity,
          item.product.price,
          item.product.price * item.quantity
        ]
      );
      await client.query(
        'UPDATE products SET "stockQuantity" = "stockQuantity" - $1, "updatedAt" = NOW() WHERE id = $2',
        [item.quantity, item.product.id]
      );
    }

    await client.query("COMMIT");
    response.status(201).json({ data: await toOrderResponse(orderResult.rows[0]) });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.patch("/api/v1/orders/:id/status", async (request, response) => {
  const input = updateOrderStatusSchema.parse(request.body);
  const result = await pool.query<OrderRecord>(
    'UPDATE orders SET status = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
    [input.status, request.params.id]
  );

  if (!result.rows[0]) {
    response.status(404).json({ error: "Order not found" });
    return;
  }

  response.json({ data: await toOrderResponse(result.rows[0]) });
});

app.use((error: unknown, _request: Request, response: Response, _next: unknown) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Validation failed",
      details: error.issues
    });
    return;
  }

  if (error instanceof OrderBuildError) {
    response.status(409).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  await initializeDatabase();
  await seedInitialData();

  app.listen(port, () => {
    console.log(`Zipzo API running on http://localhost:${port}`);
  });
}

void startServer();

class OrderBuildError extends Error {}

async function findStore(id: string) {
  const result = await pool.query<StoreRecord>("SELECT * FROM stores WHERE id = $1", [id]);
  return result.rows[0];
}

async function findProduct(id: string) {
  const result = await pool.query<ProductRecord>("SELECT * FROM products WHERE id = $1", [id]);
  return result.rows[0];
}

async function listProducts(storeId?: string, category?: string) {
  if (storeId && category) {
    const result = await pool.query<ProductRecord>(
      'SELECT * FROM products WHERE "storeId" = $1 AND category = $2 ORDER BY "createdAt" ASC',
      [storeId, category]
    );
    return result.rows;
  }

  if (storeId) {
    const result = await pool.query<ProductRecord>(
      'SELECT * FROM products WHERE "storeId" = $1 ORDER BY "createdAt" ASC',
      [storeId]
    );
    return result.rows;
  }

  if (category) {
    const result = await pool.query<ProductRecord>(
      'SELECT * FROM products WHERE category = $1 ORDER BY "createdAt" ASC',
      [category]
    );
    return result.rows;
  }

  const result = await pool.query<ProductRecord>('SELECT * FROM products ORDER BY "createdAt" ASC');
  return result.rows;
}

async function findOrder(id: string) {
  const result = await pool.query<OrderRecord>("SELECT * FROM orders WHERE id = $1", [id]);
  return result.rows[0];
}

async function listOrderItems(orderId: string) {
  const result = await pool.query<OrderItemRecord>(
    'SELECT * FROM order_items WHERE "orderId" = $1',
    [orderId]
  );
  return result.rows;
}

async function toOrderResponse(order: OrderRecord) {
  const items = await listOrderItems(order.id);

  return {
    ...order,
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot,
      lineTotal: item.lineTotal
    }))
  };
}
