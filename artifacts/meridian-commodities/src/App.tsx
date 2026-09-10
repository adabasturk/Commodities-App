import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Download,
  LayoutDashboard, Pencil, Plus, Search, Settings, Ship, SlidersHorizontal,
  Trash2, TrendingUp, Upload, X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  getExportShipmentsQueryKey, getGetDashboardSummaryQueryKey, getGetMetadataQueryKey,
  getGetShipmentQueryKey, getGetSupplierSummaryQueryKey, getListShipmentsQueryKey,
  useCreateShipment, useDeleteShipment, useExportShipments, useGetDashboardSummary,
  useGetMetadata, useGetShipment, useGetSupplierSummary, useImportShipments,
  useListShipments, useResetDemoData, useUpdateShipment,
} from '@workspace/api-client-react';
import type { DashboardSummary, Shipment, ShipmentInput, Metrics } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();
function money(value: number | null | undefined, units: 'USD' | 'EUR') {
  const raw = Number.isFinite(Number(value)) ? Number(value) : 0;
  const n = units === 'EUR' ? raw * 0.92 : raw;
  const prefix = units === 'EUR' ? '€' : '$';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${prefix}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${Math.round(abs / 1_000)}K`;
  return `${sign}${prefix}${Math.round(abs)}`;
}
function number(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Number(value) || 0);
}
function volume(value: number | null | undefined, unit: 'MT' | 'kt') {
  const n = Number(value) || 0;
  const converted = unit === 'kt' ? n / 1000 : n;
  if (unit === 'kt') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(converted)} kt`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M MT`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K MT`;
  return `${number(n)} MT`;
}
function pct(value: number | null | undefined) { return `${(Number(value) || 0).toFixed(1)}%`; }
function marginTone(value: number | null | undefined) {
  const n = Number(value) || 0;
  return n < 0 ? 'text-red-400' : n < 12 ? 'text-amber-300' : 'text-emerald-400';
}
function marginBar(value: number | null | undefined) {
  const n = Number(value) || 0;
  return n < 0 ? 'bg-red-400' : n < 12 ? 'bg-amber-300' : 'bg-emerald-400';
}

function ToastNotice({ notice, clear }: { notice: { type: 'success' | 'error'; text: string } | null; clear: () => void }) {
  if (!notice) return null;
  return <div data-testid="status-feedback" className={`fixed left-4 right-4 top-4 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-2xl ${notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-950/95 text-emerald-200' : 'border-red-500/30 bg-red-950/95 text-red-200'}`}>
    {notice.type === 'success' ? <CircleCheck size={17} /> : <CircleAlert size={17} />}<span className="flex-1">{notice.text}</span><button data-testid="button-dismiss-feedback" onClick={clear} className="min-h-8 min-w-8 p-1"><X size={16} /></button>
  </div>;
}

