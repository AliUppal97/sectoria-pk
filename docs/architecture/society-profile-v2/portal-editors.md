# Society-portal & admin editing surfaces

> Cross-cutting concern: where each module's content is created/edited. Build session: **S9**. Read with [`foundations.md`](foundations.md).

New tabs/forms under `apps/web/app/(society)/society-portal/` (nav in `components/society/society-shell.tsx`), each `societyAdminProcedure`-backed with ownership:

- **Media** (M1) — upload/reorder hero, gallery, progress (with capture date), floorplans.
- **Documents** (M2) — upload/manage master plan, brochure, payment plan, LOP/NOC (public/private toggle).
- **Amenities & highlights** (M3) — rich amenity cards + stat highlights.
- **Location** (M4) — extend existing location/land form with nearby landmarks.
- **Roadmap** (M6) — milestone CRUD with date + status.
- **Profile basics** — also expose the currently-hidden editable fields (`description`, `amenities`, `developmentStage`, `developmentPct`, `virtualTourUrl`, `promoVideoUrl`) which today are seed-only.

Uploads use the presigned flow from [`storage.md`](storage.md). Money/sensitive-doc actions use confirm dialogs, not toasts.

## Admin portal (`apps/web/app/(admin)/`, `superAdminProcedure` / `opsProcedure`)

- **Societies console** (M0) — create/list/publish/archive societies, completeness %, admin assignment, bulk import. See [`m0-onboarding-and-scale.md`](m0-onboarding-and-scale.md).
- **Developers** (M5) — developers + their projects (`superAdminProcedure`).
- **Articles** (M8) — authoring (`superAdminProcedure`).
