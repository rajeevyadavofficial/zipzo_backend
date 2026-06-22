import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  ClipboardList,
  PackagePlus,
  RefreshCcw,
  ShoppingBasket,
  Store as StoreIcon,
  Truck
} from "lucide-react";
import {
  createProduct,
  getOrders,
  getProducts,
  getStores,
  updateOrderStatus,
  updateStoreStatus
} from "./api";
import type { Order, OrderStatus, Product, Store, StoreStatus } from "./types";

const orderFlow: OrderStatus[] = [
  "placed",
  "accepted",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled"
];

const storeStatusOptions: StoreStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "suspended"
];

export function App() {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeView, setActiveView] = useState<"overview" | "stores" | "products" | "orders">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const [storeResult, productResult, orderResult] = await Promise.all([
        getStores(),
        getProducts(),
        getOrders()
      ]);
      setStores(storeResult.data);
      setProducts(productResult.data);
      setOrders(orderResult.data);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const meromartProducts = products.filter((product) => {
      const store = stores.find((item) => item.id === product.storeId);
      return store?.type === "company";
    }).length;

    return [
      {
        label: "Approved Shops",
        value: stores.filter((store) => store.type === "shop" && store.status === "approved").length,
        icon: BadgeCheck
      },
      {
        label: "Pending Shops",
        value: stores.filter((store) => store.status === "pending_approval").length,
        icon: StoreIcon
      },
      {
        label: "MeroMart SKUs",
        value: meromartProducts,
        icon: ShoppingBasket
      },
      {
        label: "Open Orders",
        value: orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
        icon: Truck
      }
    ];
  }, [orders, products, stores]);

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-block">
          <span className="brand-mark">Z</span>
          <div>
            <strong>Zipzo</strong>
            <small>Operations</small>
          </div>
        </div>

        <nav className="nav-list">
          <button className={activeView === "overview" ? "active" : ""} onClick={() => setActiveView("overview")}>
            <ClipboardList size={18} />
            Overview
          </button>
          <button className={activeView === "stores" ? "active" : ""} onClick={() => setActiveView("stores")}>
            <Building2 size={18} />
            Stores
          </button>
          <button className={activeView === "products" ? "active" : ""} onClick={() => setActiveView("products")}>
            <PackagePlus size={18} />
            Products
          </button>
          <button className={activeView === "orders" ? "active" : ""} onClick={() => setActiveView("orders")}>
            <Truck size={18} />
            Orders
          </button>
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Hybrid grocery platform</p>
            <h1>MeroMart + MeroDokaan Admin</h1>
          </div>
          <button className="icon-button" aria-label="Refresh dashboard" onClick={() => void loadDashboard()}>
            <RefreshCcw size={18} />
          </button>
        </header>

        {error ? <div className="notice error">{error}</div> : null}
        {loading ? <div className="notice">Loading dashboard...</div> : null}

        {!loading && activeView === "overview" ? <Overview stats={stats} orders={orders} /> : null}
        {!loading && activeView === "stores" ? (
          <StoresView stores={stores} onStatusChange={async (storeId, status) => {
            await updateStoreStatus(storeId, status);
            await loadDashboard();
          }} />
        ) : null}
        {!loading && activeView === "products" ? (
          <ProductsView stores={stores} products={products} onProductCreated={loadDashboard} />
        ) : null}
        {!loading && activeView === "orders" ? (
          <OrdersView stores={stores} orders={orders} onStatusChange={async (orderId, status) => {
            await updateOrderStatus(orderId, status);
            await loadDashboard();
          }} />
        ) : null}
      </section>
    </main>
  );
}

