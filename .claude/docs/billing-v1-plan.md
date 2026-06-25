# BILLING_V1_IMPLEMENTATION_PLAN.md

Implementation plan for a production-ready Billing V1 module.

**Business rules this plan enforces:**
- One billing record per consolidation. Package-level billing is deprecated.
- `system_settings` is the only source of truth for all rate variables.
- Local delivery cost (`costoEnvioCorreos`) is out of scope for this phase.

All sections reference existing file paths and existing patterns so implementation is
unambiguous. No code is included here.

---

## Scope summary

V1 delivers:
1. A working billing list page with real data (replaces the mock)
2. Invoice generation for consolidations without a billing record
3. Payment confirmation (mark as paid)
4. A canonical billing formula that reads live `system_settings`

V1 explicitly excludes:
- `/admin/billing/:id` detail page (detail shown in a modal on the list page)
- `/admin/billing/reports` page
- Payment method tracking beyond `is_paid`
- Local delivery fee (`costoEnvioCorreos`)
- Package-level billing

---

## 1. Database changes

Two changes are required before any application code is written.

---

### 1.1 Rename `profit_per_lb` → `fee_crc` in `system_settings`

**Why:** `profit_per_lb` is the column the settings UI already labels "Fee Lb (CRC)".
Renaming it closes the naming ambiguity across the codebase, and makes it
unambiguous when `generateBilling` reads it.

**SQL to run:**
```sql
ALTER TABLE system_settings
  RENAME COLUMN profit_per_lb TO fee_crc;
```

**Before running:** Confirm the current value of `profit_per_lb` in the production row.
The hardcoded `fee: 1500` in `generateBilling` must match this value, or invoice amounts
will change after migration. If they differ, update the DB value to `1500` in the same
migration.

```sql
UPDATE system_settings
  SET profit_per_lb = 1500
  WHERE id = '00000000-0000-0000-0000-000000000000';
-- Run BEFORE the rename.
```

**Settings history impact:** Existing `settings_history` rows with
`parameter_name = 'Ganancia por Libra'` are not retroactively renamed. New rows written
after this change will use the updated label `'Fee (CRC)'`. This is acceptable.

---

### 1.2 Add UNIQUE constraint on `billing.consolidation_id`

**Why:** Prevents the duplicate invoice bug documented in `BILLING_IMPLEMENTATION_GAP.md:6.2`.
Without this constraint, calling `POST /api/logistics?action=invoice` twice for the same
consolidation creates two billing rows silently.

**SQL to run:**
```sql
ALTER TABLE billing
  ADD CONSTRAINT billing_consolidation_id_unique UNIQUE (consolidation_id);
```

**Before running:** Verify no existing duplicate rows:
```sql
SELECT consolidation_id, COUNT(*) 
FROM billing 
WHERE consolidation_id IS NOT NULL 
GROUP BY consolidation_id 
HAVING COUNT(*) > 1;
```

If duplicates exist, they must be resolved manually before adding the constraint.

---

### 1.3 No other schema changes required

The `billing` table already has the correct snapshot columns (`applied_rate_usd`,
`applied_exchange`, `applied_fee_crc`, `total_weight_charged`, `total_amount_crc`).
The `is_paid` and `paid_at` columns already exist. No new tables are needed for V1.

---

## 2. Type changes

**Files to modify:**

---

### 2.1 `src/types/settings/settings.types.ts`

Rename `profit_per_lb` → `fee_crc` in the `SystemSettings` type.

```
Before: profit_per_lb: number;
After:  fee_crc: number;
```

This is a breaking rename — every file that references `settings.profit_per_lb` must
be updated in the same commit.

**Files that reference `profit_per_lb` (all must be updated):**
- `src/types/settings/settings.types.ts` — the declaration
- `src/shared/api/repositories/settings.repo.ts` — UPDATE column name
- `src/shared/api/services/settings.service.ts` — history label
- `src/components/containers/settings-container/use-settings.ts` — `profitMargin` calc
- `src/components/containers/settings-container/settings-container.tsx` — form key

---

### 2.2 `src/types/logistics/logistics.types.ts`

Add the following new types. Do not modify `Billing` — it is the raw DB shape and is
already correct.

**`BillingListItem`** — shape returned by the paginated billing list query (billing + joined
customer + consolidation fields):

