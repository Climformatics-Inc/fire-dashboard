import React, { useRef } from "react";
// Simple, reliable: statically import Plotly from the dist package you installed.
// If you prefer the "basic" build, change the import to "plotly.js-basic-dist-min".
import Plotly from "plotly.js-dist-min";

// label map kept small to avoid an extra import
const varLabels: Record<string, string> = {
  temperatureMax: "Temperature Max",
  temperatureMin: "Temperature Min",
  windSpeed: "Wind Speed",
  fireWeatherIndex: "Fire Weather Index",
  relativeHumMax: "Relative Humidity Max",
  relativeHumMin: "Relative Humidity Min",
  severeFireDangerIndex: "Severe Fire Danger Index",
  burnIndex: "Burn Index",
  burn_index: "Burn Index",
  energyReleaseComponent: "Energy Release Component",
  energy_release_component: "Energy Release Component",
};

const toYMD = (v: string | Date) => {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(+d)) return String(v).slice(0, 10);
  return d.toISOString().slice(0, 10);
};
const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();

interface Props {
  data: any;
  selectedVariable: string;
  interval?: "hourly" | "daily" | "monthly";
  zone?: string;
  className?: string;
}

export default function DownloadPngButton({
  data,
  selectedVariable,
  interval,
  zone,
  className,
}: Props) {
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const disabled = !data?.time?.length;

  const handleClick = async () => {
    if (disabled) return;

    // Find the Plotly chart within the same popup
    const container =
      anchorRef.current?.closest(".leaflet-popup-content") ||
      anchorRef.current?.closest(".re-resizable") ||
      document.body;

    const plotDiv = container?.querySelector(".js-plotly-plot") as
      | HTMLDivElement
      | null;

    if (!plotDiv) return;

    const time: string[] = data.time ?? [];
    const label = varLabels[selectedVariable] || selectedVariable;

    const start = time.length ? toYMD(time[0]) : toYMD(new Date());
    const end = time.length ? toYMD(time[time.length - 1]) : start;
    const today = toYMD(new Date());

    const parts = [
      slug(label),
      interval ? slug(interval) : undefined,
      zone ? slug(zone) : undefined,
      `${start}_to_${end}`,
      `dl-${today}`,
    ].filter(Boolean);
    const filename = `${parts.join("__")}.png`;

    const dataUrl = await Plotly.toImage(plotDiv, {
      format: "png",
      width: 1600,
      height: 900,
      scale: 2,
    });

    const a = document.createElement("a");
    a.href = dataUrl as string;
    a.download = filename;
    a.click();
  };

  return (
    <div ref={anchorRef} className={className}>
      <button
        type="button"
        className="mt-2 w-full rounded-lg border  bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={handleClick}
        title={disabled ? "No chart available to export" : "Download this chart as PNG"}
      >
        Download PNG
      </button>
    </div>
  );
}
