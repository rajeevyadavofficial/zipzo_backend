# Zipzo

Zipzo is a hybrid grocery platform with two selling models:

- **MeroMart**: company-owned products such as meat, drinks, fruits, and vegetables.
- **MeroDokaan**: verified nearby shops that list and sell their own products.

## Workspace

```txt
apps/
  api/      Backend API
  admin/    Admin and seller dashboard
  mobile/   Customer mobile app, planned
packages/
  shared/   Shared domain types and constants
docs/
  product-requirements.md
  database-design.md
  api-design.md
```

## Start API

```bash
npm install
npm run dev:api
```

The API starts on `http://localhost:4000` by default.

The API reads `DATABASE_URL` from `apps/api/.env` for PostgreSQL.

## Start Admin Dashboard

In a second terminal, run:

```bash
npm run dev:admin
```

The admin dashboard starts on `http://localhost:5173` by default.

The dashboard expects the API at `http://localhost:4000`. To point it elsewhere, set:

```bash
VITE_API_BASE_URL=http://localhost:4000
```
