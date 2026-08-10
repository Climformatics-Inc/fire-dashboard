import React, {
  useCallback,
  useMemo,
  useState,
  useDeferredValue,
} from "react";
import { type Interval } from "./hooks/useChart";
import DatePickerRange from "./DatePickerRange";

/** Single source of truth for variables */
type VarKey =
  | "temperatureMax"
  | "temperatureMin"
  | "windSpeed"
  | "fireWeatherIndex"
  | "relativeHumMax"
  | "relativeHumMin"
  | "severeFireDangerIndex"
  | "heatStressIndex"
  | "burn_index"
  | "energy_release_component";

type VariableDef = {
  key: VarKey;
  label: string;
  icon: string;
  unit?: string;
  description?: string;
};

/** Tiles currently available on the map (keep in sync with VARIABLE_MAPPING in MapView) */
const TILE_SUPPORTED = new Set<VarKey>([
  "relativeHumMax",
  "relativeHumMin",
  "temperatureMax",
  "temperatureMin",
  "windSpeed",
  "fireWeatherIndex",
  "heatStressIndex",
  "severeFireDangerIndex",
]);

const VARIABLES: VariableDef[] = [
  {
    key: "temperatureMax",
    label: "Temp Max",
    icon: "/images/cards/icons/max-temp.png",
    unit: "°F",
  },
  {
    key: "temperatureMin",
    label: "Temp Min",
    icon: "/images/cards/icons/max-temp.png",
    unit: "°F",
  },
  {
    key: "relativeHumMax",
    label: "RH Max",
    icon: "/images/cards/icons/max-humidity.png",
    unit: "%",
  },
  {
    key: "relativeHumMin",
    label: "RH Min",
    icon: "/images/cards/icons/max-humidity.png",
    unit: "%",
  },
  {
    key: "windSpeed",
    label: "Wind Speed",
    icon: "/images/cards/icons/max-wind.png",
    unit: "mph",
  },
  {
    key: "fireWeatherIndex",
    label: "FWI",
    icon: "/images/cards/icons/fwi.png",
    unit: "",
  },
  {
    key: "heatStressIndex",
    label: "HSI",
    icon: "/images/cards/icons/fwi.png",
    unit: "",
  },

  {
    key: "severeFireDangerIndex",
    label: "SFDI",
    icon: "/images/cards/icons/sfdi.png",
    unit: "",
  },
  {
    key: "burn_index",
    label: "Burn Index",
    icon: "/images/cards/icons/bi.png",
    unit: "",
    description: "Chart-only",
  },
  {
    key: "energy_release_component",
    label: "Energy Release Component",
    icon: "/images/cards/icons/erc.png",
    unit: "",
    description: "Chart-only",
  },
];

interface SidePanelProps {
  interval: Interval;
  setInterval: React.Dispatch<React.SetStateAction<Interval>>;
  calendarRange: { from: Date; to: Date };
  setCalendarRange: React.Dispatch<
    React.SetStateAction<{ from: Date; to: Date }>
  >;
  selectedVariable: string; // You can tighten to VarKey later if desired
  setSelectedVariable: React.Dispatch<React.SetStateAction<string>>; // same here
}

