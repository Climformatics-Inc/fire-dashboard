# Fire Dashboard Map Tile Pipeline — Rebuild Spec

**Project:** Fire Weather Dashboard (`fire-dashboard`)  
**Owner:** [Your name]  
**Status:** Rebuild required — GCP tiles deleted, no source repo  
**Date:** March 2026  

---

## Problem

The map overlay does not update with the date slider. Root cause is twofold:

1. **Frontend:** tile URL was hardcoded to `20250101` (fixable in `MapView.tsx`).
2. **Backend:** the tile upload pipeline is missing. Tiles in DigitalOcean Spaces (`usa-gridmet-map-data-do`) are **partial and incomplete**; original GCP assets and scripts were deleted.

---

## Goal

Rebuild a batch job that, for each **variable** and **date**, produces XYZ PNG tiles and uploads them so the dashboard can load:

```text
https://usa-gridmet-map-data-do.sfo3.digitaloceanspaces.com/{var}/{YYYYMMDD}/{z}/{x}/{y}.png
```

---

## Architecture

```text
GridMET NetCDF (stage-0 bucket / local .nc)
  → xarray: select date → 2D lat×lon array
  → rioxarray: GeoTIFF (EPSG:4326)
  → gdal_translate: scale to byte (0–255)
  → gdaldem color-relief: apply variable colormap → RGBA GeoTIFF
  → gdal2tiles.py: generate {z}/{x}/{y}.png pyramid
  → upload to DO Spaces: usa-gridmet-map-data-do
  → fire-dashboard MapView requests tiles by slider date
```

**Reference implementation:** 2024 ChatGPT/Jupyter snippet (xarray + rioxarray + GDAL + gdal2tiles).  
**Closest existing repo:** `gridmet_map_tiles` (same steps through color-relief; currently outputs **PMTiles to GCS** instead of XYZ PNGs to DO).

---

## Dashboard contract

| Item | Value |
|------|--------|
| **Bucket** | `usa-gridmet-map-data-do` (region `sfo3`) |
| **Path** | `{var}/{YYYYMMDD}/{z}/{x}/{y}.png` |
| **Date format** | `YYYYMMDD` (no dashes) |
| **Variables** | `fwi`, `sfdi`, `hsi`, `tmmx`, `tmmn`, `rmax`, `rmin`, `vs` |
| **Zoom** | `0–11` (dashboard `maxNativeZoom={11}`) |
| **Tile size** | 256×256 PNG |
| **Map bounds** | Western US (~24°N–50°N, 125°W–66°W) |

---

## Variables & styling

**Source of truth:** the legend the dashboard displays comes from `dynamic-tiler`
(`app/main.py` → `PALETTES` → `GET /v1/legend`, called via `VITE_API_BASE` in `MapView.tsx`).
Tile colours must use the same fixed ranges or they won't match the legend. `CONFIG` in
`usa-gridmet-map-tiles/gridmet_build_tiles.py` mirrors this table.

| Var | Source | Colormap | Value range | Steps |
|-----|--------|----------|-------------|-------|
| `tmmx` | NetCDF `air_temperature` | plasma | 0–120 °F | 25 |
| `tmmn` | NetCDF `air_temperature` | plasma | −20–100 °F | 25 |
| `rmax` / `rmin` | NetCDF `relative_humidity` | viridis | 0–100 % | 25 |
| `vs` | NetCDF `wind_speed` | winter | 0–60 mph | 25 |
| `fwi` | derived (tmmx, rmin, vs + persistence CDF) | autumn_r (yellow→red) | 5 percentile classes Low…Severe | 5 |
| `sfdi` | derived (erc, bi persistence) | autumn_r (yellow→red) | 5 classes Low…Severe | 5 |
| `hsi` | **unknown — no formula in any repo we have** | magma (reversed) | 60–120 | 11 |

Finding from the smoke test: the legacy `20250101` tiles in the bucket were stretched to each
day's own min/max (a 28 °F region rendered orange, ≈90 °F on the legend), so they never
matched the legend. The rebuilt tiles use the fixed ranges above and do.

---

## Data sources

| Input | Location | Repo |
|-------|----------|------|
| Raw GridMET NetCDF | GCS/DO `operational-gridmet-stage-0` or equivalent | `gridmet_daily_extractor_compute_engine` |
| Processed point CSVs | stage-1 bucket | `gridmet_pre_processing_etl_stage_1` |
| Forecast CSVs (charts only) | forecast bucket | `cfs-gridmet-daily-forecasting-pipeline` |

**Note:** Map tiles are **historical GridMET rasters**, not forecast CSVs. Forecast-dated map overlays are out of scope unless a separate raster pipeline is built.

---

## Current DO bucket state (Mar 2026 audit)

Partial migration from GCP; many folder dates do not serve tiles (404).

