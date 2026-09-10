import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { db, shipmentsTable, type Shipment } from "@workspace/db";
import type { InferInsertModel } from "drizzle-orm";

export type ShipmentView = Shipment & {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

type SeedShipment = InferInsertModel<typeof shipmentsTable>;

export type ShipmentFilters = {
  year?: number;
  country?: string[];
  product?: string;
  loadingCompany?: string;
  from?: string | Date;
  to?: string | Date;
  search?: string;
};

export const countries = [
  "Albania",
  "Italy",
  "Israel",
  "Libya",
  "USA",
  "Greece",
  "Spain",
  "Canada",
  "Brazil",
  "Morocco",
  "Senegal",
  "Ivory Coast",
  "Romania",
  "Bulgaria",
  "Portugal",
  "Mexico",
];

export const loadingCompanies = [
  "NORDPORT",
  "AZURE MINERALS",
  "HELIX AGRO",
  "CRESTWAY",
  "TERRAFOS",
  "VANTAGE NUTRIENTS",
  "MERIDIAN BALTIC",
  "ORCHARD FERTILISERS",
  "KESTREL CHEM",
  "SOLARIS AGRI",
  "ATLAS NUTRIENTS",
  "HARBOURSIDE",
];

export const loadingPorts = [
  "Ventspils",
  "Damietta",
  "Gabes",
  "Constanta",
  "Sines",
  "Aqaba",
  "Tarragona",
  "Novorossiysk",
];

export const products = [
  "Urea 46% Granular",
  "Urea 46% Prilled",
  "Urea 46% Bigbag",
  "DAP 18-46-0",
  "MAP 11-52-0",
  "AN 33.5%",
  "CAN 27%",
  "NPK 15-15-15",
  "SOP Standard",
];

export const customers = [
  "Berdica",
  "Stagakis",
  "Hubcem",
  "Har Tuv",
  "Nordvale Trading",
  "Castel Agro",
  "Lomar Group",
  "Pentara SA",
  "Vinter Bros",
  "Delmar Commodities",
  "Ardena Trade",
  "Velora House",
  "Mistral Farm",
  "Orbis Agri",
  "Kelmor",
  "Sorelia Partners",
  "Tamarisk Trade",
  "Eastmere",
  "Caspian Link",
  "Averna SA",
  "Calderon House",
  "Nivora",
  "Brenton Commodities",
  "Marello",
  "Solvane",
  "Asteron",
  "Peloris",
  "Crownfield",
  "Wexford Trading",
  "Montara",
  "Eldric",
  "Varentis",
  "Lunaro",
  "Trevane",
  "Halden & Co",
  "Rovena",
  "Cortena",
  "Braxen",
  "Selkirk House",
  "Marovia",
  "Zafran Trade",
  "Novara Partners",
  "Kestrel House",
  "Aldora",
  "Virelli",
  "Portalis",
  "Dovaro",
  "Meridia Trade",
  "Ostrava Link",
  "Faron",
  "Yarden",
  "Belvara",
  "Caldris",
  "Nerova",
  "Santar",
  "Elvane",
  "Torrin",
  "Aurelia Commodities",
  "Fenwick",
];

const vessels = [
  "MV ATLANTA",
  "MV EVANGELIA",
  "MV NORTH STAR",
  "MV CORAL BAY",
  "MV SILVER DUNE",
  "MV OCEAN CREST",
  "MV BLUE ORBIT",
  "MV STARLING",
  "MV EASTERN LIGHT",
  "MV BRIGHT HORIZON",
  "MV RIVERSTONE",
  "MV AZURE WIND",
  "MV IRONWOOD",
  "MV GOLDEN TIDE",
  "MV MERIDIAN",
];

function number(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function withDerivedValues(shipment: Shipment): ShipmentView {
  const quantity = number(shipment.quantityMt);
  const sellingPrice = number(shipment.sellingPriceFob);
  const purchaseCost = number(shipment.purchaseCost);
  const freight = number(shipment.freightInsurance);
  const revenue = quantity * sellingPrice;
  const cost = quantity * (purchaseCost + freight);
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { ...shipment, revenue, cost, profit, margin };
}

export async function findShipments(filters: ShipmentFilters): Promise<ShipmentView[]> {
  const conditions = [];
  if (filters.year) {
    conditions.push(sql`EXTRACT(YEAR FROM ${shipmentsTable.shipmentDate}) = ${filters.year}`);
  }
  if (filters.country?.length) {
    conditions.push(inArray(shipmentsTable.country, filters.country));
  }
  if (filters.product) {
    conditions.push(eq(shipmentsTable.product, filters.product));
  }
  if (filters.loadingCompany) {
    conditions.push(eq(shipmentsTable.loadingCompany, filters.loadingCompany));
  }
  if (filters.from) {
    const from = filters.from instanceof Date ? filters.from.toISOString().slice(0, 10) : filters.from;
    conditions.push(gte(shipmentsTable.shipmentDate, from));
  }
  if (filters.to) {
    const to = filters.to instanceof Date ? filters.to.toISOString().slice(0, 10) : filters.to;
    conditions.push(lte(shipmentsTable.shipmentDate, to));
  }
  if (filters.search) {
    const search = `%${filters.search}%`;
    conditions.push(
      sql`(${ilike(shipmentsTable.customer, search)} OR ${ilike(shipmentsTable.country, search)} OR ${ilike(shipmentsTable.vesselName, search)})`,
    );
  }

  const rows = await db
    .select()
    .from(shipmentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(shipmentsTable.shipmentDate), desc(shipmentsTable.createdAt));
  return rows.map(withDerivedValues);
}

export function aggregateShipments(rows: ShipmentView[]) {
  const revenue = rows.reduce((total, row) => total + row.revenue, 0);
  const profit = rows.reduce((total, row) => total + row.profit, 0);
  const volumeMt = rows.reduce((total, row) => total + number(row.quantityMt), 0);
  return {
    revenue,
    profit,
    volumeMt,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    shipmentCount: rows.length,
  };
}

function seededDate(index: number): string {
  const start = Date.UTC(2023, 0, 5);
  const dayOffset = (index * 17) % 1210;
  const date = new Date(start + dayOffset * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export function buildSeedRows(count = 640): SeedShipment[] {
  return Array.from({ length: count }, (_, index) => {
    const supplierWeight = index % 11 < 5 ? index % 4 : index % loadingCompanies.length;
    const customer = customers[(index * 7 + 3) % customers.length];
    const product = products[(index * 5 + 1) % products.length];
    const quantity = 2000 + ((index * 8731) % 58001);
    const sellingPrice = 260 + ((index * 37) % 261);
    const zeroCost = index % 41 === 0;
    const targetMargin =
      index % 53 === 0 ? -8 + (index % 4) :
      index % 47 === 0 ? 22 + (index % 5) :
      -5 + ((index * 29) % 230) / 10;
    const freight = 8 + ((index * 11) % 37);
    const purchase = zeroCost
      ? 0
      : Math.max(160, sellingPrice - freight - sellingPrice * (targetMargin / 100));

    return {
      id: randomUUID(),
      shipmentDate: seededDate(index),
      customer,
      country: countries[(index * 11 + 2) % countries.length],
      quantityMt: Math.round(quantity * 100) / 100,
      sellingPriceFob: sellingPrice,
      purchaseCost: Math.round(purchase * 100) / 100,
      freightInsurance: freight,
      vesselName: vessels[(index * 13 + 4) % vessels.length],
      product,
      loadingCompany: loadingCompanies[supplierWeight],
      loadingPort: loadingPorts[(index * 3 + 1) % loadingPorts.length],
    };
  });
}

export async function seedDemoData(): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(shipmentsTable);
  if (Number(count) > 0) {
    return Number(count);
  }
  const rows = buildSeedRows();
  for (let offset = 0; offset < rows.length; offset += 100) {
    await db.insert(shipmentsTable).values(rows.slice(offset, offset + 100));
  }
  return rows.length;
}

export async function replaceWithDemoData(): Promise<number> {
  await db.delete(shipmentsTable);
  return seedDemoData();
}

export function uniqueSorted(rows: ShipmentView[], key: keyof ShipmentView): string[] {
  return [...new Set(rows.map((row) => String(row[key] ?? "")).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}