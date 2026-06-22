# Zipzo Database Design

## Core Entities

### users

Stores all people using the platform.

- id
- full_name
- phone
- role: customer, admin, seller, rider
- status: active, suspended
- created_at
- updated_at

### stores

Represents both MeroMart and MeroDokaan sources.

- id
- name
- type: company, shop
- owner_user_id
- status: draft, pending_approval, approved, suspended
- phone
- address_line
- latitude
- longitude
- opening_hours
- created_at
- updated_at

### products

Products belong to a store.

- id
- store_id
- name
- category
- description
- unit: piece, kg, gram, liter, ml, crate
- price
- stock_quantity
- status: draft, active, inactive, out_of_stock
- image_url
- created_at
- updated_at

### orders

Each MVP order has one source store.

- id
- customer_user_id
- store_id
- delivery_address_id
- status: placed, accepted, packed, out_for_delivery, delivered, cancelled
- payment_method: cod
- payment_status: pending, collected, refunded
- subtotal
- delivery_fee
- total
- notes
- created_at
- updated_at

### order_items

- id
- order_id
- product_id
- product_name_snapshot
- quantity
- unit_price_snapshot
- line_total

### delivery_assignments

- id
- order_id
- rider_user_id
- status: assigned, picked_up, delivered, failed
- picked_up_at
- delivered_at

## Important Design Choice

The `stores.type` field powers the hybrid model:

- `company` = MeroMart
- `shop` = MeroDokaan

This keeps product, cart, and order logic shared while allowing separate business rules later.