function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton rounded ${className}`} />; }

function MetricCard({ label, value, detail, tone = 'default' }: { label: string; value: string; detail?: string; tone?: 'default' | 'profit' | 'warning' }) {
  return <div data-testid={`card-metric-${label.toLowerCase().replace(/\s/g, '-')}`} className="min-w-0 rounded-lg border border-slate-800/90 bg-[#0e1727] px-4 py-4">
    <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">{label}</span>{detail && <span className="text-[11px] text-slate-500">{detail}</span>}</div>
    <div className={`mt-2 break-words font-mono text-[clamp(1.05rem,5.8vw,1.55rem)] font-semibold leading-tight tracking-tight ${tone === 'profit' ? 'text-emerald-400' : tone === 'warning' ? 'text-amber-300' : 'text-slate-100'}`}>{value}</div>
  </div>;
}

function MetricsGrid({ metrics, units, volumeUnit = 'MT' }: { metrics?: Metrics; units: 'USD' | 'EUR'; volumeUnit?: 'MT' | 'kt' }) {
  return <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
    <MetricCard label="Revenue" value={money(metrics?.revenue, units)} />
    <MetricCard label="Profit" value={money(metrics?.profit, units)} tone={(metrics?.profit || 0) < 0 ? 'warning' : 'profit'} />
    <MetricCard label="Volume" value={volume(metrics?.volumeMt, volumeUnit)} />
    <MetricCard label="Margin" value={pct(metrics?.margin)} tone={(metrics?.margin || 0) < 12 ? 'warning' : 'default'} />
  </div>;
}

function AppShell({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow?: string }) {
  const [location] = useLocation();
  const nav = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, test: 'dashboard' },
    { href: '/shipments', label: 'Shipments', icon: Ship, test: 'shipments' },
    { href: '/summary', label: 'Summary', icon: TrendingUp, test: 'summary' },
    { href: '/settings', label: 'Settings', icon: Settings, test: 'settings' },
  ];
  return <div className="min-h-[100dvh] bg-[#080f1b] text-slate-200">
    <aside className="fixed inset-y-0 left-0 hidden w-[228px] border-r border-slate-800/80 bg-[#091321] px-4 py-5 lg:block">
      <Link href="/" data-testid="link-brand" className="mb-10 flex items-center gap-3 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[#1677d2] text-white shadow-[0_0_24px_rgba(22,119,210,.2)]"><span className="font-mono text-sm font-bold">M</span></span>
        <span><strong className="block text-[13px] tracking-[.16em] text-slate-100">MERIDIAN</strong><span className="text-[10px] uppercase tracking-[.18em] text-slate-500">commodities</span></span>
      </Link>
      <nav className="space-y-1.5">{nav.map(({ href, label, icon: Icon, test }) => <Link key={href} href={href} data-testid={`link-nav-${test}`} className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors ${location === href ? 'bg-blue-500/12 text-blue-300' : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'}`}><Icon size={17} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />}</Link>)}</nav>
      <div className="absolute bottom-6 left-6 right-6 border-t border-slate-800/80 pt-4 text-[11px] text-slate-600"><div className="font-mono">OPS / DESK 04</div><div className="mt-1 text-slate-700">v1.0.0 · Live workspace</div></div>
    </aside>
    <main className="mx-auto min-h-[100dvh] max-w-[1180px] lg:ml-[228px]">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#080f1b]/95 px-4 py-4 backdrop-blur-md md:px-7">
        <div className="flex items-center justify-between">
          <div><div className="mb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-blue-400">{eyebrow || 'Meridian / trade analytics'}</div><h1 data-testid="text-page-title" className="text-[22px] font-semibold tracking-tight text-slate-100">{title}</h1></div>
          <div className="hidden items-center gap-3 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-xs text-slate-500">Data synced</span></div>
          <span className="grid h-11 w-11 place-items-center rounded-md border border-slate-800/70 text-[10px] font-mono text-slate-600 sm:hidden">M04</span>
        </div>
      </header>
      <div className="px-4 pb-28 pt-5 md:px-7 md:pb-10">{children}</div>
    </main>
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/90 bg-[#0a1423]/95 px-2 pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">{nav.map(({ href, label, icon: Icon, test }) => <Link key={href} href={href} data-testid={`link-bottom-${test}`} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${location === href ? 'text-blue-300' : 'text-slate-500'}`}><Icon size={18} /><span>{label}</span></Link>)}</div>
    </nav>
  </div>;
}

