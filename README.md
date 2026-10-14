# Dexter India · Operator CRM — Frontend

React 19 + Vite + TypeScript + Tailwind CSS v4. Built from the Figma file **DEXTER-MODULES** (page "COMPLETE FLOW").
No backend yet — all data is mock data in `src/data/`, ready to be swapped for API calls.

## Run

```bash
npm install
npm run dev      # http://localhost:5310
npm run build
```

## Demo sign-in (mock)

- Any valid Indian mobile (10 digits, starts 6–9) or email + any password → signs in.
- Password `wrong` → shows the "Incorrect password" state.
- OTP: any 6 digits → passes; `000000` → shows the "Code expired" state.
- Data you create or edit in any module is kept in this browser's localStorage under `dexter.*` keys; clear them to reset to the demo data.

## Structure

```
src/
  components/layout   AppShell, Sidebar (full module nav), Topbar
  components/ui       Button, Badge, Card/PageHeader, KpiCard/StatCard, Field (inputs, OTP, segmented), Pagination
  components/grid     ExcelGrid — Excel-style grid used across modules (sort, filter, columns, export, selection, inline edit)
  data/               mock data + nav config
  pages/auth          Login, OTP, Forgot password, Create password, Success screens
  pages/              Dashboard, Notices, onboarding/, franchise/, legal/, projects/, reports/, finance/, cbr/, tasks/, email/, complaints/
                      (each module exports its routes from routes.tsx; Placeholder covers menu items with no design yet)
```

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Shell, shared components, Auth (desktop + mobile), Dashboard, Notices | ✅ |
| 2 | Onboarding — Applications list + 7-step WLA application form | ✅ |
| 3 | Franchise Management — hub, registration, tier lists, master data, dossier, KYC, SD | ✅ |
| 4 | Legal (register, site legal summary, document detail, audit, franchisee mobile app) + Projects (active/archived, record, audit) | ✅ |
| 5 | Reports — Unified hub (44 reports) + 8 financial reports (BS, Axis & ICD, CLF, SD, FFM EOD, Overage, DLR2, DLR3) | ✅ |
| 6 | Finance (GST, Payout) + CBR (consolidated, daily, EOD summary, mobile) | ✅ |
| 7 | Tasks (command center, workspace, task detail) + Email (inbox/sent/drafts, compose with AI) | ✅ |
| 8 | Complaints (create, 360, management/operations/asset/AI dashboards) | ✅ |

Note: "Export .xlsx" currently downloads a CSV (opens in Excel); real .xlsx export will come from the backend.
