import { createInsertSchema } from "drizzle-zod";
import { date, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const shipmentsTable = pgTable("shipments", {
  id: text("id").primaryKey(),
  shipmentDate: date("shipment_date", { mode: "string" }).notNull(),
  customer: text("customer").notNull(),
  country: text("country").notNull(),
  quantityMt: numeric("quantity_mt", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  sellingPriceFob: numeric("selling_price_fob", {
    precision: 10,
    scale: 2,
    mode: "number",
  }).notNull().default(0),
  purchaseCost: numeric("purchase_cost", {
    precision: 10,
    scale: 2,
    mode: "number",
  }).notNull().default(0),
  freightInsurance: numeric("freight_insurance", {
    precision: 10,
    scale: 2,
    mode: "number",
  }).notNull().default(0),
  vesselName: text("vessel_name"),
  product: text("product"),
  loadingCompany: text("loading_company"),
  loadingPort: text("loading_port"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;