```
uuid: string
consolidation_uuid: string
consolidation_status: ConsolidationStatus
total_amount_crc: number
total_weight_charged: number
applied_rate_usd: number
applied_exchange: number
applied_fee_crc: number
is_paid: boolean
paid_at: Date | null
created_at: Date
customer_first_name: string
customer_last_name: string
customer_code: string
```

**`PendingConsolidation`** — shape for consolidations that have no billing record yet
(used on the "awaiting invoice" section of the billing page):

```
uuid: string
total_weight_lb: number
status: ConsolidationStatus
created_at: Date
customer_first_name: string
customer_last_name: string
customer_code: string
```

**`GenerateInvoiceInput`** — mutation input:

```
consolidationUuid: string
```

**`MarkPaidInput`** — mutation input:

```
billingUuid: string
```

---

## 3. Repository changes

---

### 3.1 `src/shared/api/repositories/settings.repo.ts`

**Change:** Rename `profit_per_lb` → `fee_crc` in the `updateSettings` function's UPDATE
query (line 27).

No other changes to this file.

---

### 3.2 `src/shared/api/repositories/logistics.repo.ts`

**Change 1 — `generateBilling`: replace hardcoded RATES with `system_settings` read.**

The function currently begins with `const RATES = { price_lb: 4.5, exchange: 525, fee: 1500, min_lb: 1 }`.

Required new behavior:
1. Import `getSettings` from `settings.repo.ts` at the top of the file.
2. Inside `generateBilling`, before `BEGIN`, call `getSettings()` to fetch the live row.
3. If the row is null, throw `new Error('No se encontró la configuración de tarifas.')` —
   do NOT fall back to constants.
4. Derive variables: `price_lb = settings.price_per_lb`, `exchange = settings.exchange_rate`,
   `fee = settings.fee_crc`, `min_lb = settings.min_weight`.
5. Move the `getSettings()` call to after `BEGIN` so it participates in the transaction and
   reads a consistent snapshot.

**Change 2 — `generateBilling`: restrict to CONSOLIDATION type only.**

Remove the `PACKAGE` branch. The function signature becomes:

```
generateBilling(consolidationUuid: string): Promise<Partial<Billing>>
```

The `if (type === 'PACKAGE') { ... }` block is removed entirely. The body reads only the
consolidation path. The `type` parameter is removed.

**Change 3 — `generateBilling`: add duplicate invoice check.**

After resolving the consolidation's internal `id`, check for an existing billing row:

```sql
SELECT id FROM billing WHERE consolidation_id = ${cons.id} LIMIT 1
```

If a row is found, throw `new Error('Ya existe una factura para esta consolidación.')`.

This is a defense-in-depth guard alongside the DB UNIQUE constraint from §1.2.

**Change 4 — `generateBilling`: add consolidation status validation.**

After resolving the consolidation, check:
```
if (status NOT IN ('CERRADO', 'DESPACHADO', 'ENTREGADO')) {
  throw new Error('Solo se puede facturar una consolidación en estado CERRADO, DESPACHADO o ENTREGADO.');
}
```

---

### 3.3 New file: `src/shared/api/repositories/billing.repo.ts`

This file contains all read and payment-update queries for the billing module.
It does not contain the billing INSERT — that stays in `logistics.repo.ts`.

**Methods to implement:**

**`getPaginatedBilling(page, limit, isPaid?: boolean | null, search?: string)`**
```
Returns: { data: BillingListItem[], total: number }
```

Query joins `billing` with `consolidations` and `customers`. Only returns rows where
`billing.consolidation_id IS NOT NULL` (consolidation billing only). Filters:
- `isPaid`: if provided, adds `WHERE b.is_paid = ${isPaid}`
- `search`: adds `WHERE (cu.first_name ILIKE ${term} OR cu.customer_code ILIKE ${term})`
- Always `ORDER BY b.created_at DESC LIMIT ${limit} OFFSET ${offset}`

**`getBillingDetail(billingUuid: string)`**
```
Returns: BillingListItem | null
```

Same JOIN as above but `WHERE b.uuid = ${billingUuid}`.

**`getPendingConsolidations()`**
```
Returns: PendingConsolidation[]
```

Returns consolidations with status `CERRADO` or `DESPACHADO` that have no billing row:
```sql
SELECT c.uuid, c.total_weight_lb, c.status, c.created_at,
       cu.first_name, cu.last_name, cu.customer_code
FROM consolidations c
LEFT JOIN customers cu ON c.customer_id = cu.id
LEFT JOIN billing b ON b.consolidation_id = c.id
WHERE b.id IS NULL
  AND c.status IN ('CERRADO', 'DESPACHADO')
ORDER BY c.created_at DESC
```

