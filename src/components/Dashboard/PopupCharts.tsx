import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
const Plot = React.lazy(() => import("./components/PlotBasic"));

/* ---------- props --------------------------------------------------------- */
interface Props {
  data: any;
  selectedVariable: string;
  isFetching?: boolean;
  error?: unknown;
  zone?: string;
  interval?: "hourly" | "daily" | "monthly";
  compact?: boolean;
}

/* ---------- constants ----------------------------------------------------- */
const BLUE = "#1f77b4";
const BLACK = "#000000";
const RED = "#d62728";
const RISK_COLOR_BY_LABEL: Record<string, string> = {
  Low: "#FFFF00",
  Moderate: "#FFD700",
  High: "#FF9900",
  "Very High": "#FF6600",
  Severe: "#FF0000",
};

type RiskBand = {
  label: string;
  color: string;
  min: number | null;
  max: number | null;
};

const plotConfig = {
  displayModeBar: false,
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: [
    "zoom2d",
    "pan2d",
    "select2d",
    "lasso2d",
    "zoomIn2d",
    "zoomOut2d",
    "autoScale2d",
    "resetScale2d",
    "hoverClosestCartesian",
    "hoverCompareCartesian",
  ],
} as const;

const unitMap: Record<string, string> = {
  temperatureMax: "°F",
  temperatureMin: "°F",
  windSpeed: "mph",
  fireWeatherIndex: "",
  heatStressIndex: "",
  relativeHumMax: "%",
  relativeHumMin: "%",
  severeFireDangerIndex: "",
  burnIndex: "",
  burn_index: "",
  energyReleaseComponent: "kJ/m²",
  energy_release_component: "kJ/m²",
};

const varLabels: Record<string, string> = {
  temperatureMax: "Temperature Max",
  temperatureMin: "Temperature Min",
  windSpeed: "Wind Speed",
  fireWeatherIndex: "Fire Weather Index",
  heatStressIndex: "Heat Stress Index",
  relativeHumMax: "Relative Humidity Max",
  relativeHumMin: "Relative Humidity Min",
  severeFireDangerIndex: "Severe Fire Danger Index",
  burnIndex: "Burn Index",
  burn_index: "Burn Index",
  energyReleaseComponent: "Energy Release Component",
  energy_release_component: "Energy Release Component",
};

const mapping: Record<string, string> = {
  temperatureMax: "temperature_maximum",
  temperatureMin: "temperature_minimum",
  windSpeed: "wind_speed",
  relativeHumMax: "relative_humidity_maximum",
  relativeHumMin: "relative_humidity_minimum",
  fireWeatherIndex: "fire_weather_index",
  heatStressIndex: "heat_stress_index",
  burnIndex: "burn_index",
  energyReleaseComponent: "energy_release_component",
  severeFireDangerIndex: "severe_fire_danger_index",
};

const toRgba = (color: string, alpha = 0.15) => {
  if (!color.startsWith("#") || color.length !== 7) return color;
  return `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(
    color.slice(3, 5),
    16
  )},${parseInt(color.slice(5, 7), 16)},${alpha})`;
};

const isRiskVariable = (variable: string) =>
  variable === "fireWeatherIndex" ||
  variable === "heatStressIndex" ||
  variable === "severeFireDangerIndex";

const finite = (values: Array<number | null | undefined>) =>
  values.filter((value): value is number => Number.isFinite(value));

const nullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

