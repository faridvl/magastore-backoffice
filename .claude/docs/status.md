# Project Status — Magastore Backoffice
Last reviewed: 2026-06-24

This is the master status document. Update it whenever a feature moves from one state to another.
Detailed analysis docs live alongside this file in `.claude/docs/`.

---

## Feature Status

### ✅ Implemented & Working

| Feature | Key Files | Notes |
|---|---|---|
| Auth (login / JWT) | `auth.service.ts`, `pages/api/auth/login.ts`, `hocs/auth.tsx` | 12h JWT, bcrypt, ADMIN role only |
| Customer list | `customers-container.tsx`, `use-customers.ts`, `querys/customers/use-customers-query.ts` | Paginated, search |
| Customer create | `create-customer-container.tsx`, `mutations/use-create-customer-mutation.ts` | Atomic CTE insert with addresses |
| Customer detail | `pages/admin/customers/[id]/index.tsx` | Read-only |
| Package list (logistics) | `logistics-container.tsx`, `use-logistics.tsx`, `querys/logistics/use-logistics-query.ts` | Paginated, status filter, search |
| Package create | `create-package-container.tsx`, `use-package-calculator.ts` | Preview via `system_settings` (missing fee) |
| Package status update | `logistics.service.ts:updatePackageStatus` | No state-machine enforcement — any → any |
| Package consolidation | `logistics.service.ts:processConsolidation` | Transactional, weight recalculated |
| Settings view / edit | `settings-container.tsx`, `use-settings.ts`, `settings.service.ts` | Singleton row, field-level history audit |
| Invoice generation (API only) | `pages/api/logistics/index.tsx`, `logistics.service.ts:createInvoice` | No UI trigger; hardcoded RATES |

---

### 🔄 In Progress (Uncommitted on `main`)

These files appear in `git status` as new or modified. They belong to the "package detail view" feature.

| File | Type | What it does |
|---|---|---|
| `containers/logistics/logistics-view-detail/logistics-view-detail.tsx` | New | Package detail container component |
| `containers/logistics/logistics-view-detail/use-logistics-detail.ts` | New | Hook — **financial panel uses hardcoded rates (tarifaXLibre: 6, tipoCambio: 540, fee: 2500)** |
| `querys/logistics/find-one-package-query.ts` | New | Fetches single package by UUID |
| `querys/use-api-query-hook.ts` | New | Generic `useApiQuery` wrapper |
| `shared/api/query-hooks/use-api-client-query.ts` | New | Another query client hook |
| `mutations/logistics/use-add-package-mutation.ts` | New | Add package mutation |
| `shared/errors/error-code.ts`, `fetch-error.ts` | New | Typed error classes |
| `types/logistics/logistics.types.ts` | Modified | New types added |
| `containers/logistics/use-package-calculator.ts` | Modified | |
| `containers/logistics/logistics-container/*.tsx` | Modified | |
| `containers/logistics/create-package-container.tsx` | Modified | |
| `pages/admin/logistics/[id]/index.tsx` | Modified | Now mounts `PackageDetailContainer` |

**Known issue in current work:** `use-logistics-detail.ts` financial panel is disconnected from real data. Customer name not returned by `GET /logistics?uuid=...` — shows placeholder "Cliente del Sistema".

---

### 📋 Pending — Billing V1

Full plan: `.claude/docs/billing-v1-plan.md` | Gap analysis: `.claude/docs/billing-gap.md` | Rate audit: `.claude/docs/billing-rules.md`

**Critical path (must be done in order):**

```
Phase 1 (DB, manual) → Phase 2 (type rename) → Phase 3 (repos) → Phase 4 (services)
→ Phase 5 (API handlers) → Phase 6 (React Query hooks) → Phase 7 (UI)
```