**`markBillingAsPaid(billingUuid: string)`**
```
Returns: Pick<Billing, 'uuid' | 'is_paid' | 'paid_at'>
```

```sql
UPDATE billing
SET is_paid = true, paid_at = NOW()
WHERE uuid = ${billingUuid} AND is_paid = false
RETURNING uuid, is_paid, paid_at
```

If no rows are returned (billing already paid or not found), throw
`new Error('Factura no encontrada o ya estaba marcada como pagada.')`.

---

## 4. Service changes

---

### 4.1 `src/shared/api/services/settings.service.ts`

**Change:** Update the history label for the renamed field.

Locate the loop in `updateSystemSettings` that calls `logHistory`. The entry for
`profit_per_lb` currently uses the label `'Ganancia por Libra'`. Change it to `'Fee (CRC)'`.
Update the property access from `data.profit_per_lb` / `current.profit_per_lb` to
`data.fee_crc` / `current.fee_crc`.

---

### 4.2 `src/shared/api/services/logistics.service.ts`

**Change — `createInvoice`:** Update the signature and delegate to the new `generateBilling`
signature.

```
Before: createInvoice(uuid: string, type: 'PACKAGE' | 'CONSOLIDATION')
After:  createInvoice(consolidationUuid: string)
```

The method body calls `LogisticsRepository.generateBilling(consolidationUuid)` and wraps
in try/catch with a meaningful error message.

---

### 4.3 New file: `src/shared/api/services/billing.service.ts`

**Methods to implement:**

**`getBillingList(page, limit, isPaid?, search?)`**
Returns `PaginatedResponse<BillingListItem>`. Validates `page ≥ 1`, `limit ≥ 1`.
Delegates to `BillingRepository.getPaginatedBilling`.

**`getBillingDetail(billingUuid)`**
Throws 404 error if not found. Delegates to `BillingRepository.getBillingDetail`.

**`getPendingConsolidations()`**
Delegates to `BillingRepository.getPendingConsolidations`. No additional logic.

**`confirmPayment(billingUuid)`**
Validates `billingUuid` is truthy. Delegates to `BillingRepository.markBillingAsPaid`.
Wraps in try/catch.

---

## 5. API endpoint changes

---

### 5.1 `src/pages/api/logistics/index.tsx` — update `invoice` action

**Change:** In the `case 'invoice':` block, remove the `type` parameter. The body now only
accepts `{ targetUuid }` (rename to `consolidationUuid` for clarity). Pass it directly
to `LogisticsService.createInvoice(consolidationUuid)`.

Return `201` on success, consistent with current behavior.

---

### 5.2 New file: `src/pages/api/billing/index.ts`

Follow the pattern established in `src/pages/api/settings/index.ts` and
`src/pages/api/customers/index.ts` exactly: validate token via `CookiesManager`, dispatch
on method, delegate 100% to service, return consistent JSON shapes.

**Endpoints handled by this file:**

| Method | Query params / body | Action | Success status |
|---|---|---|---|
| `GET` | `?page&limit&isPaid&search` | Paginated billing list | 200 |
| `GET` | `?uuid=...` | Single billing detail | 200 |
| `GET` | `?pending=true` | Consolidations awaiting invoice | 200 |
| `PATCH` | body `{ billingUuid }` | Mark as paid | 200 |

**Method validation:** Return `405` for any method other than `GET` and `PATCH`.

**Query param routing (GET):** Check params in this order:
1. If `uuid` is present → `BillingService.getBillingDetail(uuid)`
2. If `pending === 'true'` → `BillingService.getPendingConsolidations()`
3. Otherwise → `BillingService.getBillingList(page, limit, isPaid, search)`

**isPaid parsing:** `req.query.isPaid` arrives as a string. Parse to boolean:
- `'true'` → `true`, `'false'` → `false`, absent or `'all'` → `undefined` (no filter).

**Error status codes:**
- 400 — validation error (missing param)
- 401 — no token
- 404 — billing record not found
- 500 — unexpected error

---

## 6. React Query hooks

Follow the exact patterns established in:
- `src/shared/api/querys/logistics/find-one-package-query.ts` for query hooks
- `src/shared/api/mutations/logistics/use-add-package-mutation.ts` for mutation hooks

---

