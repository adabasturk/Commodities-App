import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  CreateShipmentBody,
  CreateShipmentResponse,
  DeleteShipmentParams,
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
  GetMetadataResponse,
  GetShipmentParams,
  GetShipmentResponse,
  GetSupplierSummaryResponse,
  ImportShipmentsBody,
  ImportShipmentsResponse,
  ListShipmentsQueryParams,
  ListShipmentsResponse,
  ResetDemoDataResponse,
  UpdateShipmentBody,
  UpdateShipmentParams,
  UpdateShipmentResponse,
} from "@workspace/api-zod";
import { db, shipmentsTable } from "@workspace/db";
import {
  aggregateShipments,
  countries,
  customers,
  findShipments,
  loadingCompanies,
  loadingPorts,
  products,
  replaceWithDemoData,
  uniqueSorted,
  withDerivedValues,
} from "../lib/shipments";

const router: IRouter = Router();

function normalizeQuery(query: Record<string, unknown>) {
  return {
    ...query,
    country:
      typeof query.country === "string"
        ? [query.country]
        : Array.isArray(query.country)
          ? query.country
          : undefined,
  };
}

function normalizeShipmentDate(value: Date | string | undefined) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

router.get("/shipments", async (req, res): Promise<void> => {
  const parsed = ListShipmentsQueryParams.safeParse(normalizeQuery(req.query));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await findShipments(parsed.data);
  const page = parsed.data.page;
  const pageSize = parsed.data.pageSize;
  const start = (page - 1) * pageSize;
  res.json(
    ListShipmentsResponse.parse({
      items: rows.slice(start, start + pageSize),
      total: rows.length,
      page,
      pageSize,
      hasMore: start + pageSize < rows.length,
    }),
  );
});

router.post("/shipments", async (req, res): Promise<void> => {
  const parsed = CreateShipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [shipment] = await db
    .insert(shipmentsTable)
    .values({
      id: crypto.randomUUID(),
      ...parsed.data,
      shipmentDate: normalizeShipmentDate(parsed.data.shipmentDate)!,
    })
    .returning();
  res.status(201).json(CreateShipmentResponse.parse(withDerivedValues(shipment)));
});

router.get("/shipments/:id", async (req, res): Promise<void> => {
  const params = GetShipmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [shipment] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, params.data.id));
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  res.json(GetShipmentResponse.parse(withDerivedValues(shipment)));
});

router.patch("/shipments/:id", async (req, res): Promise<void> => {
  const params = UpdateShipmentParams.safeParse(req.params);
  const parsed = UpdateShipmentBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { shipmentDate, ...updateFields } = parsed.data;
  const [shipment] = await db
    .update(shipmentsTable)
    .set({
      ...updateFields,
      ...(shipmentDate !== undefined
        ? { shipmentDate: normalizeShipmentDate(shipmentDate)! }
        : {}),
    })
    .where(eq(shipmentsTable.id, params.data.id))
    .returning();
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  res.json(UpdateShipmentResponse.parse(withDerivedValues(shipment)));
});

router.delete("/shipments/:id", async (req, res): Promise<void> => {
  const params = DeleteShipmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const deleted = await db
    .delete(shipmentsTable)
    .where(eq(shipmentsTable.id, params.data.id))
    .returning({ id: shipmentsTable.id });
  if (!deleted.length) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/shipments/reset", async (_req, res): Promise<void> => {
  const count = await replaceWithDemoData();
  res.json(ResetDemoDataResponse.parse({ count }));
});

router.get("/shipments/export", async (_req, res): Promise<void> => {
  const rows = await findShipments({});
  const headers = [
    "shipmentDate",
    "customer",
    "country",
    "quantityMt",
    "sellingPriceFob",
    "purchaseCost",
    "freightInsurance",
    "vesselName",
    "product",
    "loadingCompany",
    "loadingPort",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => JSON.stringify(row[header as keyof typeof row] ?? ""))
        .join(","),
    ),
  ].join("\n");
  res.type("text/csv").send(csv);
});

router.post("/shipments/import", async (req, res): Promise<void> => {
  const parsed = ImportShipmentsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = parsed.data.map((row) => ({
    id: crypto.randomUUID(),
    ...row,
    shipmentDate: normalizeShipmentDate(row.shipmentDate)!,
  }));
  if (rows.length) {
    await db.insert(shipmentsTable).values(rows);
  }
  res.json(ImportShipmentsResponse.parse({ count: rows.length }));
});

router.get("/analytics/dashboard", async (req, res): Promise<void> => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(normalizeQuery(req.query));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await findShipments(parsed.data);
  const byCountry = new Map<string, typeof rows>();
  for (const row of rows) {
    const items = byCountry.get(row.country) ?? [];
    items.push(row);
    byCountry.set(row.country, items);
  }
  const countries = [...byCountry.entries()]
    .map(([country, countryRows]) => {
      const byCustomer = new Map<string, typeof countryRows>();
      for (const row of countryRows) {
        const items = byCustomer.get(row.customer) ?? [];
        items.push(row);
        byCustomer.set(row.customer, items);
      }
      return {
        country,
        ...aggregateShipments(countryRows),
        customers: [...byCustomer.entries()]
          .map(([customer, customerRows]) => ({ customer, ...aggregateShipments(customerRows) }))
          .sort((a, b) => b.revenue - a.revenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  res.json(GetDashboardSummaryResponse.parse({ metrics: aggregateShipments(rows), countries }));
});

router.get("/analytics/suppliers", async (_req, res): Promise<void> => {
  const rows = await findShipments({});
  const bySupplier = new Map<string, typeof rows>();
  for (const row of rows) {
    const supplier = row.loadingCompany ?? "Unassigned";
    const items = bySupplier.get(supplier) ?? [];
    items.push(row);
    bySupplier.set(supplier, items);
  }
  const suppliers = [...bySupplier.entries()]
    .map(([loadingCompany, supplierRows]) => {
      const byMarket = new Map<string, typeof supplierRows>();
      for (const row of supplierRows) {
        const items = byMarket.get(row.country) ?? [];
        items.push(row);
        byMarket.set(row.country, items);
      }
      return {
        loadingCompany,
        ...aggregateShipments(supplierRows),
        markets: [...byMarket.entries()]
          .map(([country, marketRows]) => ({ country, ...aggregateShipments(marketRows) }))
          .sort((a, b) => b.revenue - a.revenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  res.json(
    GetSupplierSummaryResponse.parse({
      metrics: aggregateShipments(rows),
      suppliers,
    }),
  );
});

router.get("/metadata", async (_req, res): Promise<void> => {
  const rows = await findShipments({});
  const years = [...new Set(rows.map((row) => Number(row.shipmentDate.slice(0, 4))))].sort((a, b) => b - a);
  res.json(
    GetMetadataResponse.parse({
      customers: uniqueSorted(rows, "customer").length ? uniqueSorted(rows, "customer") : customers,
      countries: uniqueSorted(rows, "country").length ? uniqueSorted(rows, "country") : countries,
      products: uniqueSorted(rows, "product").length ? uniqueSorted(rows, "product") : products,
      loadingCompanies: uniqueSorted(rows, "loadingCompany").length
        ? uniqueSorted(rows, "loadingCompany")
        : loadingCompanies,
      loadingPorts: uniqueSorted(rows, "loadingPort").length ? uniqueSorted(rows, "loadingPort") : loadingPorts,
      years,
    }),
  );
});

export default router;