| Phase | Description | Files | Status |
|---|---|---|---|
| 1 — DB | Rename `profit_per_lb → fee_crc`; add UNIQUE on `billing.consolidation_id` | DB migration | ❌ Not done |
| 2 — Types | Rename field in 6 files atomically; add `BillingListItem`, `PendingConsolidation` types | 6 modified | ❌ Not done |
| 3A — Repo | Refactor `generateBilling` (read system_settings, consolidation-only, add guards) | `logistics.repo.ts` | ❌ Not done |
| 3B — Repo | Create `billing.repo.ts` (4 methods: list, detail, pending consolidations, mark paid) | New file | ❌ Not done |
| 4A — Service | Update `createInvoice` signature (remove `type` param) | `logistics.service.ts` | ❌ Not done |
| 4B — Service | Create `billing.service.ts` (4 methods) | New file | ❌ Not done |
| 5A — API | Update `invoice` action in `/api/logistics` | `pages/api/logistics/index.tsx` | ❌ Not done |
| 5B — API | Create `GET+PATCH /api/billing` | New file | ❌ Not done |
| 6 — Hooks | 5 new React Query hooks (billing list, detail, pending, generate, mark paid) | 5 new files | ❌ Not done |
| 7 — UI | `use-billing.ts`, `billing-container.tsx`, replace mock billing page | 3 files | ❌ Not done |

---

### ❌ Mocked / Not Implemented

| Page / Feature | File | Reality |
|---|---|---|
| Billing list page | `pages/admin/billing/index.tsx` | Hardcoded `MOCK_BILLING` array of 4 entries |
| Packages page | `pages/admin/packages/index.tsx` | `setTimeout` + mock results |
| Public tracking page | `pages/tracking/index.tsx` | `MOCK_PACKAGE_RESULT` — not real DB |
| Package events write | — | `package_events` table has SELECT but no INSERT anywhere |
| Payment confirmation | — | `billing.is_paid` and `billing.paid_at` columns exist, no write path |
| Delivery notification | `logistics.service.ts:152-154` | `console.log` stub only |
| `billing/:id` detail page | routes.ts:30 | Route defined, page file does not exist |
| `billing/reports` page | routes.ts:31 | Route defined, page file does not exist |

---

## Open Questions / Decisions Needed

| # | Question | Severity | Status |
|---|---|---|---|
| 1 | `package_events` mystery | ✅ RESOLVED | DB trigger `trg_package_status_history` writes automatically on packages INSERT/UPDATE |
| 2 | Is `/admin/packages` a distinct feature from `/admin/logistics`? | Medium | Not analyzed |
| 3 | Package detail financial panel: read from `billing` record or `system_settings`? | High | Pending — `use-logistics-detail.ts:22-76` |
| 4 | `fee_crc` value for migration | ✅ RESOLVED | DB has ₡2,900 as `profit_per_lb` — use that value |
| 5 | Public tracking page timing | Medium | After billing V1 |
| 6 | `package_type` normalization | Medium | DB has 5 mixed-case values; code uses title-case. Normalize on INSERT and clean existing data |

---

## Pages Reality Check

| Route | Real Data? | Blocking issues |
|---|---|---|
| `/admin/dashboard` | Unknown | Not analyzed |
| `/admin/logistics` | ✅ Yes | — |
| `/admin/logistics/create` | ✅ Yes | Preview omits flat fee |
| `/admin/logistics/[id]` | Partial | Financial panel hardcoded; customer name missing |
| `/admin/logistics/edit/[id]` | Unknown | Not analyzed |
| `/admin/customers` | ✅ Yes | — |
| `/admin/customers/create` | ✅ Yes | — |
| `/admin/customers/[id]` | ✅ Yes | — |
| `/admin/settings` | ✅ Yes | — |
| `/admin/billing` | ❌ Mock | Full replacement needed (billing V1) |
| `/admin/packages` | ❌ Mock | Unclear purpose; needs decision |
| `/tracking` | ❌ Mock | Needs real API connection |

---

## Rate Inconsistency Summary

Four different places use different rate values for the same calculation. See `.claude/docs/billing-rules.md` for detail.

| Location | price/lb | exchange | fee | Source |
|---|---|---|---|---|
| `logistics.repo.ts:134` (actual invoice) | $4.50 | ₡525 | ₡1,500 | Hardcoded |
| `use-package-calculator.ts` (creation preview) | `system_settings` | `system_settings` | ❌ missing | DB |
| `use-logistics-detail.ts:22` (detail view) | $6.00 | ₡540 | ₡2,500 | Hardcoded |
| `billing/index.tsx:12` (billing page, mock) | $5.00 | ❌ missing | ❌ missing | Hardcoded |

**All four must converge on `system_settings` values after Billing V1 Phase 2.**