| Variable | Folder range (UI) | Usable tiles (spot-check) |
|----------|-------------------|---------------------------|
| `fwi` | 20250101, 20250118–20250304 | Jan 1, Jan 19–25 |
| `tmmx` | 20250101–20250305 | Early Jan 2025 |
| `tmmn` | 20250101–20251230 | Jan 2025, Jun–Jul 2025 (spotty) |
| `rmax` | 20250101–20250306 | Early Jan 2025 |

**Backfill target (phase 1):** Jan–Mar 2025 for all 8 variables, then expand as needed.

---

## Implementation plan

### Phase 1 — Proof of concept (1 week)

- [x] Fork/adapt `gridmet_map_tiles` → `usa-gridmet-map-tiles` (Dockerised, GDAL 3.10 base image)
- [x] Replace `rio pmtiles` with `gdal2tiles --xyz -z 0-11` (`-x` skips empty tiles)
- [x] Add DO Spaces upload (`boto3`, endpoint `sfo3.digitaloceanspaces.com`, `UPLOAD_TILES` flag)
- [x] Run for **one var + one date** (`tmmx`, `20250119`, z0–6): 128 tiles, 256×256 RGBA PNG, layout matches bucket
- [ ] Obtain Spaces keys; run once with `UPLOAD_TILES=true`; verify tile URL in browser
- [ ] Obtain FWI/ERC/BI persistence HDF5 files (or the code that builds them) → `fwi`, `sfdi`
- [ ] Wire slider date in `MapView.tsx` (frontend)

### Phase 2 — Backfill (1–2 weeks)

- [x] Batch runner: `--date YYYY-MM-DD [--end YYYY-MM-DD] --vars fwi,tmmx,...`
- [ ] Backfill Jan–Mar 2025 for all variables
- [ ] Idempotent uploads (skip if tile exists)
- [ ] Logging + failure retry

### Phase 3 — Production (1 week)

- [ ] Schedule daily job (Cloud Run job, GitHub Action, or cron on VM)
- [ ] Generate tiles for latest available GridMET date
- [ ] Document runbook + env vars (bucket, keys, source paths)

---

## Out of scope (for now)

- `dynamic-tiler` / on-demand COG serving (different architecture)
- Forecast-dated map rasters synced with `ieee_fwi_dashboard_api`
- Recovering deleted GCP tiles
- PMTiles / GCS output (unless needed elsewhere)

---

## Open questions for team

1. **Date range:** Backfill Jan–Mar 2025 only, or full 2025? Any 2024 needed?
2. ~~Zoom 0–11 confirmed?~~ **Decided: z0–9.** Measured on the dev server for one var-day:
   z11 = 78,588 tiles / 312 MB / 12 min; z9 = 3,335 tiles / ~50 s. GridMET is 4 km, so at z9 a
   cell is already ~13 px; z10–11 add nothing visible. `maxNativeZoom` set to 9 in `MapView.tsx`.
3. **Run environment:** Cloud Run job, local batch, CI — preference?
4. **DO Spaces credentials:** Who has write access to `usa-gridmet-map-data-do`?
5. **FWI / SFDI persistence files:** `gridmet_map_tiles` reads `fwi_/erc_/bi_YYYYMMDD.hdf5`
   CDF grids from a `persistence` bucket that no longer exists. Does anyone have these files,
   or the code that generated them? Without them FWI and SFDI tiles cannot be built.
6. **HSI formula:** The dashboard requests `hsi` tiles and the legend is 60–120 (magma), but
   no repo we have computes it. Is it NWS Heat Index from `tmmx` + `rmin`? Something else?
7. **Legend semantics for FWI/SFDI:** the legend shows value breaks (0,5,12,25,40,60) but the
   tile pipeline classifies by climatological percentile. Is that the intended behaviour?
8. **Forecast map layer:** Required later, or historical GridMET is acceptable?

---

## Success criteria

- [ ] Slider on Jan 19–25, 2025 shows **different colored map** per day
- [ ] All 8 variables serve tiles for the backfill range
- [ ] Tile URLs return HTTP 200 for spot-checked `{z}/{x}/{y}` paths
- [ ] Daily job can regenerate yesterday’s tiles unattended
- [ ] Runbook exists so another engineer can operate the pipeline

---

## Key repos & URLs

| Component | Location |
|-----------|----------|
| Dashboard frontend | `Climformatics-Inc/fire-dashboard` |
| Tile builder (adapt) | `gridmet_map_tiles` |
| Tile bucket | `usa-gridmet-map-data-do.sfo3.digitaloceanspaces.com` |
| Chart API | `ieee_fwi_dashboard_api` (separate; not map tiles) |
| 2024 reference snippet | [ChatGPT conversation](https://chatgpt.com/share/6aa2467c-b470-83e8-b83f-f762865e111a) |
