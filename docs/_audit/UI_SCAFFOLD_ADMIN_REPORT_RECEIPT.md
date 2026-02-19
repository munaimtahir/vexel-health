# Admin UI Scaffold — Report Design & Receipt Design

**Date:** 2026-02-19  
**Scope:** Report Design and Receipt Design pages under Business → Branding. Scaffold only; no PDF rendering in browser. No bypass of deterministic PDF service.

---

## 1. Routes Added

| Route | Purpose |
|-------|--------|
| `/admin/business/report-design` | Configure layout metadata for PDF report engine (header, patient block, results table, footer, signatories). Preview placeholder only. |
| `/admin/business/receipt-design` | Configure layout metadata for receipt printing (header, line items, totals, footer, width mode). Preview placeholder only. |

Both routes live under `app/admin/business/` and use the existing Admin layout (AuthGuard, AdminNav, premium theme).

---

## 2. Navigation Updated

**File:** `apps/web/lib/admin/routes.ts`

- Added `businessReportDesign: '/admin/business/report-design'`
- Added `businessReceiptDesign: '/admin/business/receipt-design'`
- **AdminNav (Business section):**  
  - Business Overview  
  - Branding  
  - **Report Design**  
  - **Receipt Design**

---

## 3. Components Added

| Component | Location | Purpose |
|-----------|----------|--------|
| `ToggleField` | `components/admin/design/ToggleField.tsx` | Label + checkbox; optional description. Reusable for toggles. |
| `SelectField` | `components/admin/design/SelectField.tsx` | Label + select; options array; optional description. |
| `TextAreaField` | `components/admin/design/TextAreaField.tsx` | Label + textarea; optional placeholder, rows, description. |
| `TextField` | `components/admin/design/TextField.tsx` | Label + single-line input; optional placeholder, description. |
| `PreviewPanel` | `components/admin/design/PreviewPanel.tsx` | Placeholder panel with configurable message; no PDF/HTML rendering. |

All use design tokens: `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent`, `--accent-foreground`. Styling: rounded-xl inputs, consistent grid (220px label column on sm+).

---

## 4. Page Structure (Premium Admin Shell)

Both pages use:

- **PageHeader** — title, subtitle
- **NoticeBanner** — “Requires backend contract endpoint” (warning tone)
- **AdminCard** — sections with title/subtitle
- **SectionTitle** — section headings
- **FieldRow** — not used for form fields; design components used instead
- **PreviewPanel** — right-side placeholder; no HTML/PDF mock

**Report Design sections:**  
A) Header Configuration (Show Logo, Logo Position, Header Text 1/2, Divider Style)  
B) Patient Info Block Layout (Layout Style, Show Ref #, Consultant, Sample Time)  
C) Results Table Styling (Font Size, Units column, Reference Range, Abnormal Highlight)  
D) Footer Configuration (Footer Text, Show Signatories, Signatory Block Style)  
E) Preview Panel (placeholder message only)

**Receipt Design sections:**  
A) Receipt Header (Show Logo, Business Name override, Show Address, Show Contact)  
B) Line Item Table (Quantity, Unit Price, Discount, Tax toggles)  
C) Totals Block (Subtotal, Discount, Tax, Grand Total style)  
D) Footer (Thank You Message, Terms & Conditions, QR Code placeholder toggle)  
E) Receipt Width Mode (A4, Thermal 80mm, Thermal 58mm)  
F) Preview Panel (placeholder message only)

---

## 5. SDK Endpoints Found / Missing

**Searched:** `packages/contracts` for `reportDesign`, `receiptDesign`, `TenantReportDesign`, `TenantReceiptDesign`, and tenant design-related paths.

**Result:** **No contract endpoints exist** for:

- `getTenantReportDesign()` / `updateTenantReportDesign()`
- `getTenantReceiptDesign()` / `updateTenantReceiptDesign()`

**UI behavior:**  
- Both pages show a **NoticeBanner**: “Requires backend contract endpoint: GET/PUT tenant report design” (or receipt design).  
- Form state is **local only** (useState); “Save Draft” persists to local state and displays a “Saved locally at …” message.  
- When backend adds these endpoints, the pages should call the SDK and replace local-only save with API calls. No ad-hoc payloads; use contract types only.

---

## 6. Backend Contract Required

To make Report Design and Receipt Design persistent and tenant-scoped:

1. **OpenAPI:** Add operations for tenant report design and tenant receipt design (e.g. `GET/PUT /admin/tenant/report-design`, `GET/PUT /admin/tenant/receipt-design` or equivalent tenant-scoped paths). Request/response bodies should reflect the fields currently in the scaffold (header, patient block, results table, footer for report; header, line items, totals, footer, width for receipt).
2. **Regenerate:** Run `npm run contracts:generate` and use generated types and SDK methods in the web app.
3. **Tenant isolation:** Endpoints must resolve tenant from auth context only (no tenant ID in URL for override). Enforce tenant isolation server-side.
4. **PDF service:** Design metadata is consumed by the deterministic PDF service for report and receipt rendering. No HTML-to-PDF or browser-based rendering in the admin UI.

---

## 7. Security

- **Protection:** Routes are under `/admin` and use existing `AdminLayoutShell` → `AuthGuard`. No cross-tenant override; tenant from auth context only.
- **No internal PDF endpoints exposed:** UI only configures metadata; it does not call internal PDF rendering URLs.
- **RBAC:** Admin layout does not currently enforce “Admin role” explicitly; it only requires an authenticated user. RBAC enforcement (admin-only access) should be verified or added as per platform rules.

---

## 8. Theme

- **Tokens:** Same as rest of admin: `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent`, `--accent-foreground` from `lib/theme/tokens.css`.
- **Guidelines:** Spacious (p-6), rounded-2xl cards, subtle shadow, minimal color, one accent, clear typography hierarchy.

---

## 9. TODO Checklist

- [ ] **Branding integration pending?**  
  Report/Receipt design may reference tenant branding (logo, business name). When backend supports it, ensure design config can reference branding assets or that branding is applied by the PDF service using tenant context.

- [ ] **PDF service contract alignment pending?**  
  When report/receipt design endpoints are added, align request/response shape with what the PDF service expects (payload versions, template versions, layout enums). Document engine rules in `governance/DocumentEngine.md` apply.

- [ ] **RBAC enforcement verified?**  
  Confirm that only users with Admin (or equivalent) role can access `/admin/business/report-design` and `/admin/business/receipt-design`. If the admin layout currently only checks auth, add or document role check.

- [ ] **Feature flag wrapping required?**  
  If report design or receipt design should be gated by a feature flag, wrap these routes or sections with `FeatureGate` (or equivalent) once backend provides the flag.
