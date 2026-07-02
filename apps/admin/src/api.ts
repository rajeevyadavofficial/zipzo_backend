import type { Order, OrderStatus, Product, Store, StoreStatus } from "./types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const tokenStorageKey = "zipzo_admin_token";

export function getAdminToken() {
  return localStorage.getItem(tokenStorageKey);
}

export function setAdminToken(token: string) {
  localStorage.setItem(tokenStorageKey, token);
}

export function clearAdminToken() {
  localStorage.removeItem(tokenStorageKey);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function loginAdmin(input: { email: string; password: string }) {
  return request<{ data: { token: string; admin: { email: string } } }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getStores() {
  return request<{ data: Store[] }>("/api/v1/stores");
}

export async function updateStoreStatus(storeId: string, status: StoreStatus) {
  return request<{ data: Store }>(`/api/v1/stores/${storeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function getProducts() {
  return request<{ data: Product[] }>("/api/v1/products");
}

export async function createProduct(input: {
  storeId: string;
  name: string;
  category: string;
  unit: Product["unit"];
  price: number;
  stockQuantity: number;
  status: Product["status"];
}) {
  return request<{ data: Product }>("/api/v1/products", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getOrders() {
  return request<{ data: Order[] }>("/api/v1/orders");
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return request<{ data: Order }>(`/api/v1/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}
