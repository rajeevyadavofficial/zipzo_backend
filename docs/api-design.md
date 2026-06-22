# Zipzo API Design

## API Style

The MVP API is REST-based and JSON-only.

Base path:

```txt
/api/v1
```

## Health

- `GET /health`

## Stores

- `GET /api/v1/stores`
- `GET /api/v1/stores/:id`
- `POST /api/v1/stores`
- `PATCH /api/v1/stores/:id/approve`

## Products

- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`

## Orders

- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `POST /api/v1/orders`
- `PATCH /api/v1/orders/:id/status`

## MVP Rules

- A product must belong to one store.
- An order must contain products from one store only.
- MeroDokaan stores must be approved before products become visible to customers.
- Alcohol categories remain disabled until legal approval is confirmed.
