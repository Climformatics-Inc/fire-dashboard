import { mapping, unitMap, varLabels } from "../constants/chartConstants";

type SeriesOut = {
  time: string[];
  lower: number[];
  median: number[];
  upper: number[];
  unit: string;
  label: string;
};

export function buildSeriesForExport(data: any, selectedVariable: string): SeriesOut | null {
  if (!data?.time?.length) return null;

  const time: string[] = data.time;
  let src: any;

  if (selectedVariable === "severeFireDangerIndex") {
    src = data.severe_fire_danger_index;
  } else if (selectedVariable === "fireWeatherIndex") {
    src = data.fire_weather_index;
  } else {
    const key = mapping[selectedVariable] ?? selectedVariable;
    src = data[key];
  }

  if (!src?.["50"]?.length) return null;

  const med: number[] = src["50"];
  const plus: number[] = src?.error_bars?.plus ?? [];
  const minus: number[] = src?.error_bars?.minus ?? [];

  const upper = med.map((v, i) => v + (plus[i] ?? 0));
  const lower = med.map((v, i) => v - (minus[i] ?? 0));

  return {
    time,
    lower,
    median: med,
    upper,
    unit: unitMap[selectedVariable] ?? "",
    label: varLabels[selectedVariable] ?? selectedVariable,
  };
}

export function downloadCsv(rows: (string | number)[][], filename: string) {
  const esc = (val: any) => {
    if (val == null) return "";
    const s = String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}