function FilterStrip({ values, onChange }: { values: { year?: number; country?: string; product?: string; loadingCompany?: string; from?: string; to?: string }; onChange: (next: typeof values) => void }) {
  const { data: metadata } = useGetMetadata({ query: { queryKey: getGetMetadataQueryKey() } });
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(values).filter(Boolean).length;
  return <div className="mb-5">
    <button data-testid="button-open-filters" onClick={() => setOpen(v => !v)} className="flex min-h-11 w-full items-center gap-2 rounded-md border border-slate-800 bg-[#0e1727] px-3 text-left text-sm text-slate-300 sm:hidden"><SlidersHorizontal size={16} className="text-blue-400" /> Filters {activeCount > 0 && <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-xs text-blue-300">{activeCount}</span>}<ChevronDown size={15} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    <div className={`${open ? 'block' : 'hidden'} mt-2 rounded-lg border border-slate-800 bg-[#0d1726] p-3 sm:mt-0 sm:block sm:border-0 sm:bg-transparent sm:p-0`}><div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {(['year', 'country', 'product', 'loadingCompany'] as const).map(key => <select key={key} data-testid={`select-filter-${key}`} value={values[key] ?? ''} onChange={e => onChange({ ...values, [key]: key === 'year' ? (e.target.value ? Number(e.target.value) : undefined) : (e.target.value || undefined) })} className="min-h-11 flex-1 rounded-md border border-slate-800 bg-[#0e1727] px-3 text-xs text-slate-300 sm:min-w-[140px] sm:flex-none">
        <option value="">{key === 'loadingCompany' ? 'All suppliers' : key === 'country' ? 'All countries' : key === 'product' ? 'All products' : 'All years'}</option>
        {(key === 'year' ? (metadata?.years ?? []) : key === 'country' ? (metadata?.countries ?? []) : key === 'product' ? (metadata?.products ?? []) : (metadata?.loadingCompanies ?? [])).map((item: string | number) => <option key={String(item)} value={String(item)}>{item}</option>)}
      </select>)}
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-slate-800 bg-[#0e1727] px-3 sm:min-w-[150px] sm:flex-none"><span className="text-[10px] uppercase tracking-wide text-slate-600">From</span><input data-testid="input-filter-from" type="date" value={values.from ?? ''} onChange={e => onChange({ ...values, from: e.target.value || undefined })} className="min-w-0 flex-1 bg-transparent text-xs text-slate-300" /></label>
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-slate-800 bg-[#0e1727] px-3 sm:min-w-[150px] sm:flex-none"><span className="text-[10px] uppercase tracking-wide text-slate-600">To</span><input data-testid="input-filter-to" type="date" value={values.to ?? ''} onChange={e => onChange({ ...values, to: e.target.value || undefined })} className="min-w-0 flex-1 bg-transparent text-xs text-slate-300" /></label>
      {activeCount > 0 && <button data-testid="button-clear-filters" onClick={() => onChange({})} className="min-h-11 px-3 text-xs text-slate-500 hover:text-slate-200">Clear filters</button>}
    </div></div>
  </div>;
}

function ActiveFilters({ values, onChange }: { values: { year?: number; country?: string; product?: string; loadingCompany?: string; from?: string; to?: string }; onChange: (next: typeof values) => void }) {
  const entries = Object.entries(values).filter(([, value]) => value);
  if (!entries.length) return null;
  return <div className="mb-5 flex flex-wrap gap-2" aria-label="Active filters">
    {entries.map(([key, value]) => <button key={key} data-testid={`chip-filter-${key}`} onClick={() => onChange({ ...values, [key]: undefined })} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-blue-500/35 bg-blue-500/10 px-3 text-xs text-blue-300">
      <span>{key === 'loadingCompany' ? 'Supplier' : key === 'from' ? 'From' : key === 'to' ? 'To' : key.charAt(0).toUpperCase() + key.slice(1)}: {String(value)}</span><X size={13} />
    </button>)}
  </div>;
}

function Dashboard() {
  const [units, , volumeUnit] = useDisplayUnits();
  const [filters, setFilters] = useState<{ year?: number; country?: string; product?: string; loadingCompany?: string; from?: string; to?: string }>({});
  const params = useMemo(() => ({ ...filters, country: filters.country ? [filters.country] : undefined }), [filters]);
  const { data, isLoading, isError, refetch } = useGetDashboardSummary(params, { query: { queryKey: getGetDashboardSummaryQueryKey(params) } });
  return <AppShell title="Dashboard" eyebrow="Meridian / desk pulse">
    <FilterStrip values={filters} onChange={setFilters} />
    <ActiveFilters values={filters} onChange={setFilters} />
    {isLoading ? <div className="space-y-3"><div className="grid grid-cols-2 gap-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}</div><Skeleton className="h-64" /></div> : isError ? <ErrorState retry={refetch} /> : <DashboardContent data={data} units={units} volumeUnit={volumeUnit} />}
  </AppShell>;
}

function DashboardContent({ data, units, volumeUnit = 'MT' }: { data?: DashboardSummary; units: 'USD' | 'EUR'; volumeUnit?: 'MT' | 'kt' }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const countries = data?.countries ?? [];
  return <div className="animate-rise space-y-6">
    <section><div className="mb-3 flex items-end justify-between"><div><h2 className="text-sm font-medium text-slate-200">Desk performance</h2><p className="mt-1 text-xs text-slate-500">{data?.metrics?.shipmentCount ?? 0} shipments in selected view</p></div><span className="font-mono text-[10px] uppercase tracking-[.15em] text-slate-600">Live</span></div><MetricsGrid metrics={data?.metrics} units={units} volumeUnit={volumeUnit} /></section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium text-slate-200">Destination markets</h2><span className="text-xs text-slate-600">by country</span></div>
      <div className="overflow-hidden rounded-lg border border-slate-800/90 bg-[#0e1727]">{countries.length === 0 ? <EmptyState title="No market data" text="Try clearing the active filters." /> : countries.map((country, i) => <div key={country.country || i} className="border-b border-slate-800/80 last:border-0">
        <button data-testid={`button-expand-country-${country.country}`} onClick={() => setExpanded(expanded === country.country ? null : country.country)} className="flex min-h-[72px] w-full items-center gap-3 px-4 text-left hover:bg-slate-800/30"><span className="w-6 font-mono text-xs text-slate-600">{String(i + 1).padStart(2, '0')}</span><span className="flex-1"><strong className="block text-sm font-medium text-slate-200">{country.country || 'Unknown market'}</strong><span className="text-xs text-slate-500">{country.shipmentCount} shipments · {number(country.volumeMt)} MT</span></span><span className={`text-right font-mono text-sm ${marginTone(country.margin)}`}>{pct(country.margin)}<span className="mt-0.5 block text-[10px] text-slate-500">{money(country.profit, units)} profit</span></span><ChevronDown size={16} className={`text-slate-600 transition-transform ${expanded === country.country ? 'rotate-180' : ''}`} /></button>
        {expanded === country.country && <div className="border-t border-slate-800/70 bg-[#0a1321] px-4 py-3 pl-12">{(country.customers ?? []).map(customer => <div key={customer.customer} data-testid={`row-customer-${customer.customer}`} className="flex items-center gap-3 border-b border-slate-800/60 py-3 last:border-0"><span className="flex-1 text-xs text-slate-300">{customer.customer}</span><span className="font-mono text-xs text-slate-500">{number(customer.volumeMt)} MT</span><span className={`w-14 text-right font-mono text-xs ${marginTone(customer.margin)}`}>{pct(customer.margin)}</span></div>)}</div>}
      </div>)}</div>
    </section>
  </div>;
}

function ErrorState({ retry }: { retry: () => void }) { return <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-8 text-center"><CircleAlert className="mx-auto text-red-400" size={22} /><p className="mt-3 text-sm text-slate-300">Could not load this view.</p><button data-testid="button-retry" onClick={retry} className="mt-4 min-h-11 rounded-md bg-slate-800 px-4 text-xs text-slate-200">Try again</button></div>; }
function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div data-testid="empty-state" className="px-5 py-12 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-slate-700 text-slate-600"><Ship size={17} /></div><p className="mt-3 text-sm font-medium text-slate-300">{title}</p><p className="mt-1 text-xs text-slate-500">{text}</p>{action && <div className="mt-4">{action}</div>}</div>; }

function Shipments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [editing, setEditing] = useState<string | null>(null); const [creating, setCreating] = useState(false); const [deleting, setDeleting] = useState<Shipment | null>(null); const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const params = useMemo(() => ({ page, pageSize: 8, search: search || undefined }), [page, search]);
  const list = useListShipments(params, { query: { queryKey: getListShipmentsQueryKey(params) } });
  const deleteMutation = useDeleteShipment();
  const deleteItem = () => { if (!deleting) return; deleteMutation.mutate({ id: deleting.id }, { onSuccess: () => { setDeleting(null); setNotice({ type: 'success', text: 'Shipment deleted.' }); qc.invalidateQueries({ queryKey: getListShipmentsQueryKey(params) }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); qc.invalidateQueries({ queryKey: getGetSupplierSummaryQueryKey() }); }, onError: () => setNotice({ type: 'error', text: 'Delete failed. Try again.' }) }); };
  return <AppShell title="Shipments" eyebrow="Meridian / shipment register">
    <ToastNotice notice={notice} clear={() => setNotice(null)} />
    <div className="mb-5 flex gap-2"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-3.5 text-slate-600" /><input data-testid="input-search-shipments" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search customer, vessel, port..." className="min-h-11 w-full rounded-md border border-slate-800 bg-[#0e1727] pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600" /></label><button data-testid="button-new-shipment" onClick={() => setCreating(true)} className="grid min-h-11 min-w-11 place-items-center rounded-md bg-blue-500 text-slate-950"><Plus size={19} /></button></div>
    {list.isLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[102px]" />)}</div> : list.isError ? <ErrorState retry={list.refetch} /> : !list.data?.items?.length ? <EmptyState title="No shipments found" text={search ? 'Try a broader search.' : 'Log your first sea shipment to start tracking margin.'} action={<button data-testid="button-empty-new-shipment" onClick={() => setCreating(true)} className="min-h-11 rounded-md bg-blue-500 px-4 text-xs font-semibold text-slate-950">Add shipment</button>} /> : <div className="space-y-2">{list.data.items.map(item => <ShipmentRow key={item.id} item={item} onEdit={() => setEditing(item.id)} onDelete={() => setDeleting(item)} units="USD" />)}</div>}
    {list.data && list.data.total > 0 && <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4"><span className="text-xs text-slate-500">Showing {(list.data.page - 1) * list.data.pageSize + 1}–{Math.min(list.data.page * list.data.pageSize, list.data.total)} of {list.data.total}</span><div className="flex gap-1"><button data-testid="button-prev-page" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="grid h-10 w-10 place-items-center rounded-md border border-slate-800 text-slate-400 disabled:opacity-30"><ChevronLeft size={16} /></button><button data-testid="button-next-page" disabled={!list.data.hasMore} onClick={() => setPage(p => p + 1)} className="grid h-10 w-10 place-items-center rounded-md border border-slate-800 text-slate-400 disabled:opacity-30"><ChevronRight size={16} /></button></div></div>}
    {(creating || editing) && <ShipmentForm shipmentId={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={(msg) => { setNotice({ type: 'success', text: msg }); qc.invalidateQueries({ queryKey: getListShipmentsQueryKey(params) }); }} />}
    {deleting && <ConfirmDialog title="Delete shipment?" text={`${deleting.customer} · ${deleting.vesselName || 'Unnamed vessel'} will be permanently removed.`} confirm={deleteItem} cancel={() => setDeleting(null)} pending={deleteMutation.isPending} />}
  </AppShell>;
}

function ShipmentRow({ item, onEdit, onDelete, units }: { item: Shipment; onEdit: () => void; onDelete: () => void; units: 'USD' | 'EUR' }) {
  return <div data-testid={`row-shipment-${item.id}`} className="group rounded-lg border border-slate-800/90 bg-[#0e1727] p-4 transition-colors hover:border-slate-700">
    <div className="flex items-start gap-3"><div className="flex-1"><div className="flex items-center gap-2"><span className="font-mono text-[11px] text-slate-500">{item.shipmentDate ? new Date(item.shipmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'No date'}</span><span className="h-1 w-1 rounded-full bg-slate-700" /><span className="text-xs text-slate-400">{item.country || 'Unknown market'}</span></div><h3 className="mt-2 text-sm font-medium text-slate-100">{item.customer || 'Unassigned customer'}</h3><p className="mt-1 text-xs text-slate-500">{item.product || 'Bulk fertilizer'} · {item.vesselName || 'Vessel pending'}</p></div><div className="text-right"><div className={`font-mono text-sm font-semibold ${marginTone(item.margin)}`}>{pct(item.margin)}</div><div className={`mt-1 font-mono text-xs ${item.profit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{money(item.profit, units)}</div></div></div>
    <div className="mt-3 flex items-center gap-4 border-t border-slate-800/70 pt-3 text-xs"><span className="font-mono text-slate-400">{number(item.quantityMt)} MT</span><span className="text-slate-600">|</span><span className="text-slate-500">{money(item.revenue, units)} revenue</span><div className="ml-auto flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><button data-testid={`button-edit-shipment-${item.id}`} onClick={onEdit} className="grid h-9 w-9 place-items-center rounded text-slate-500 hover:bg-slate-800 hover:text-blue-300"><Pencil size={14} /></button><button data-testid={`button-delete-shipment-${item.id}`} onClick={onDelete} className="grid h-9 w-9 place-items-center rounded text-slate-500 hover:bg-red-950 hover:text-red-300"><Trash2 size={14} /></button></div></div>
  </div>;
}

function useDisplayUnits(): ['USD' | 'EUR', (v: 'USD' | 'EUR') => void, 'MT' | 'kt', (v: 'MT' | 'kt') => void] {
  const [units, setUnits] = useState<'USD' | 'EUR'>(() => (localStorage.getItem('meridian-units') as 'USD' | 'EUR') || 'USD');
  const [volumeUnit, setVolumeUnit] = useState<'MT' | 'kt'>(() => (localStorage.getItem('meridian-volume') as 'MT' | 'kt') || 'MT');
  const set = (v: 'USD' | 'EUR') => { setUnits(v); localStorage.setItem('meridian-units', v); };
  const setVolume = (v: 'MT' | 'kt') => { setVolumeUnit(v); localStorage.setItem('meridian-volume', v); window.dispatchEvent(new Event('meridian-display-change')); };
  useEffect(() => {
    const sync = () => {
      setUnits((localStorage.getItem('meridian-units') as 'USD' | 'EUR') || 'USD');
      setVolumeUnit((localStorage.getItem('meridian-volume') as 'MT' | 'kt') || 'MT');
    };
    window.addEventListener('meridian-display-change', sync);
    return () => window.removeEventListener('meridian-display-change', sync);
  }, []);
  return [units, set, volumeUnit, setVolume];
}

const emptyForm: ShipmentInput = { shipmentDate: new Date().toISOString().slice(0, 10), customer: '', country: '', quantityMt: 0, sellingPriceFob: 0, purchaseCost: 0, freightInsurance: 0, vesselName: '', product: '', loadingCompany: '', loadingPort: '' };
function ShipmentForm({ shipmentId, onClose, onSaved }: { shipmentId: string | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const qc = useQueryClient(); const { data: existing, isLoading } = useGetShipment(shipmentId || '', { query: { enabled: !!shipmentId, queryKey: getGetShipmentQueryKey(shipmentId || '') } }); const { data: metadata } = useGetMetadata({ query: { queryKey: getGetMetadataQueryKey() } });
  const [form, setForm] = useState<ShipmentInput>(emptyForm); const [suggest, setSuggest] = useState<keyof ShipmentInput | null>(null); const [formError, setFormError] = useState('');
  useEffect(() => { if (existing) setForm({ shipmentDate: existing.shipmentDate?.slice(0, 10) || '', customer: existing.customer, country: existing.country, quantityMt: existing.quantityMt, sellingPriceFob: existing.sellingPriceFob, purchaseCost: existing.purchaseCost, freightInsurance: existing.freightInsurance, vesselName: existing.vesselName || '', product: existing.product || '', loadingCompany: existing.loadingCompany || '', loadingPort: existing.loadingPort || '' }); }, [existing]);
  const create = useCreateShipment(); const update = useUpdateShipment();
  const pending = create.isPending || update.isPending;
  const submit = (e: React.FormEvent) => { e.preventDefault(); setFormError(''); if (!form.customer || !form.country || !form.shipmentDate || form.quantityMt < 0) { setFormError('Complete the required fields before saving.'); return; } const done = () => { qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); qc.invalidateQueries({ queryKey: getGetSupplierSummaryQueryKey() }); onSaved(shipmentId ? 'Shipment updated.' : 'Shipment created.'); onClose(); }; const failed = () => setFormError('Could not save this shipment. Check the values and try again.'); if (shipmentId) update.mutate({ id: shipmentId, data: form }, { onSuccess: done, onError: failed }); else create.mutate({ data: form }, { onSuccess: done, onError: failed }); };
  const options: Record<string, string[]> = { customer: metadata?.customers ?? [], country: metadata?.countries ?? [], product: metadata?.products ?? [], loadingCompany: metadata?.loadingCompanies ?? [], loadingPort: metadata?.loadingPorts ?? [] };
  const fields: { key: keyof ShipmentInput; label: string; type?: string; required?: boolean }[] = [{ key: 'shipmentDate', label: 'Shipment date', type: 'date', required: true }, { key: 'customer', label: 'Customer', required: true }, { key: 'country', label: 'Destination country', required: true }, { key: 'quantityMt', label: 'Quantity (MT)', type: 'number', required: true }, { key: 'sellingPriceFob', label: 'Selling price FOB', type: 'number' }, { key: 'purchaseCost', label: 'Purchase cost', type: 'number' }, { key: 'freightInsurance', label: 'Freight & insurance', type: 'number' }, { key: 'vesselName', label: 'Vessel name' }, { key: 'product', label: 'Product' }, { key: 'loadingCompany', label: 'Loading company' }, { key: 'loadingPort', label: 'Loading port' }];
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#080f1b]"><div className="mx-auto min-h-[100dvh] max-w-xl px-4 pb-10"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#080f1b]/95 py-4 backdrop-blur"><div><div className="text-[10px] uppercase tracking-[.16em] text-blue-400">{shipmentId ? 'Edit record' : 'New record'}</div><h2 className="mt-1 text-lg font-semibold">{shipmentId ? 'Update shipment' : 'Log shipment'}</h2></div><button data-testid="button-close-shipment-form" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-md text-slate-500"><X size={20} /></button></div>
    {isLoading ? <div className="space-y-3 pt-6"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : <form onSubmit={submit} className="space-y-4 pt-5"><div className="mb-5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-5 text-slate-400">Required fields anchor the margin model. Costs can be zero where the desk has not confirmed the invoice.</div>{fields.map(({ key, label, type = 'text', required }) => <label key={key} className="relative block"><span className="mb-1.5 block text-xs font-medium text-slate-400">{label}{required && <b className="ml-1 text-blue-400">*</b>}</span><input data-testid={`input-shipment-${key}`} required={required} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.01' : undefined} value={String(form[key] ?? '')} onFocus={() => options[key] && setSuggest(key)} onBlur={() => setTimeout(() => setSuggest(null), 150)} onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} className="min-h-12 w-full rounded-md border border-slate-800 bg-[#0e1727] px-3 text-sm text-slate-100 placeholder:text-slate-700" />{suggest === key && options[key]?.length > 0 && <div className="absolute left-0 right-0 top-[74px] z-10 max-h-36 overflow-auto rounded-md border border-slate-700 bg-[#142238] p-1 shadow-xl">{options[key].filter(x => x.toLowerCase().includes(String(form[key] || '').toLowerCase())).slice(0, 6).map(x => <button type="button" key={x} data-testid={`suggestion-${key}-${x}`} onMouseDown={() => { setForm({ ...form, [key]: x }); setSuggest(null); }} className="block min-h-10 w-full rounded px-3 text-left text-sm text-slate-300 hover:bg-slate-700/70">{x}</button>)}</div>}</label>)}{formError && <div data-testid="status-form-error" className="flex items-center gap-2 rounded-md border border-red-500/25 bg-red-950/20 px-3 py-3 text-xs text-red-300"><CircleAlert size={15} />{formError}</div>}<div className="flex gap-2 border-t border-slate-800 pt-5"><button type="button" data-testid="button-cancel-shipment-form" onClick={onClose} className="min-h-12 flex-1 rounded-md border border-slate-700 text-sm text-slate-300">Cancel</button><button type="submit" data-testid="button-save-shipment" disabled={pending} className="min-h-12 flex-1 rounded-md bg-blue-500 text-sm font-semibold text-slate-950 disabled:opacity-60">{pending ? 'Saving...' : shipmentId ? 'Save changes' : 'Create shipment'}</button></div></form>}</div></div>;
}

function ConfirmDialog({ title, text, confirm, cancel, pending }: { title: string; text: string; confirm: () => void; cancel: () => void; pending?: boolean }) { return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#050b14]/80 px-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-lg border border-slate-700 bg-[#101c2e] p-5 shadow-2xl"><CircleAlert size={22} className="text-amber-300" /><h2 className="mt-4 text-base font-semibold">{title}</h2><p className="mt-2 text-sm leading-5 text-slate-400">{text}</p><div className="mt-6 flex gap-2"><button data-testid="button-cancel-confirm" onClick={cancel} className="min-h-11 flex-1 rounded-md border border-slate-700 text-sm">Cancel</button><button data-testid="button-confirm-destructive" onClick={confirm} disabled={pending} className="min-h-11 flex-1 rounded-md bg-red-500/90 text-sm font-semibold text-white">{pending ? 'Working...' : 'Delete'}</button></div></div></div>; }

function Summary() {
  const [units, , volumeUnit] = useDisplayUnits(); const { data, isLoading, isError, refetch } = useGetSupplierSummary({ query: { queryKey: getGetSupplierSummaryQueryKey() } }); const [expanded, setExpanded] = useState<string | null>(null);
  return <AppShell title="Trade Summary" eyebrow="Meridian / counterparties">{isLoading ? <div className="space-y-3"><div className="grid grid-cols-2 gap-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-72" /></div> : isError ? <ErrorState retry={refetch} /> : <div className="animate-rise space-y-6"><MetricsGrid metrics={data?.metrics} units={units} volumeUnit={volumeUnit} /><div><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium">Supplier Summary</h2><span className="text-xs text-slate-600">all-time</span></div><div className="overflow-hidden rounded-lg border border-slate-800/90 bg-[#0e1727]">{(data?.suppliers ?? []).length === 0 ? <EmptyState title="No supplier history" text="Supplier performance will appear after shipments are logged." /> : (data?.suppliers ?? []).map((supplier, i) => <div key={supplier.loadingCompany || i} className="border-b border-slate-800/80 last:border-0"><button data-testid={`button-expand-supplier-${supplier.loadingCompany}`} onClick={() => setExpanded(expanded === supplier.loadingCompany ? null : supplier.loadingCompany)} className="flex min-h-[76px] w-full items-center gap-3 px-4 text-left hover:bg-slate-800/30"><span className="w-6 font-mono text-xs text-slate-600">{String(i + 1).padStart(2, '0')}</span><span className="flex-1"><strong className="block text-sm font-medium text-slate-200">{supplier.loadingCompany || 'Unspecified supplier'}</strong><span className="text-xs text-slate-500">{supplier.shipmentCount} shipments · {volume(supplier.volumeMt, volumeUnit)} · {supplier.shipmentCount} shipments</span></span><span className="text-right"><span className={`block font-mono text-sm ${marginTone(supplier.margin)}`}>{pct(supplier.margin)}</span><span className="mt-1 block font-mono text-xs text-emerald-400">{money(supplier.profit, units)}</span></span><ChevronDown size={16} className={`text-slate-600 transition-transform ${expanded === supplier.loadingCompany ? 'rotate-180' : ''}`} /></button>{expanded === supplier.loadingCompany && <div className="border-t border-slate-800/70 bg-[#0a1321] px-4 py-2 pl-12">{(supplier.markets ?? []).map(market => <div key={market.country} className="flex items-center gap-3 border-b border-slate-800/60 py-3 last:border-0"><span className="flex-1 text-xs text-slate-300">{market.country || 'Unknown market'}</span><span className="font-mono text-xs text-slate-500">{volume(market.volumeMt, volumeUnit)}</span><span className={`w-14 text-right font-mono text-xs ${marginTone(market.margin)}`}>{pct(market.margin)}</span></div>)}</div>}</div>)}</div></div></div>}</AppShell>;
}

function SettingsPage() {
  const qc = useQueryClient(); const [units, setUnits, volumeUnit, setVolumeUnit] = useDisplayUnits(); const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null); const [confirm, setConfirm] = useState(false); const fileRef = useRef<HTMLInputElement>(null);
  const exportQuery = useExportShipments({ query: { enabled: false, queryKey: getExportShipmentsQueryKey() } }); const reset = useResetDemoData(); const imp = useImportShipments();
  const exportCsv = async () => { const res = await exportQuery.refetch(); if (res.data) { const blob = new Blob([res.data], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'meridian-shipments.csv'; a.click(); URL.revokeObjectURL(url); setNotice({ type: 'success', text: 'CSV export downloaded.' }); } };
  const importCsv = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { const text = String(reader.result || ''); const [header, ...rows] = text.trim().split(/\r?\n/); const keys = header.split(',').map(x => x.trim()); const data = rows.filter(Boolean).map(row => { const vals = row.split(','); const raw: Record<string, string> = {}; keys.forEach((k, i) => { raw[k] = vals[i] || ''; }); return { shipmentDate: raw.shipmentDate || raw['Shipment Date'], customer: raw.customer || raw.Customer, country: raw.country || raw.Country, quantityMt: Number(raw.quantityMt || raw.Quantity || 0), sellingPriceFob: Number(raw.sellingPriceFob || 0), purchaseCost: Number(raw.purchaseCost || 0), freightInsurance: Number(raw.freightInsurance || 0), vesselName: raw.vesselName || '', product: raw.product || '', loadingCompany: raw.loadingCompany || '', loadingPort: raw.loadingPort || '' }; }); imp.mutate({ data }, { onSuccess: result => { setNotice({ type: 'success', text: `${result.count} shipments imported.` }); qc.invalidateQueries(); }, onError: () => setNotice({ type: 'error', text: 'Import failed. Check the CSV columns.' }) }); }; reader.readAsText(file); };
  const resetDemo = () => reset.mutate(undefined, { onSuccess: result => { setConfirm(false); setNotice({ type: 'success', text: `${result.count} demo shipments restored.` }); qc.invalidateQueries(); }, onError: () => setNotice({ type: 'error', text: 'Reset failed. Try again.' }) });
  return <AppShell title="Settings" eyebrow="Meridian / workspace"><ToastNotice notice={notice} clear={() => setNotice(null)} /><div className="mx-auto max-w-2xl space-y-5 animate-rise">
    <section className="rounded-lg border border-slate-800/90 bg-[#0e1727]"><div className="border-b border-slate-800/80 px-4 py-4"><h2 className="text-sm font-medium">Data operations</h2><p className="mt-1 text-xs text-slate-500">Move the desk register between workspaces.</p></div><div className="divide-y divide-slate-800/80"><button data-testid="button-export-csv" disabled={exportQuery.isFetching} onClick={exportCsv} className="flex min-h-[70px] w-full items-center gap-3 px-4 text-left hover:bg-slate-800/30"><Download size={18} className="text-blue-400" /><span className="flex-1"><strong className="block text-sm font-medium">Export shipments</strong><span className="text-xs text-slate-500">Download the full register as CSV</span></span><span className="text-xs text-slate-600">{exportQuery.isFetching ? 'Preparing...' : 'CSV'}</span></button><button data-testid="button-import-csv" onClick={() => fileRef.current?.click()} className="flex min-h-[70px] w-full items-center gap-3 px-4 text-left hover:bg-slate-800/30"><Upload size={18} className="text-blue-400" /><span className="flex-1"><strong className="block text-sm font-medium">Import shipments</strong><span className="text-xs text-slate-500">Upload a compatible CSV register</span></span><span className="text-xs text-slate-600">{imp.isPending ? 'Importing...' : 'CSV'}</span></button><input ref={fileRef} data-testid="input-import-csv" type="file" accept=".csv,text/csv" className="hidden" onChange={e => importCsv(e.target.files?.[0])} /></div></section>
    <section className="rounded-lg border border-slate-800/90 bg-[#0e1727]"><div className="border-b border-slate-800/80 px-4 py-4"><h2 className="text-sm font-medium">Display units</h2><p className="mt-1 text-xs text-slate-500">Currency and volume formatting for the desk interface.</p></div><div className="grid gap-4 p-4 sm:grid-cols-2"><div><span className="mb-2 block text-[10px] uppercase tracking-[.14em] text-slate-600">Currency</span><div className="flex gap-2">{(['USD', 'EUR'] as const).map(unit => <button key={unit} data-testid={`button-unit-${unit}`} onClick={() => setUnits(unit)} className={`min-h-11 flex-1 rounded-md border text-sm font-medium ${units === unit ? 'border-blue-400 bg-blue-500/12 text-blue-300' : 'border-slate-700 text-slate-500'}`}>{unit}</button>)}</div></div><div><span className="mb-2 block text-[10px] uppercase tracking-[.14em] text-slate-600">Volume</span><div className="flex gap-2">{(['MT', 'kt'] as const).map(unit => <button key={unit} data-testid={`button-volume-${unit}`} onClick={() => setVolumeUnit(unit)} className={`min-h-11 flex-1 rounded-md border text-sm font-medium ${volumeUnit === unit ? 'border-blue-400 bg-blue-500/12 text-blue-300' : 'border-slate-700 text-slate-500'}`}>{unit}</button>)}</div></div></div></section>
    <section className="rounded-lg border border-red-500/20 bg-red-950/10"><div className="px-4 py-4"><h2 className="text-sm font-medium text-red-200">Reset demo data</h2><p className="mt-1 text-xs leading-5 text-slate-500">Replace the current register with the original sample desk data. This cannot be undone.</p><button data-testid="button-reset-demo" onClick={() => setConfirm(true)} className="mt-4 min-h-11 rounded-md border border-red-500/30 px-4 text-xs font-medium text-red-300 hover:bg-red-500/10">Reset register</button></div></section>
    <section className="rounded-lg border border-slate-800/90 bg-[#0e1727] p-4"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-md bg-blue-500/10 text-blue-300"><span className="font-mono text-sm font-bold">M</span></div><div><h2 className="text-sm font-medium">About Meridian</h2><p className="mt-2 text-xs leading-5 text-slate-500">A focused operating surface for bulk fertilizer export desks. Track landed economics from loading port to destination market.</p><p className="mt-3 font-mono text-[10px] uppercase tracking-[.14em] text-slate-700">Internal tool · desk 04 · 1.0.0</p></div></div></section>
  </div>{confirm && <ConfirmDialog title="Reset demo data?" text="Your current shipment register will be replaced with the demo dataset." confirm={resetDemo} cancel={() => setConfirm(false)} pending={reset.isPending} />}</AppShell>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Dashboard} /><Route path="/shipments" component={Shipments} /><Route path="/summary" component={Summary} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);
  if (splash) return <div className="grid min-h-[100dvh] place-items-center bg-[#080f1b] px-6"><div className="w-full max-w-md rounded-2xl border border-blue-500/20 bg-blue-500/[.07] px-8 py-12 text-center shadow-[0_0_80px_rgba(40,125,246,.12)]"><div className="font-mono text-[clamp(1.25rem,6vw,2rem)] font-semibold tracking-[.18em] text-blue-300">MERIDIAN</div><div className="mt-2 text-[10px] uppercase tracking-[.34em] text-blue-400/70">Commodities</div></div></div>;
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></QueryClientProvider>;
}

export default App;