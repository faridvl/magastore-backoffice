# Billing Page Assessment
Reviewed: 2026-06-24

Analysis of `src/pages/admin/billing/index.tsx` against `billing-v1-plan.md`.

---

## What already exists in the page

The billing page is a **single 217-line file** with UI, logic, inline subcomponents, and mock data all together.
No container, no hook, no API calls.

### UI that exists and is reusable

| UI Element | In current page | Maps to plan |
|---|---|---|
| Search input (by client name) | ✅ | ✅ `search` filter in `use-billing.ts` |
| Paid / Pending / All filter toggle | ✅ | ✅ `isPaidFilter` in `use-billing.ts` |
| Time period filter (week/month/all) | ✅ | ➕ Not in plan — keep it, it's useful |
| Metric cards (Total, Ganancia, Eficiencia) | ✅ `MetricCard` inline component | ✅ Plan has metric cards |
| Table (client, weight, total, status badge) | ✅ | ✅ Plan's `BillingListItem` table |
| Row click → detail modal (overlay) | ✅ | ✅ Plan's "detail modal" |
| "Cobrar Ahora" button in modal | ✅ (no onClick) | ✅ = "Marcar como Pagado" in plan |
| "Cerrar" button | ✅ | ✅ |

### What's missing vs the plan

| Missing | Plan reference |
|---|---|
| `getServerSideProps` + `authorizeServerSidePage()` | Required by every admin page |
| Container pattern (`billing-container.tsx` + `use-billing.ts`) | §7.2, §7.3 of plan |
| "Por Facturar" tab (consolidations awaiting invoice) | §7.3 — separate tab |
| Pagination | Plan uses `page`, `limit`, `placeholderData` |
| Real API calls (currently MOCK_BILLING) | All phases 3–6 of plan |
| CRC amounts (current page shows USD `$`) | Plan stores/shows `total_amount_crc` in ₡ |
| customer_code column in table | Plan shows customer name + code |
| Consolidation UUID in table | Plan shows truncated consolidation ref |
| Rate/fee/exchange breakdown in modal detail | Plan shows full invoice breakdown |

---

## Gap: the current page shows USD, the DB stores CRC

The billing page displays `$5.00/lb` and calculates totals in USD. The actual `billing` table stores `total_amount_crc` in Costa Rican colones (₡). The plan correctly uses CRC — the page needs to switch.

Metric cards also need updating: "Ganancia Estimada" uses a hardcoded `COSTO_POR_LIBRA = 2.50` that has no basis in the current rate structure.

---

## Reuse verdict

| Component | Action |
|---|---|
| `MetricCard` inline component | Extract to billing container file or promote to common |
| `DetailRow` inline component | Same |
| `ChevronRightIcon` | Remove — use Lucide icon |
| Filter bar (search + paid/all/pending toggle + timeRange) | Move logic to `use-billing.ts`, keep JSX in container |
| Table JSX | Adapt columns (add customer_code, consolidation ref; change $ to ₡); keep structure |
| Modal JSX | Adapt content (add rate breakdown); keep overlay structure |
| `filteredData` useMemo | Replace with `useBillingListQuery` — server-side filtering |
| `totalWeight`, `totalRevenue`, `netProfit` | Replace with DB-derived totals |

**Bottom line: the page UI is ~65% of what we need. We adapt it, not replace it.**

---

## Adjusted implementation order (from original plan)

The original plan assumed building the UI from scratch. Given the existing page, the order shifts slightly:

### Phase 1 — DB migrations (ready to run, 0 blocking rows)
```sql
-- Both safe: 0 billing rows, 0 consolidation rows
ALTER TABLE system_settings RENAME COLUMN profit_per_lb TO fee_crc;
ALTER TABLE billing ADD CONSTRAINT billing_consolidation_id_unique UNIQUE (consolidation_id);
```

### Phase 2 — Type rename (6 files, one commit)
Same as plan. All 6 files referencing `profit_per_lb` change atomically.

### Phase 3 — Backend (repos, services, API)
Same as plan (phases 3A, 3B, 4A, 4B, 5A, 5B). Nothing changes here.

### Phase 4 — React Query hooks
Same as plan (phase 6 of original). 5 new files.

### Phase 5 — UI refactor (replaces plan's phase 7)

Instead of building from scratch:

1. **`pages/admin/billing/index.tsx`** — add `getServerSideProps`, strip to thin shell, mount `<BillingContainer />`
2. **`containers/billing/billing-container.tsx`** — move JSX from current page, adapt columns/currency, add "Por Facturar" tab
3. **`containers/billing/use-billing.ts`** — extract filter state, connect real hooks
4. Keep `MetricCard`, `DetailRow` as local components inside the container file (they're small and billing-specific)

---

## Real rates to use after Phase 1

Once `generateBilling` reads from `system_settings`, invoices will use:

| Rate | DB value (2026-06-24) |
|---|---|
| price_per_lb | $6.00/lb |
| exchange_rate | ₡480/USD |
| fee_crc | ₡2,900 flat |
| min_weight | 1 lb |

**Example — 5 lb package:**
`MAX(5, 1) × 6 × 480 + 2,900 = ₡17,300`

vs the old hardcoded formula: `5 × 4.5 × 525 + 1,500 = ₡13,312`

This is a **30% increase** compared to what the hardcoded code would have charged. Confirm with operator before deploying Phase 1.

---

## What we can start immediately (no DB migration needed)

These can be done while waiting for DB migration approval:

1. **Add `getServerSideProps`** to `billing/index.tsx` — zero risk, just adds auth
2. **Extract container + hook** from the existing page — pure refactor, no behavior change
3. **Create `billing.repo.ts`** (read-only methods: list, detail, pending consolidations) — doesn't touch `generateBilling`
4. **Create `billing.service.ts`** and `GET /api/billing` — read-only endpoint, safe
5. **Create query hooks** (`use-billing-list-query.ts`, etc.) — front-end only

The only thing that **requires** the DB migration is connecting `generateBilling` to `system_settings` (Phase 3A). Everything else can be built and merged independently.
