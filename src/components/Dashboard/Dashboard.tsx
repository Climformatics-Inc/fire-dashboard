import { useMemo, useState, useEffect, useCallback } from "react";
import { addDays, format, isValid, parseISO } from "date-fns";

import MapView from "./MapView";
import Header from "./Header";
import { useChart, type Interval } from "./hooks/useChart";
import {
  normalizeZoneName,
  useForecastMetadata,
} from "./hooks/useForecastMetadata";
import { useUrlState, type UrlState } from "./utils/useUrlState";

/* ---------- helpers -------------------------------------------------------- */
const sliderMax = (intv: Interval, from: Date, to: Date) => {
  const days = Math.floor((+to - +from) / 86_400_000) + 1;
  if (intv === "hourly") return days * 24;
  if (intv === "monthly") return Math.ceil(days / 30);
  return days; // daily
};
const isIntv = (v: any): v is Interval =>
  v === "hourly" || v === "daily" || v === "monthly";

/* ---------- component ------------------------------------------------------ */
export default function Dashboard() {
  const hasUrlDateRange = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("from") || params.has("to");
  }, []);

  // UI / control state
  const [interval, setInterval] = useState<Interval>("daily");
  const [calendarRange, setCalendarRange] = useState({
    from: new Date(),
    to: new Date(),
  });
  const [metadataDefaultsApplied, setMetadataDefaultsApplied] =
    useState(hasUrlDateRange);
  const [sliderValue, setSliderValue] = useState(0);
  const [selectedVariable, setSelectedVariable] = useState("temperatureMax");

  // location
  const [zone, setZone] = useState<string>("");

  // whether to auto-open popup (only when URL requests it)
  const [autoOpenFromUrl, setAutoOpenFromUrl] = useState(false);

  const { data: forecastMetadata, isError: isMetadataError } =
    useForecastMetadata("fwi");
  const supportedZones = forecastMetadata?.zones ?? [];
  const supportedZoneNames = useMemo(
    () => new Set(supportedZones.map(normalizeZoneName)),
    [supportedZones]
  );
  const canFetchZone =
    !!zone &&
    (!supportedZones.length || supportedZoneNames.has(normalizeZoneName(zone)));

  // stable start/end strings
  const startStr = useMemo(
    () => format(calendarRange.from, "yyyy-MM-dd"),
    [calendarRange.from]
  );
  const endStr = useMemo(
    () => format(calendarRange.to, "yyyy-MM-dd"),
    [calendarRange.to]
  );

  // data
  const {
    data: chartData,
    isFetching,
    isError,
    error,
  } = useChart({
    zone: canFetchZone ? zone : "",
    start: startStr,
    end: endStr,
    interval,
    enabled: metadataDefaultsApplied || hasUrlDateRange || isMetadataError,
  });

  useEffect(() => {
    if (metadataDefaultsApplied || hasUrlDateRange || !forecastMetadata) return;
    const from = parseISO(forecastMetadata.default_start_time);
    if (isValid(from)) {
      setCalendarRange({ from, to: addDays(from, 15) });
    }
    if (!zone && forecastMetadata.zone) {
      setZone(forecastMetadata.zone);
    }
    setMetadataDefaultsApplied(true);
  }, [forecastMetadata, hasUrlDateRange, metadataDefaultsApplied, zone]);

  useEffect(() => {
    if (
      zone &&
      supportedZones.length &&
      !supportedZoneNames.has(normalizeZoneName(zone))
    ) {
      setZone("");
    }
  }, [zone, supportedZones, supportedZoneNames]);

  // pre-warm Plotly
  useEffect(() => {
    const idle = (cb: () => void) =>
      "requestIdleCallback" in window
        ? (window as any).requestIdleCallback(cb)
        : setTimeout(cb, 250);
    idle(() => import("./components/PlotBasic"));
  }, []);

  /* ---------- URL -> state (on mount / when query changes) ------------------ */
  const applyFromUrl = useCallback(
    (u: UrlState) => {
      if (u.variable) setSelectedVariable(u.variable);
      if (isIntv(u.interval) && u.interval === "daily") setInterval(u.interval);
      if (u.zone) setZone(u.zone);

      let nextFrom = calendarRange.from;
      let nextTo = calendarRange.to;
      if (u.from && !Number.isNaN(Date.parse(u.from)))
        nextFrom = new Date(u.from);
      if (u.to && !Number.isNaN(Date.parse(u.to))) nextTo = new Date(u.to);
      if (+nextFrom <= +nextTo)
        setCalendarRange({ from: nextFrom, to: nextTo });

      if (u.t != null) {
        const intv = isIntv(u.interval) ? u.interval : interval;
        const max = sliderMax(intv, nextFrom, nextTo);
        const t = Math.max(0, Math.min(max - 1, Number(u.t)));
        if (!Number.isNaN(t)) setSliderValue(t);
      }

      // NEW: only auto-open if the URL explicitly asked for it
      if (u.popup === "1" || u.popup === "true") {
        setAutoOpenFromUrl(true);
      } else {
        setAutoOpenFromUrl(false);
      }
    },
    [interval, calendarRange.from, calendarRange.to]
  );

  // one hook handles both reading (once) and writing (on change)

  /* ---------- keep slider in-bounds if interval/range changes --------------- */
  const sliderMaxValue = useMemo(
    () => sliderMax(interval, calendarRange.from, calendarRange.to),
    [interval, calendarRange.from, calendarRange.to]
  );

  const clampedSliderValue = useMemo(
    () => Math.min(Math.max(0, sliderMaxValue - 1), sliderValue),
    [sliderValue, sliderMaxValue]
  );

  useUrlState(
    {
      zone,
      variable: selectedVariable,
      interval,
      from: startStr,
      to: endStr,
      t: clampedSliderValue,
    },
    applyFromUrl
  );

  /* ---------- render -------------------------------------------------------- */
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="relative flex-1 overflow-visible">
        <MapView
          /* map controls */
          sliderValue={clampedSliderValue}
          setSliderValue={setSliderValue}
          interval={interval}
          setInterval={setInterval}
          calendarRange={calendarRange}
          setCalendarRange={setCalendarRange}
          selectedVariable={selectedVariable}
          setSelectedVariable={setSelectedVariable}
          /* location + data */
          zone={zone}
          setZone={setZone}
          chartData={chartData}
          isFetching={isFetching}
          error={isError ? (error as unknown) : undefined}
          supportedZones={supportedZones}
          locationMarkers={forecastMetadata?.location_markers}
          /* NEW: open popup only when a shared link asked for it */
          autoOpenPopup={autoOpenFromUrl}
        />
      </div>
    </div>
  );
}