### 6.1 New file: `src/shared/api/querys/billing/use-billing-list-query.ts`

```
queryKey: ['billingList', page, limit, isPaid, search]
queryFn: GET /api/billing?page=...&limit=...&isPaid=...&search=...
staleTime: 1000 * 60 * 5
placeholderData: (prev) => prev    ← prevents flicker between pages
```

Exports:
- `fetchGetBillingList(params)` — the raw fetch function
- `useBillingListQuery(params)` — returns `UseAPIQueryHook<PaginatedResponse<BillingListItem>>`

---

### 6.2 New file: `src/shared/api/querys/billing/use-billing-detail-query.ts`

```
queryKey: ['billingDetail', uuid]
queryFn: GET /api/billing?uuid=${uuid}
enabled: !!uuid
staleTime: 1000 * 60 * 5
```

Exports:
- `fetchGetBillingDetail(uuid)` — the raw fetch function
- `useBillingDetailQuery(uuid)` — returns `UseAPIQueryHook<BillingListItem>`

---

### 6.3 New file: `src/shared/api/querys/billing/use-pending-consolidations-query.ts`

```
queryKey: ['pendingConsolidations']
queryFn: GET /api/billing?pending=true
staleTime: 1000 * 60 * 5
```

Exports `usePendingConsolidationsQuery()` — returns `UseAPIQueryHook<PendingConsolidation[]>`.

---

### 6.4 New file: `src/shared/api/mutations/billing/use-generate-invoice-mutation.ts`

```
mutationKey: ['generateInvoice']
mutationFn: POST /api/logistics?action=invoice  body: { consolidationUuid }
onSuccess: invalidate ['billingList'] AND ['pendingConsolidations']
```

Exports `useGenerateInvoiceMutation()`.

---

### 6.5 New file: `src/shared/api/mutations/billing/use-mark-paid-mutation.ts`

```
mutationKey: ['markBillingPaid']
mutationFn: PATCH /api/billing  body: { billingUuid }
onSuccess: invalidate ['billingList', ...] AND ['billingDetail', billingUuid]
```

The `onSuccess` callback receives the mutation variables — use `variables.billingUuid` to
target the specific detail cache key.

Exports `useMarkPaidMutation()`.

---

## 7. Pages and containers

---

### 7.1 Modified file: `src/pages/admin/billing/index.tsx`

**Change:** Remove all mock data constants (`MOCK_BILLING`, `TARIFA_POR_LIBRA`,
`COSTO_POR_LIBRA`). Remove all inline calculation logic. Remove inline auxiliary components
(`MetricCard`, `DetailRow`, `ChevronRightIcon`).

The page becomes a thin shell following the same pattern as
`src/pages/admin/logistics/index.tsx`:

```
authorizeServerSidePage() in getServerSideProps
DashboardLayout with contentStyle={BoxedLayoutStyle.FULL}
Single child: <BillingContainer />
```

---

### 7.2 New file: `src/components/containers/billing/use-billing.ts`

This is the custom hook that `BillingContainer` consumes. It owns all local state and
calls the React Query hooks. It returns a clean object — no raw query results leak out.

**State to manage:**
- `page: number` (default 1)
- `search: string` (debounced at 400ms, resets page to 1 on change — same pattern as
  `use-logistics.tsx`)
- `isPaidFilter: 'all' | 'paid' | 'pending'` (maps to boolean for query)
- `activeTab: 'records' | 'pending'` — switches between billing records and un-invoiced
  consolidations
- `selectedBillingUuid: string | null` — controls the detail modal

**Queries called:**
- `useBillingListQuery` with `{ page, limit: 10, search: debouncedSearch, isPaid }` when
  `activeTab === 'records'`
- `usePendingConsolidationsQuery()` when `activeTab === 'pending'`

**Mutations called:**
- `useGenerateInvoiceMutation` — `handleGenerateInvoice(consolidationUuid)`
- `useMarkPaidMutation` — `handleMarkPaid(billingUuid)`