function Overview({ stats, orders }: {
  stats: Array<{ label: string; value: number; icon: typeof BadgeCheck }>;
  orders: Order[];
}) {
  const recentOrders = orders.slice(-5).reverse();

  return (
    <>
      <section className="metric-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="metric" key={stat.label}>
              <Icon size={20} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Recent Orders</h2>
          <span>{recentOrders.length} latest</span>
        </div>
        {recentOrders.length === 0 ? (
          <p className="empty">No orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.customerName}</td>
                    <td><StatusBadge value={order.status} /></td>
                    <td>Rs. {order.total}</td>
                    <td>{order.items.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function StoresView({ stores, onStatusChange }: {
  stores: Store[];
  onStatusChange: (storeId: string, status: StoreStatus) => Promise<void>;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Stores</h2>
        <span>{stores.length} total</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Model</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id}>
                <td>{store.name}</td>
                <td>{store.type === "company" ? "MeroMart" : "MeroDokaan"}</td>
                <td>{store.addressLine}</td>
                <td>{store.phone}</td>
                <td><StatusBadge value={store.status} /></td>
                <td>
                  <select
                    aria-label={`Change status for ${store.name}`}
                    value={store.status}
                    onChange={(event) => void onStatusChange(store.id, event.target.value as StoreStatus)}
                  >
                    {storeStatusOptions.map((status) => (
                      <option value={status} key={status}>{labelize(status)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductsView({ stores, products, onProductCreated }: {
  stores: Store[];
  products: Product[];
  onProductCreated: () => Promise<void>;
}) {
  const approvedStores = stores.filter((store) => store.status === "approved");
  const [form, setForm] = useState({
    storeId: approvedStores[0]?.id ?? "",
    name: "",
    category: "Meat",
    unit: "kg" as Product["unit"],
    price: "0",
    stockQuantity: "0",
    status: "active" as Product["status"]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!form.storeId && approvedStores[0]) {
      setForm((current) => ({ ...current, storeId: approvedStores[0].id }));
    }
  }, [approvedStores, form.storeId]);

  async function submitProduct(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createProduct({
        storeId: form.storeId,
        name: form.name,
        category: form.category,
        unit: form.unit,
        price: Number(form.price),
        stockQuantity: Number(form.stockQuantity),
        status: form.status
      });
      setForm((current) => ({ ...current, name: "", price: "0", stockQuantity: "0" }));
      await onProductCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="split">
      <section className="panel">
        <div className="panel-heading">
          <h2>Add Product</h2>
          <span>MeroMart or approved shop</span>
        </div>
        <form className="form-grid" onSubmit={(event) => void submitProduct(event)}>
          <label>
            Store
            <select value={form.storeId} onChange={(event) => setForm({ ...form, storeId: event.target.value })}>
              {approvedStores.map((store) => (
                <option value={store.id} key={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Category
            <input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </label>
          <label>
            Unit
            <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value as Product["unit"] })}>
              {["piece", "kg", "gram", "liter", "ml", "crate"].map((unit) => (
                <option value={unit} key={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <label>
            Price
            <input min="1" required type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          </label>
          <label>
            Stock
            <input min="0" required type="number" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} />
          </label>
          <button className="primary-button" disabled={submitting || !form.storeId}>
            <PackagePlus size={17} />
            Add Product
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Products</h2>
          <span>{products.length} listed</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Store</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{stores.find((store) => store.id === product.storeId)?.name ?? "Unknown"}</td>
                  <td>{product.category}</td>
                  <td>Rs. {product.price}</td>
                  <td>{product.stockQuantity} {product.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OrdersView({ stores, orders, onStatusChange }: {
  stores: Store[];
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Orders</h2>
        <span>{orders.length} total</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Store</th>
              <th>Address</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.customerName}</strong>
                  <small>{order.customerPhone}</small>
                </td>
                <td>{stores.find((store) => store.id === order.storeId)?.name ?? "Unknown"}</td>
                <td>{order.deliveryAddress}</td>
                <td>Rs. {order.total}</td>
                <td><StatusBadge value={order.status} /></td>
                <td>
                  <select
                    aria-label={`Change status for ${order.customerName}`}
                    value={order.status}
                    onChange={(event) => void onStatusChange(order.id, event.target.value as OrderStatus)}
                  >
                    {orderFlow.map((status) => (
                      <option value={status} key={status}>{labelize(status)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{labelize(value)}</span>;
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
