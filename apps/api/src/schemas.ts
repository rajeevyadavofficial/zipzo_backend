import { z } from "zod";
import {
  orderStatuses,
  productStatuses,
  productUnits,
  storeStatuses,
  storeTypes
} from "@zipzo/shared";

export const createStoreSchema = z.object({
  name: z.string().min(2),
  type: z.enum(storeTypes),
  ownerUserId: z.string().optional(),
  phone: z.string().min(7),
  addressLine: z.string().min(3),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export const createProductSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  unit: z.enum(productUnits),
  price: z.number().positive(),
  stockQuantity: z.number().nonnegative(),
  status: z.enum(productStatuses).default("draft"),
  imageUrl: z.url().optional()
});

export const updateProductSchema = createProductSchema.partial().omit({
  storeId: true
});

export const createOrderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(7),
  storeId: z.string().min(1),
  deliveryAddress: z.string().min(3),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().positive()
    })
  ).min(1)
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatuses)
});

export const updateStoreStatusSchema = z.object({
  status: z.enum(storeStatuses)
});