**Derived values computed in the hook (not in the container):**
- `totalAmountPending: number` — sum of `total_amount_crc` for unpaid records in current
  page (display metric only; a global aggregate requires a separate API endpoint — V1 uses
  the current page's data as an approximation and labels it clearly)
- `paidCount`, `pendingCount` — counts from current page data

**Return shape:**
```
billingList, billingPagination, pendingConsolidations,
isLoadingBilling, isLoadingPending,
page, setPage, search, setSearch, isPaidFilter, setIsPaidFilter,
activeTab, setActiveTab,
selectedBillingUuid, setSelectedBillingUuid,
handleGenerateInvoice, isGenerating,
handleMarkPaid, isMarkingPaid,
totalAmountPending, paidCount, pendingCount
```

---

### 7.3 New file: `src/components/containers/billing/billing-container.tsx`

Container component. Consumes `useBilling()`. Renders:

**Tab bar:** "Registros" (billing records) | "Por Facturar" (pending consolidations).

**"Registros" tab:**
- Metric cards: total amount pending (CRC), paid count, pending count, collection rate.
  These use current-page data — label cards to indicate they reflect the visible records,
  not a global total.
- Filter bar: search input (debounced, same pattern as logistics), paid/pending/all toggle.
- Paginated table with columns: Customer name + code, Consolidation UUID (truncated),
  Weight charged (lb), Total (₡), Status badge (Pagado / Pendiente), Created date, Action.
- Action column: "Marcar como Pagado" button — shown only when `is_paid === false`.
  Calls `handleMarkPaid(row.uuid)`.
- Row click: sets `selectedBillingUuid` to open the detail modal.
- Pagination: same pattern as logistics container.

**"Por Facturar" tab:**
- Table with columns: Customer name + code, Total weight (lb), Consolidation status,
  Created date, Action.
- Action column: "Generar Factura" button per row. Calls `handleGenerateInvoice(row.uuid)`.
  Disabled while `isGenerating`.
- Empty state: "No hay consolidaciones pendientes de facturación."

**Detail modal (rendered conditionally from `selectedBillingUuid`):**
- Triggered by row click in the "Registros" tab.
- Fetches data via `useBillingDetailQuery(selectedBillingUuid).useQuery()`.
- Shows full invoice breakdown: customer, consolidation ref, weight charged, rate, exchange,
  fee, total CRC, payment status, dates.
- "Marcar como Pagado" button — calls `handleMarkPaid` and closes modal on success.
- "Cerrar" button.

---

### 7.4 Settings container fixes (same PR as the rename)

**`src/components/containers/settings-container/use-settings.ts`**

After the `profit_per_lb` → `fee_crc` rename:
- Update the `useState` key from `profit_per_lb` to `fee_crc`.
- Remove the `profitMargin` derived calculation (lines 52–55). The field is now a flat fee,
  not a margin. Displaying `(fee_crc / priceInCRC) × 100` as a percentage is semantically
  wrong after the rename.
- The `priceInCRC` derived value can remain as a useful display metric showing the effective
  CRC charge per pound.

**`src/components/containers/settings-container/settings-container.tsx`**

The UI label for this field is already correct (`'Fee Lb (CRC)'` at line 80). Only the
`key` field needs to change from `'profit_per_lb'` to `'fee_crc'`.

---

### 7.5 Package calculator fix (same PR as the rename)

**`src/components/containers/logistics/use-package-calculator.ts`**

After the rename, `settings.fee_crc` is available. Add the fee to the preview:
- Read `settings.fee_crc` (already returned by `useSettingsQuery`)
- Add it to `cobroTotalCRC`: `cobroTotalCRC = (weight × price × rate) + fee_crc`

This is documented here because it must ship in the same deployment as the DB rename —
leaving `fee_crc` unread in the preview creates a preview/invoice discrepancy for the
duration between deployments.

---

## 8. Implementation order

The steps are ordered by dependency. Each step must be completed and merged before the
next begins. Steps within the same group have no dependency on each other and can be
parallelized.

---

### Phase 1 — Database (prerequisite, done outside application code)

**Step 1.** Confirm current value of `profit_per_lb` in production `system_settings`.
If it differs from `1500`, run the correction UPDATE first.

**Step 2.** Run `ALTER TABLE system_settings RENAME COLUMN profit_per_lb TO fee_crc`.

**Step 3.** Verify no duplicate `billing.consolidation_id` values. Then run
`ALTER TABLE billing ADD CONSTRAINT billing_consolidation_id_unique UNIQUE (consolidation_id)`.

**Gate:** Do not start Phase 2 until the DB is updated. The application code must not be
deployed with the old column name still in the DB.

---

### Phase 2 — Type and settings rename (one atomic commit)

All six files that reference `profit_per_lb` must change in the same commit:

1. `src/types/settings/settings.types.ts` — rename field
2. `src/shared/api/repositories/settings.repo.ts` — rename column in UPDATE query
3. `src/shared/api/services/settings.service.ts` — rename history label
4. `src/components/containers/settings-container/use-settings.ts` — rename key,
   remove `profitMargin` calculation
5. `src/components/containers/settings-container/settings-container.tsx` — rename form key
6. `src/components/containers/logistics/use-package-calculator.ts` — add `fee_crc` to
   preview formula

Run `npm run lint` after this commit. The TypeScript compiler will flag any missed
`profit_per_lb` references.

---

### Phase 3 — Repository layer

These two items are independent and can be worked in parallel:

**Step A:** Update `logistics.repo.ts` — modify `generateBilling` signature
(consolidation-only, reads `system_settings`, adds duplicate check, adds status validation).

**Step B:** Create `billing.repo.ts` with four methods:
`getPaginatedBilling`, `getBillingDetail`, `getPendingConsolidations`, `markBillingAsPaid`.

---

### Phase 4 — Service layer

Depends on Phase 3 completing.

**Step A:** Update `logistics.service.ts` — update `createInvoice` signature.

**Step B:** Create `billing.service.ts` with four methods.

---

### Phase 5 — API handlers

Depends on Phase 4 completing.

**Step A:** Update `src/pages/api/logistics/index.tsx` — remove `type` from `invoice` action.

**Step B:** Create `src/pages/api/billing/index.ts`.

---

### Phase 6 — React Query hooks

Depends on Phase 5 completing (hooks call the API endpoints).

Create all four new files in any order:
- `use-billing-list-query.ts`
- `use-billing-detail-query.ts`
- `use-pending-consolidations-query.ts`
- `use-generate-invoice-mutation.ts`
- `use-mark-paid-mutation.ts`

---

### Phase 7 — UI layer

Depends on Phase 6 completing.

1. Create `use-billing.ts`
2. Create `billing-container.tsx`
3. Replace `src/pages/admin/billing/index.tsx` — remove mock, mount `BillingContainer`

---

### Phase 8 — Verification checklist

Before marking V1 as complete, verify each item manually:

- [ ] Settings page loads and saves without error after the `fee_crc` rename
- [ ] Settings history shows "Fee (CRC)" label for new changes, not "Ganancia por Libra"
- [ ] Package creation preview includes the fee in `cobroTotalCRC`
- [ ] Calling `POST /api/logistics?action=invoice` with a PACKAGE type returns 400/500
      (the service now rejects it)
- [ ] Calling the invoice action twice for the same consolidation returns an error on the
      second call (duplicate guard)
- [ ] Calling the invoice action for a consolidation in `ABIERTO` status returns an error
- [ ] Invoice amounts generated after Phase 2 match the formula:
      `(MAX(weight, min_weight) × price_per_lb × exchange_rate) + fee_crc`
      using current `system_settings` values, not the old hardcoded constants
- [ ] Billing list page loads real records from the DB, no mock data
- [ ] Paid/Pending filter works
- [ ] Search by customer name or customer_code works
- [ ] "Por Facturar" tab shows consolidations awaiting invoicing
- [ ] "Generar Factura" creates a billing record and moves the consolidation off the
      "Por Facturar" list
- [ ] "Marcar como Pagado" sets `is_paid = true` and `paid_at` on the DB row
- [ ] Running "Marcar como Pagado" a second time returns an error (repo guard)
- [ ] `npm run lint` passes with zero errors

---

## 9. Risks and dependencies

---

### Risk 1 — Invoice amount change (HIGH)

**Description:** After removing the hardcoded `RATES` constant and reading from
`system_settings`, every invoice generated after the deployment will use different values
unless the DB row exactly matches the old constants.

Old hardcoded values: `price_lb: 4.5`, `exchange: 525`, `fee: 1500`, `min_lb: 1`.

If `system_settings` has different values for any of these, operators will see invoice
amounts change without explanation.

**Mitigation:**
- Before Phase 2, read the live `system_settings` row and compare against the old constants.
- If they differ, decide with the business which values are correct. Either update the DB
  to match the constants, or accept the change in invoice amounts.
- Document the values at migration time.

---

### Risk 2 — `fee_crc` DB value versus operator-entered value (MEDIUM)

**Description:** The settings UI allowed operators to edit `profit_per_lb` at any time.
If an operator changed it to a value other than `1500`, the actual DB value may not be
`1500`. After the rename + migration, `generateBilling` will use whatever value is in the
DB — which may differ from what operators expect.

**Mitigation:** Same as Risk 1 — compare and confirm before deployment.

---

### Risk 3 — Existing duplicate billing rows (LOW)

**Description:** If any consolidation already has two billing rows (due to the missing
duplicate guard), the `ADD CONSTRAINT ... UNIQUE` migration in §1.2 will fail with a
constraint violation error.

**Mitigation:** Run the duplicate-check SELECT query in §1.2 before running the ALTER.
Resolve any duplicates by hand. This is a one-time operation.

---

### Risk 4 — `createInvoice` signature change breaks the API handler (HIGH if missed)

**Description:** `logistics.service.ts:createInvoice` currently accepts `(uuid, type)`.
After Phase 4A it accepts only `(consolidationUuid)`. The API handler at
`src/pages/api/logistics/index.tsx` reads `type` from the request body and passes it to
the service. If the handler is not updated in the same deployment as the service, calls
with `type: 'PACKAGE'` will hit the handler, which will pass the type to the service and
receive a TypeScript error at runtime.

**Mitigation:** Phase 5A (handler update) must ship in the same deployment as Phase 4A
(service update). They should be in the same PR.

---

### Risk 5 — `use-package-calculator.ts` preview discrepancy window (LOW)

**Description:** There is a window between the DB rename (Phase 1) and the code rename
(Phase 2) during which the application still reads `settings.profit_per_lb` in the
calculator. Since the DB column no longer exists under that name, the query will return
`undefined` for this field. In `use-package-calculator.ts` this means `fee_crc` defaults
to `0` (no fee shown in the preview).

**Mitigation:** Keep Phase 1 (DB) and Phase 2 (code rename) in the same deployment.
Do not run the DB migration while the old code is still live. This is standard
column-rename discipline: rename the code first in a backward-compatible way, or do
the DB and code change atomically.

---

### External dependency — `profit_per_lb` in `settings_history` table

The `settings_history` table stores `parameter_name` as a text label, not a FK. Past
history rows will retain `'Ganancia por Libra'` as the parameter name indefinitely.
This is acceptable — history rows are immutable by design.

---

## File change summary

| File | Action | Phase |
|---|---|---|
| `system_settings` (DB) | Rename column `profit_per_lb` → `fee_crc` | 1 |
| `billing` (DB) | Add UNIQUE on `consolidation_id` | 1 |
| `src/types/settings/settings.types.ts` | Rename field | 2 |
| `src/types/logistics/logistics.types.ts` | Add `BillingListItem`, `PendingConsolidation`, `GenerateInvoiceInput`, `MarkPaidInput` | 2 |
| `src/shared/api/repositories/settings.repo.ts` | Rename column in UPDATE | 2 |
| `src/shared/api/services/settings.service.ts` | Rename history label | 2 |
| `src/components/containers/settings-container/use-settings.ts` | Rename key, remove `profitMargin` | 2 |
| `src/components/containers/settings-container/settings-container.tsx` | Rename form key | 2 |
| `src/components/containers/logistics/use-package-calculator.ts` | Add `fee_crc` to preview | 2 |
| `src/shared/api/repositories/logistics.repo.ts` | Refactor `generateBilling` | 3A |
| `src/shared/api/repositories/billing.repo.ts` | **New** | 3B |
| `src/shared/api/services/logistics.service.ts` | Update `createInvoice` signature | 4A |
| `src/shared/api/services/billing.service.ts` | **New** | 4B |
| `src/pages/api/logistics/index.tsx` | Remove `type` from invoice action | 5A |
| `src/pages/api/billing/index.ts` | **New** | 5B |
| `src/shared/api/querys/billing/use-billing-list-query.ts` | **New** | 6 |
| `src/shared/api/querys/billing/use-billing-detail-query.ts` | **New** | 6 |
| `src/shared/api/querys/billing/use-pending-consolidations-query.ts` | **New** | 6 |
| `src/shared/api/mutations/billing/use-generate-invoice-mutation.ts` | **New** | 6 |
| `src/shared/api/mutations/billing/use-mark-paid-mutation.ts` | **New** | 6 |
| `src/components/containers/billing/use-billing.ts` | **New** | 7 |
| `src/components/containers/billing/billing-container.tsx` | **New** | 7 |
| `src/pages/admin/billing/index.tsx` | Replace mock with container | 7 |

**Total: 9 modified files, 13 new files.**