const SidePanel: React.FC<SidePanelProps> = React.memo(
  ({
    interval,
    setInterval,
    calendarRange,
    setCalendarRange,
    selectedVariable,
    setSelectedVariable,
  }) => {
    const [query, setQuery] = useState("");

    // Smooth search typing with React 18 deferred value
    const deferredQuery = useDeferredValue(query);
    const filtered = useMemo(() => {
      const q = deferredQuery.trim().toLowerCase();
      return q
        ? VARIABLES.filter(
            (v) =>
              v.label.toLowerCase().includes(q) ||
              v.key.toLowerCase().includes(q)
          )
        : VARIABLES;
    }, [deferredQuery]);

    const tileVars = useMemo(
      () => filtered.filter((v) => TILE_SUPPORTED.has(v.key)),
      [filtered]
    );
    const chartOnlyVars = useMemo(
      () => filtered.filter((v) => !TILE_SUPPORTED.has(v.key)),
      [filtered]
    );

    // Ordered union for keyboard navigation
    const allVars = useMemo(
      () => [...tileVars, ...chartOnlyVars],
      [tileVars, chartOnlyVars]
    );

    // Keyboard navigation for variables listbox
    const onVarsKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!allVars.length) return;

        const curIndex = Math.max(
          0,
          allVars.findIndex((v) => v.key === (selectedVariable as any))
        );

        const moveTo = (i: number) => {
          const next = allVars[i];
          if (next) setSelectedVariable(next.key as any);
        };

        switch (e.key) {
          case "ArrowDown":
            moveTo((curIndex + 1) % allVars.length);
            e.preventDefault();
            break;
          case "ArrowUp":
            moveTo((curIndex - 1 + allVars.length) % allVars.length);
            e.preventDefault();
            break;
          case "Home":
            moveTo(0);
            e.preventDefault();
            break;
          case "End":
            moveTo(allVars.length - 1);
            e.preventDefault();
            break;
          case "Enter":
          case " ":
            // Selection already updated via arrows; prevent page scroll on Space
            e.preventDefault();
            break;
          case "Escape":
            if (query) {
              setQuery("");
              e.preventDefault();
            }
            break;
          default:
            break;
        }
      },
      [allVars, selectedVariable, setSelectedVariable, query]
    );

    const activeOptionId = useMemo(
      () => `var-${selectedVariable}`,
      [selectedVariable]
    );

    const VarButton: React.FC<{ v: VariableDef }> = ({ v }) => {
      const active = selectedVariable === v.key;
      const chartOnly = !TILE_SUPPORTED.has(v.key);
      return (
        <button
          id={`var-${v.key}`}
          role="option"
          aria-selected={active}
          type="button"
          onClick={() => setSelectedVariable(v.key)}
          className={[
            "relative w-full min-h-[44px]",
            // reserve space on the right so long labels never touch the badge/icon
            "group flex items-center justify-between gap-3 rounded-xl border pl-3 pr-5 py-2 text-left transition",
            active
              ? "bg-white shadow-sm ring-1 ring-black/5 border-gray-200"
              : "bg-white/70 hover:bg-white/90 border-gray-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
          ].join(" ")}
          aria-pressed={active}
          title={v.description || v.label}
        >
          <div className="min-w-0">
            <div className="font-medium leading-tight">{v.label}</div>
            <div className="text-xs text-gray-500">
              {chartOnly ? "Chart only" : v.unit ? `Unit: ${v.unit}` : ""}
            </div>
          </div>
          <img src={v.icon} alt="" className="w-5 h-5 shrink-0 opacity-80" />
          {chartOnly && (
            <span className="pointer-events-none absolute top-1 right-[-12px] z-10 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 shadow">
              No map tiles
            </span>
          )}
        </button>
      );
    };

    return (
      <div className="text-black p-3 space-y-4">
        {/* Interval segmented control */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Time Scale
          </label>
          <div
            className="rounded-xl bg-white/70 backdrop-blur border border-gray-200 p-2"
            aria-label="Time Scale"
          >
            <div className="inline-flex w-full items-center justify-center rounded-lg border border-blue-300 bg-blue-50 px-2 py-1 text-sm capitalize text-blue-800">
              Daily
            </div>
          </div>
        </div>

        {/* Date range picker */}
        <DatePickerRange
          date={calendarRange}
          setCalendarRange={setCalendarRange}
        />

        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Variables
          </label>
          <input
            type="text"
            placeholder="Search variables…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            className="w-full rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
          />
        </div>

        {/* Variables listbox (keyboard nav) */}
        <div
          role="listbox"
          aria-label="Variables"
          aria-activedescendant={activeOptionId}
          tabIndex={0}
          onKeyDown={onVarsKeyDown}
          className="space-y-4 overflow-visible"
        >
          {/* Map-supported variables */}
          <div className="space-y-2">
            <div className="sticky top-0 z-[1] -mx-3 px-3 py-1 text-xs font-semibold text-gray-600 bg-white/80 backdrop-blur border-b border-gray-100">
              Map &amp; Chart
            </div>
            <div className="grid grid-cols-1 gap-2">
              {tileVars.map((v) => (
                <VarButton key={v.key} v={v} />
              ))}
              {tileVars.length === 0 && (
                <div className="text-xs text-gray-500">No matches.</div>
              )}
            </div>
          </div>

          {/* Chart-only variables */}
          <div className="space-y-2">
            <div className="sticky top-0 z-[1] -mx-3 px-3 py-1 text-xs font-semibold text-gray-600 bg-white/80 backdrop-blur border-b border-gray-100">
              Chart-only
            </div>
            <div className="grid grid-cols-1 gap-2">
              {chartOnlyVars.map((v) => (
                <VarButton key={v.key} v={v} />
              ))}
              {chartOnlyVars.length === 0 && (
                <div className="text-xs text-gray-500">No matches.</div>
              )}
            </div>
          </div>
        </div>

        {/* SR-only live announcement for screen readers */}
        <span className="sr-only" aria-live="polite">
          Selected variable:{" "}
          {VARIABLES.find((x) => x.key === (selectedVariable as any))?.label ??
            ""}
        </span>
      </div>
    );
  }
);

export default SidePanel;
