import React from "react";
import { buildSeriesForExport, downloadCsv } from "./chartExport";
import type { Interval } from "../hooks/useChart";

interface Props {
  data: any;
  selectedVariable: string;
  disabled?: boolean;
  className?: string;
  zone?: string;           // NEW (e.g., "Redding", "Amplicam")
  interval?: Interval;     // NEW ("hourly" | "daily" | "monthly")
}

const toYMD = (v: string | Date) => {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(+d)) {
    // fallback if the string isn't ISO—just take YYYY-MM-DD
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }
  return d.toISOString().slice(0, 10);
};

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();

export default function ExportCsvButton({
  data,
  selectedVariable,
  disabled,
  className,
  zone,
  interval,
}: Props) {
  const handleClick = () => {
    const s = buildSeriesForExport(data, selectedVariable);
    if (!s) return;

    const start = toYMD(s.time[0]);
    const end   = toYMD(s.time[s.time.length - 1]);
    const today = toYMD(new Date());

    const parts = [
      slug(s.label),                     // variable
      interval ? slug(interval) : undefined,
      zone ? slug(zone) : undefined,
      `${start}_to_${end}`,              // range
      `dl-${today}`,                     // download day
    ].filter(Boolean);

    const filename = `${parts.join("__")}.csv`;

    const header = ["date", "p0", "p50", "p100"];
    const meta1 = ["variable", s.label];
    const meta2 = ["unit", s.unit];

    const rows: (string | number)[][] = [
      meta1,
      meta2,
      [],
      header,
      ...s.time.map((t, i) => [t, s.lower[i], s.median[i], s.upper[i]]),
    ];

    downloadCsv(rows, filename);
  };

  const isDisabled = disabled || !data?.time?.length;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      title={isDisabled ? "No data to export yet" : "Download CSV for this chart"}
      className={`mt-4 w-full rounded-lg border border-black bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      Download CSV
    </button>
  );
}