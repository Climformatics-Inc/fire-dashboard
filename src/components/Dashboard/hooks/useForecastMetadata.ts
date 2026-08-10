import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export type DashboardKind = "fwi" | "alert";

export interface ForecastLocationMarker {
  location: string;
  zone: string;
  lat: number;
  lon: number;
}

export interface ForecastMetadata {
  latest_issue_date: string;
  default_start_time: string;
  default_end_time: string;
  location: string;
  zone: string;
  locations: string[];
  zones: string[];
  location_markers: ForecastLocationMarker[];
}

export const FWI_API_URL =
  (import.meta as any)?.env?.VITE_FWI_API_URL ||
  "https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-abed915a-a833-470b-8d4a-618006c8d13f/demo_dashboards/ieee_fwi_dashboard_api";

export const ALERT_API_URL =
  (import.meta as any)?.env?.VITE_ALERT_API_URL ||
  "https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-abed915a-a833-470b-8d4a-618006c8d13f/demo_dashboards/ieee_energy_alert_dashboard_api";

export const dashboardApiUrl = (kind: DashboardKind) =>
  kind === "alert" ? ALERT_API_URL : FWI_API_URL;

export const normalizeZoneName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const metadataKey = (kind: DashboardKind, zone?: string) =>
  ["forecast-metadata", { kind, zone: zone || "" }] as const;

const normalizeMetadata = (payload: any): ForecastMetadata => {
  const rawBody = payload?.body ?? payload;
  const body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  const locationMarkers = Array.isArray(body.location_markers)
    ? body.location_markers.filter(
        (marker: any): marker is ForecastLocationMarker =>
          typeof marker?.location === "string" &&
          typeof marker?.zone === "string" &&
          typeof marker?.lat === "number" &&
          typeof marker?.lon === "number"
      )
    : [];
  return {
    latest_issue_date: body.latest_issue_date,
    default_start_time: body.default_start_time,
    default_end_time: body.default_end_time,
    location: body.location,
    zone: body.zone,
    locations: Array.isArray(body.locations) ? body.locations : [],
    zones: Array.isArray(body.zones) ? body.zones : [],
    location_markers: locationMarkers,
  };
};

export async function fetchForecastMetadata(
  kind: DashboardKind,
  zone?: string,
  signal?: AbortSignal
): Promise<ForecastMetadata> {
  const { data } = await axios.post(
    dashboardApiUrl(kind),
    { metadata_only: true, ...(zone ? { zone } : {}) },
    {
      signal,
      timeout: 60_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  return normalizeMetadata(data);
}

export function useForecastMetadata(kind: DashboardKind, zone?: string) {
  return useQuery<ForecastMetadata>({
    queryKey: metadataKey(kind, zone),
    queryFn: ({ signal }) => fetchForecastMetadata(kind, zone, signal),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
