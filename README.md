# Meridian Commodities

A demo of an in-house tool for a bulk commodity export department.

Shipment records go into the system, and the app rolls them up into revenue, profit and margin — across the book, by destination market, and by supplier. New shipments are entered by hand from the app itself, and the whole department follows the numbers from their phones.

Web app and React Native mobile app, sharing one API. Synthetic data throughout: company names, vessels and figures are invented.

![Dashboard](screenshots/Screenshot%202026-09-12%20at%2022.42.46.png)

Expanding a destination market breaks it down by customer:

![Country breakdown](screenshots/Screenshot%202026-09-12%20at%2022.43.45.png)

| Shipment register | Trade Summary | Settings |
|---|---|---|
| ![Shipments](screenshots/Screenshot%202026-09-12%20at%2022.44.26.png) | ![Trade Summary](screenshots/Screenshot%202026-09-12%20at%2022.45.16.png) | ![Settings](screenshots/Screenshot%202026-09-12%20at%2022.45.29.png) |

### Mobile

| Sign in | Dashboard | Narrow viewport |
|---|---|---|
| <img src="screenshots/Screenshot%202026-09-11%20at%2004.17.20.png" width="240"> | <img src="screenshots/Screenshot%202026-09-12%20at%2021.48.20.png" width="240"> | <img src="screenshots/meridian-dashboard.jpg" width="240"> |

[Screen recording →](

https://github.com/user-attachments/assets/9f7e72d2-8879-43eb-a361-98f0bcce3671

)

## Screens

- **Dashboard** — revenue, profit, volume and average margin for the filtered period, with an expandable breakdown by country
- **Shipments** — searchable log of every shipment; add, edit, delete
- **Trade Summary** — supplier ranking by revenue, with margin and the markets each supplier serves
- **Settings** — CSV import/export, currency and unit switching, demo data reset

```
revenue = quantity × selling price (FOB)
cost    = quantity × (purchase cost + freight & insurance)
profit  = revenue − cost
margin  = profit / revenue
```

Figures are computed from the shipment record, not entered. Dashboard filters by year, country, product and supplier; every total recalculates against the filtered set.

## Design notes

Phone-first: bottom tabs, full-screen forms, one-thumb reach. Margin badges are colour-coded by threshold, so a weak market reads without checking the figure.

The entry form has an inline calendar, autocomplete on customer, country, product, supplier and port sourced from existing records, and a numeric keypad wherever a number is expected.

## Access model

Clerk handles authentication; every shipment and analytics route sits behind an auth guard, only the health endpoint is public.

Shipment data is shared rather than scoped per user. One person enters shipments and the rest of the department reads the analytics, so splitting rows by user would fragment the dataset everyone needs.

## Stack

| Layer | Choice |
|---|---|
| Web | React 19, TypeScript, Tailwind, shadcn/ui, wouter, TanStack Query |
| Mobile | Expo 57, React Native 0.86, expo-router |
| API | Express 5 |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Clerk |
| Contracts | OpenAPI spec → Orval codegen |
| Tooling | pnpm workspaces, Node.js 24 |

The OpenAPI spec in `lib/api-spec`: React Query hooks and Zod schemas are generated from it and used by both clients.

## Layout

```
artifacts/
  meridian-commodities/   React web client
  meridian-mobile/        Expo client
  api-server/             Express API and auth middleware
lib/
  db/                     Drizzle schema — source of truth for the data model
  api-spec/               OpenAPI spec + Orval config
  api-zod/                Generated Zod schemas
  api-client-react/       Generated React Query hooks
```

## Running locally

Requires Node.js 24, pnpm, PostgreSQL, and a Clerk application.

```bash
pnpm install

export DATABASE_URL="postgresql://user:password@localhost:5432/meridian"
export CLERK_SECRET_KEY="sk_..."
export CLERK_PUBLISHABLE_KEY="pk_..."

pnpm --filter @workspace/db run push             # create tables
pnpm --filter @workspace/api-server run dev      # http://localhost:5000
pnpm --filter @workspace/meridian-mobile run dev # Expo dev server
```

The database seeds with ~640 synthetic shipments across 2023–2026. Customers, suppliers, vessels and ports are invented; margins range from loss-making to strong.
