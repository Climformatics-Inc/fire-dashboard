import React from "react";
import { buildSeriesForExport, downloadCsv } from "./chartExport";
import type { Interval } from "../hooks/useChart";

interface Props {
  data: any;
  selectedVariable: string;
  disabled?: boolean;
  className?: string;
  zone?: string;
  interval?: Interval;
}

const toYMD = (v: string | Date) => {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(+d)) {
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

export const forecastActionButtonClass =
  "flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium leading-none text-gray-900 shadow-sm hover:bg-gray-100 hover:!border-gray-300 focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white";

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
    const end = toYMD(s.time[s.time.length - 1]);
    const today = toYMD(new Date());

    const parts = [
      slug(s.label),
      interval ? slug(interval) : undefined,
      zone ? slug(zone) : undefined,
      `${start}_to_${end}`,
      `dl-${today}`,
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
      className={`${forecastActionButtonClass} ${className ?? ""}`}
    >
      Download CSV
    </button>
  );
}
