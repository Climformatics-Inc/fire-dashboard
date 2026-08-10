# Fire Weather Dashboard

Standalone website extracted from the Climformatics demo dashboards monorepo.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

Default password: `climformatics_demo`

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_FWI_API_URL` | Override the forecast/chart API endpoint |

## Build

```bash
npm run build
npm run preview
```

## What's included

- Fire Weather Dashboard UI (map, charts, side panel, popups)
- Static geojson overlays (fire perimeters, power plants, transmission lines)
- API integration for forecast metadata and chart data
- Password protection gate
