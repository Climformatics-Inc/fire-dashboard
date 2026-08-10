import axios, { AxiosError } from "axios";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { FWI_API_URL } from "./useForecastMetadata";

/* ───────────────────────────────── types ───────────────────────────────── */

export type Interval = "hourly" | "daily" | "monthly";

type ErrorBars = { plus?: number[]; minus?: number[] };

export interface Series {
  /** 50th percentile time series */
  "50": number[];
  /** upper/lower error bars; optional on some vars */
  error_bars?: ErrorBars;
  /** aggregate helpers sometimes present */
  max?: number;
  min?: number;
  /** FWI thresholds (if present) */
  val_1?: number; val_2?: number; val_3?: number; val_4?: number; val_5?: number;
}

export interface ChartData {
  time: string[];
  temperature_maximum?: Series;
  temperature_minimum?: Series;
  wind_speed?: Series;
  relative_humidity_maximum?: Series;
  relative_humidity_minimum?: Series;
  fire_weather_index?: Series;
  heat_stress_index?: Series;
  severe_fire_danger_index?: Series;
  burn_index?: Series;
  energy_release_component?: Series;
  /** allow future keys without breaking TS */
  [key: string]: any;
}

export interface UseChartArgs {
  zone: string;
  start: string; // yyyy-MM-dd
  end: string;   // yyyy-MM-dd
  interval: Interval;
}

/* ───────────────────────────── axios instance ──────────────────────────── */

const http = axios.create({
  baseURL: FWI_API_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/* ─────────────────────────── query key + fetcher ───────────────────────── */

export const chartKey = (zone: string, start: string, end: string, interval: Interval) =>
  ["chart", { zone, start, end, interval }] as const;

export async function fetchChart(params: UseChartArgs & { signal?: AbortSignal }): Promise<ChartData> {
  const { zone, start, end, interval, signal } = params;
  if (!zone) return { time: [] };

  // Cloud Function expects start_time / end_time
  const { data } = await http.post<ChartData>(
    "",
    { zone, start_time: start, end_time: end, interval },
    { signal }
  );
  return data;
}

/* ─────────────────────────────── main hook ─────────────────────────────── */

export function useChart(opts: UseChartArgs & {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;   // (v5) cache TTL in memory
}) {
  const {
    zone, start, end, interval,
    enabled = true,
    staleTime = 15 * 60 * 1000, // 15m
    gcTime    = 60 * 60 * 1000, // 60m
  } = opts;

  return useQuery<ChartData>({
    queryKey: chartKey(zone, start, end, interval),
    enabled: enabled && !!zone,
    staleTime,
    gcTime,
    // keep previous data visible on param changes
    placeholderData: (prev) => prev,
    // abort in-flight when params change
    queryFn: ({ signal }) => fetchChart({ zone, start, end, interval, signal }),
    // retry only transient network-ish errors
    retry: (failCount, err) => {
      const e = err as AxiosError;
      const code = e.response?.status;
      if (code && code < 500 && code !== 429) return false; // don't retry client errors
      return failCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    refetchOnWindowFocus: false,
  });
}

/* ─────────────────────────────── prefetcher ────────────────────────────── */

export function prefetchChart(
  qc: QueryClient,
  opts: UseChartArgs
) {
  const { zone, start, end, interval } = opts;
  return qc.prefetchQuery({
    queryKey: chartKey(zone, start, end, interval),
    queryFn: ({ signal }) => fetchChart({ zone, start, end, interval, signal }),
    staleTime: 15 * 60 * 1000,
  });
}

/* ───────────────────────── optional: slim selector ───────────────────────
   Use this in PopupCharts to observe only the selected series/time slice.
   Zero extra network calls; it projects the SAME cached response.
────────────────────────────────────────────────────────────────────────── */

const varKeyMap = {
  temperatureMax: "temperature_maximum",
  temperatureMin: "temperature_minimum",
  windSpeed: "wind_speed",
  relativeHumMax: "relative_humidity_maximum",
  relativeHumMin: "relative_humidity_minimum",
  fireWeatherIndex: "fire_weather_index",
  heatStressIndex: "heat_stress_index",
  severeFireDangerIndex: "severe_fire_danger_index",
  burnIndex: "burn_index",
  energyReleaseComponent: "energy_release_component",
} as const;

export type UiVariable = keyof typeof varKeyMap;

export type SeriesView = {
  time: string[];
  p50?: number[];
  eb?: ErrorBars;
  fwi?: { cuts: number[]; yMax: number } | undefined;
};

export function useChartSlice(args: UseChartArgs, selectedVariable: UiVariable) {
  return useQuery<SeriesView>({
    queryKey: chartKey(args.zone, args.start, args.end, args.interval),
    queryFn: ({ signal }) => fetchChart({ ...args, signal }),
    enabled: !!args.zone,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: (prev) => prev as any,
    retry: 1,
    refetchOnWindowFocus: false,
    // Only compute what the chart needs
    select: (d): SeriesView => {
      const key = varKeyMap[selectedVariable];
      const s = key ? (d as any)[key] as Series | undefined : undefined;

      // Optional FWI thresholds
      let fwi: SeriesView["fwi"];
      if (key === "fire_weather_index" && s) {
        const cuts = [s.val_1, s.val_2, s.val_3, s.val_4, s.val_5]
          .filter((v): v is number => typeof v === "number")
          .map(Number)
          .sort((a, b) => a - b);
        if (cuts.length) {
          const yMax = Math.ceil(cuts[cuts.length - 1]) + 1;
          fwi = { cuts, yMax };
        }
      }

      return {
        time: d.time ?? [],
        p50: s?.["50"] ?? [],
        eb: s?.error_bars,
        fwi,
      };
    },
    structuralSharing: true,
  });
}