function CombinedRiskLegend({
  rangeLabel,
  labels,
  colors,
}: {
  rangeLabel: string;
  labels: string[];
  colors: string[];
}) {
  return (
    <div className="absolute right-7 bottom-[76px] z-[5000] pointer-events-none rounded border border-black/20 bg-white/85 px-3 py-2 shadow-sm">
      <div className="space-y-1 text-[16px] leading-tight text-[#444]">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="inline-block h-[2px] w-12 bg-[#1f77b4]" />
          <span>{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="relative inline-block h-[2px] w-12 bg-black">
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d62728]" />
          </span>
          <span>Median Trend (50th Percentile)</span>
        </div>
      </div>
      <div className="mt-2 flex items-start gap-3">
        {labels.map((riskLabel, index) => (
          <div key={riskLabel} className="flex min-w-[58px] flex-col items-center">
            <span
              className="block h-2 w-full rounded"
              style={{ backgroundColor: colors[index] }}
            />
            <span className="mt-1 text-[11px] font-medium leading-none text-slate-800">
              {riskLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const quantile = (values: number[], percentile: number) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

const bandsFromCuts = (labels: string[], cuts: number[]): RiskBand[] =>
  labels.map((label, index) => ({
    label,
    color: RISK_COLOR_BY_LABEL[label],
    min: index === 0 ? null : cuts[index - 1],
    max: index === labels.length - 1 ? null : cuts[index],
  }));

const fallbackBands = (variable: string, median: number[] = []): RiskBand[] => {
  if (variable === "fireWeatherIndex") {
    return bandsFromCuts(
      ["Low", "Moderate", "High", "Very High", "Severe"],
      [7.5, 17.5, 20, 30]
    );
  }
  if (variable === "heatStressIndex") {
    return bandsFromCuts(
      ["Low", "Moderate", "High", "Severe"],
      [quantile(median, 0.75), quantile(median, 0.9), quantile(median, 0.95)]
    );
  }
  return bandsFromCuts(
    ["Low", "Moderate", "High", "Very High", "Severe"],
    [60, 80, 90, 95]
  );
};

const normalizeRiskBands = (variable: string, series: any): RiskBand[] => {
  const bands = Array.isArray(series?.risk_bands) ? series.risk_bands : null;
  if (bands?.length) {
    return bands
      .map((band: any) => ({
        label: String(band.label),
        color: String(band.color || RISK_COLOR_BY_LABEL[String(band.label)] || "#CCCCCC"),
        min: nullableNumber(band.min),
        max: nullableNumber(band.max),
      }))
      .filter((band: RiskBand) => band.label && band.color);
  }
  return fallbackBands(variable, series?.["50"] ?? []);
};

/* ---------- spinner ------------------------------------------------------- */
function ChartSpinner({ text = "Updating chart" }: { text?: string }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      350
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-white/50 backdrop-blur-sm z-[2000] pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label="Chart loading"
    >
      <div className="flex items-center gap-2 text-gray-700">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            opacity=".2"
          />
          <path
            d="M22 12a10 10 0 00-10-10"
            stroke="currentColor"
            strokeWidth="4"
          />
        </svg>
        <span className="font-medium">
          {text}
          {dots}
        </span>
      </div>
    </div>
  );
}

/* ---------- component ----------------------------------------------------- */
const PopupCharts: React.FC<Props> = ({
  compact = false,
  data,
  selectedVariable,
  isFetching = false,
  error,
  zone,
  interval,
}) => {
  // Early exits BEFORE any hooks -> safe for Rules of Hooks
  if (error) {
    const msg =
      (error as any)?.message ??
      (error as any)?.response?.data?.error ??
      (error as any)?.response?.statusText ??
      "Failed to load data";
    return (
      <div className="relative w-full h-full p-4 text-red-600">
        <div className="font-semibold mb-1">Couldn’t load chart data.</div>
        <div className="text-sm opacity-80 break-words">{String(msg)}</div>
      </div>
    );
  }
  if (!data?.time || !data.time.length) {
    return (
      <div className="relative w-full h-full">
        {isFetching ? (
          <ChartSpinner text="Fetching data" />
        ) : (
          <div className="p-4 text-gray-500">
            No data available for this range.
          </div>
        )}
      </div>
    );
  }

  /* ── unconditional hooks/derivations (order stable every render) ───────── */

  const time: string[] = data.time;
  const label = varLabels[selectedVariable] || selectedVariable;
  const yAxisTitle = unitMap[selectedVariable]
    ? `${label} (${unitMap[selectedVariable]})`
    : label;

  const intervalTitle = interval
    ? interval.charAt(0).toUpperCase() + interval.slice(1)
    : "Daily";

  // Bump uirevision when variable/interval/zone changes → reset axis state
  const uirev = useMemo(
    () => `${selectedVariable}|${interval ?? ""}|${zone ?? ""}`,
    [selectedVariable, interval, zone]
  );

  const [isPlotRendering, setIsPlotRendering] = useState(false);
  useEffect(() => {
    setIsPlotRendering(true);
  }, [selectedVariable, time]);

  const buildProbChart = useCallback(
    (medianArr: number[], eb?: { plus?: number[]; minus?: number[] }) => {
      const plus = eb?.plus ?? [];
      const minus = eb?.minus ?? [];
      const upper = medianArr.map((v, i) => v + (plus[i] ?? 0));
      const lower = medianArr.map((v, i) => v - (minus[i] ?? 0));
      const unit = unitMap[selectedVariable] ?? "";

      return [
        {
          x: time,
          y: medianArr,
          type: "scatter",
          mode: "lines",
          line: { color: BLUE, width: 0 },
          error_y: {
            type: "data",
            array: plus,
            arrayminus: minus,
            thickness: 1.5,
            width: 3,
            color: BLUE,
          },
          showlegend: false,
        },
        {
          x: time,
          y: upper,
          type: "scatter",
          mode: "markers",
          marker: { size: 12, color: "rgba(0,0,0,0)" },
          hovertemplate: `%{x}<br>100th percentile: %{y:.1f}${unit}<extra></extra>`,
          showlegend: false,
        },
        {
          x: time,
          y: lower,
          type: "scatter",
          mode: "markers",
          marker: { size: 12, color: "rgba(0,0,0,0)" },
          hovertemplate: `%{x}<br>0th percentile: %{y:.1f}${unit}<extra></extra>`,
          showlegend: false,
        },
        {
          x: [null],
          y: [null],
          type: "scatter",
          mode: "lines",
          line: { color: BLUE, width: 2 },
          name: `0th–100th ${label} Range`,
          hoverinfo: "skip",
        },
        {
          x: time,
          y: medianArr,
          type: "scatter",
          mode: "lines+markers",
          line: { color: BLACK, width: 2 },
          marker: { color: RED, size: 7 },
          name: "Median Trend (50th Percentile)",
          hovertemplate: `%{x}<br>${label} Median %{y:.1f}${unit}<extra></extra>`,
        },
      ];
    },
    [time, selectedVariable, label]
  );

  const baseMargins = compact
    ? { t: 24, b: 28, l: 48, r: 12 }
    : { t: 30, b: 40, l: 60, r: 20 };

  const legendCfg = compact
    ? { orientation: "h" as const, x: 0.5, xanchor: "center", y: 1.12 }
    : { x: 0.99, y: 0.99, xanchor: "right" as const, yanchor: "top" as const };

  const renderPlot = (plotData: any[], layout: any) => {
    const {
      margin: layoutMargin = {},
      xaxis: layoutXAxis = {},
      yaxis: layoutYAxis = {},
      ...restLayout
    } = layout;
    const titleText = `${intervalTitle} Probabilistic Forecast of<br>${label}`;
    // If the title spans two lines, give more headroom
    const needsExtraTop = titleText.includes("<br>");
    const marginTop = Math.max(
      baseMargins.t,
      needsExtraTop ? 72 : 44 // 72px for 2-line titles, 44px otherwise
    );
    const marginBottom = Math.max(
      baseMargins.b,
      compact ? 54 : 72,
      layoutMargin.b ?? 0
    );
    const xTickFormat =
      interval === "hourly"
        ? "%b %d<br>%H:%M"
        : interval === "monthly"
        ? "%b %Y"
        : "%b %d";

    return (
      <Suspense fallback={<ChartSpinner text="Loading chart" />}>
        <Plot
          data={plotData}
          layout={{
            ...restLayout,
            uirevision: uirev,
            autosize: true,
            paper_bgcolor: "white",
            plot_bgcolor: "white",
            title: {
              text: titleText,
              x: 0.5,
              y: 0.98, // pin title at very top of the paper
              yanchor: "top",
              pad: { t: 6, b: 4 }, // small breathing room around the title
            },
            margin: {
              ...baseMargins,
              ...layoutMargin,
              t: marginTop,
              b: marginBottom,
            },
            legend: {
              ...legendCfg,
              bgcolor: "rgba(255,255,255,0.8)",
              bordercolor: "rgba(0,0,0,0.2)",
              borderwidth: 1,
            },
            xaxis: {
              title: { text: interval === "hourly" ? "Time" : "Date" },
              type: "date",
              showticklabels: true,
              tickformat: xTickFormat,
              nticks: compact ? 5 : 8,
              ticks: "outside",
              automargin: true,
              autorange: true,
              ...layoutXAxis,
            },
            yaxis: {
              title: { text: yAxisTitle },
              automargin: true,
              ...layoutYAxis,
            },
          }}
          config={plotConfig}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
          onInitialized={() => setIsPlotRendering(false)}
          onUpdate={() => setIsPlotRendering(false)}
        />
      </Suspense>
    );
  };

  /* ── compute ALL memos unconditionally ─────────────────────────────────── */

  const key = mapping[selectedVariable] ?? selectedVariable;
  const obj = data[key];
  const riskMemo = useMemo(() => {
    if (!isRiskVariable(selectedVariable) || !obj?.["50"]?.length) return null;
    const median = obj["50"] as number[];
    const plus = obj.error_bars?.plus ?? [];
    const minus = obj.error_bars?.minus ?? [];
    const upper = median.map((value, index) => value + (plus[index] ?? 0));
    const lower = median.map((value, index) => value - (minus[index] ?? 0));
    const riskBands = normalizeRiskBands(selectedVariable, obj);
    const finiteCuts = finite(
      riskBands.flatMap((band) => [band.min, band.max])
    );
    const yValues = finite([...median, ...upper, ...lower, ...finiteCuts]);
    const rawMax = yValues.length ? Math.max(...yValues) : 100;
    const rawMin = yValues.length ? Math.min(...yValues) : 0;
    const yMin = Math.min(0, Math.floor(rawMin));
    const padding = Math.max(1, (rawMax - yMin) * 0.05);
    const yMax = Math.ceil(rawMax + padding);
    const traces = buildProbChart(median, obj.error_bars);
    const bands = riskBands.map((band) => ({
      y0: band.min ?? yMin,
      y1: band.max ?? yMax,
      color: toRgba(band.color),
    }));
    return { traces, bands, riskBands, yMin, yMax };
  }, [selectedVariable, obj, buildProbChart]);

  const genericTraces = useMemo(() => {
    const median = obj?.["50"] as number[] | undefined;
    if (!median?.length) return null;
    return buildProbChart(median, obj?.error_bars);
  }, [buildProbChart, obj]);

  const busy = isFetching || isPlotRendering;

  /* ── branch on JSX (no hooks below) ────────────────────────────────────── */

  if (isRiskVariable(selectedVariable) && riskMemo) {
    return (
      <div className="relative w-full h-full">
        {busy && (
          <ChartSpinner
            text={isFetching ? "Fetching data" : "Rendering chart"}
          />
        )}
        {renderPlot(riskMemo.traces, {
          margin: { b: 40, l: 60, r: 20 },
          hovermode: "closest",
          showlegend: false,
          yaxis: {
            range: [riskMemo.yMin, riskMemo.yMax],
            dtick: Math.max(1, Math.ceil((riskMemo.yMax - riskMemo.yMin) / 10)),
          },
          shapes: riskMemo.bands.map((b) => ({
            type: "rect",
            xref: "paper",
            x0: 0,
            x1: 1,
            yref: "y",
            y0: b.y0,
            y1: b.y1,
            fillcolor: b.color,
            line: { width: 0 },
            layer: "below",
          })),
        })}
        <CombinedRiskLegend
          rangeLabel={`0th–100th ${label} Range`}
          labels={riskMemo.riskBands.map((band) => band.label)}
          colors={riskMemo.riskBands.map((band) => band.color)}
        />
      </div>
    );
  }

  // generic fallback (probabilistic vars)
  if (!genericTraces) {
    return (
      <div className="p-4 text-gray-500">
        No&nbsp;{varLabels[selectedVariable] ?? selectedVariable}&nbsp;data for
        this period.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {busy && (
        <ChartSpinner text={isFetching ? "Fetching data" : "Rendering chart"} />
      )}
      {renderPlot(genericTraces, {
        margin: { t: 30, b: 40, l: 60, r: 20 },
        hovermode: "closest",
        // Ensure we reset y to fit data when returning from FWI/SFDI
        yaxis: { autorange: true },
        xaxis: { autorange: true }, // optional: keep x clean too
      })}
    </div>
  );
};

export default React.memo(PopupCharts, (prev, next) => {
  return (
    prev.selectedVariable === next.selectedVariable &&
    prev.isFetching === next.isFetching &&
    prev.data === next.data &&
    prev.error === next.error &&
    prev.zone === next.zone &&
    prev.interval === next.interval
  );
});
