import React from "react";

interface CardsProps {
  title: string;
  /** Raw value from API */
  value?: number | string | null;
  loading?: boolean;

  /** NEW: compact visual style */
  dense?: boolean;

  /** NEW: let parent pass extra styles (e.g., grid tweaks) */
  className?: string;

  /** NEW: override icon if needed */
  iconSrcOverride?: string;

  /** NEW: override decimals for this card */
  decimalsOverride?: number;
}

const iconByKey: Record<string, string> = {
  maxTemperature: "/images/cards/icons/max-temp.png",
  minTemperature: "/images/cards/icons/max-temp.png",
  maxWindSpeed: "/images/cards/icons/max-wind.png",
  minRelativeHumidity: "/images/cards/icons/max-humidity.png",
  maxFireWeatherIndex: "/images/cards/icons/fwi.png",
  maxSevereFireDangerIndex: "/images/cards/icons/sfdi.png",
  maxBurningIndex: "/images/cards/icons/bi.png",
  maxEnergyReleaseComponent: "/images/cards/icons/erc.png",
};

const unitByKey: Record<string, string> = {
  maxTemperature: "°F",
  minTemperature: "°F",
  maxWindSpeed: "mph",
  minRelativeHumidity: "%",
  maxFireWeatherIndex: "",
  maxSevereFireDangerIndex: "",
  maxBurningIndex: "",
  maxEnergyReleaseComponent: "kJ/m²",
};

/** Optional per-metric decimal places (fallback = 2) */
const decimalsByKey: Record<string, number> = {
  maxTemperature: 2,
  minTemperature: 2,
  maxWindSpeed: 2,
  minRelativeHumidity: 2,
  maxFireWeatherIndex: 2,
  maxSevereFireDangerIndex: 2,
  maxBurningIndex: 2,
  maxEnergyReleaseComponent: 2,
};

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────
const keyify = (s: string) =>
  s
    .replace(/[\s.\u00A0]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s)([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/\s+/g, "")
    .replace(/^[A-Z]/, (c) => c.toLowerCase());

const formatValue = (raw: number | string | null | undefined, decimals = 2) => {
  if (raw == null) return "—";
  if (typeof raw === "number" && Number.isFinite(raw))
    return raw.toFixed(decimals);
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber)) return asNumber.toFixed(decimals);
  return String(raw);
};

const Cards: React.FC<CardsProps> = ({
  title,
  value,
  loading,
  dense = false,
  className = "",
  iconSrcOverride,
  decimalsOverride,
}) => {
  const key = keyify(title);
  const unit = unitByKey[key] ?? "";
  const iconSrc =
    iconSrcOverride ?? iconByKey[key] ?? "/images/cards/icons/default.png";
  const decimals = decimalsOverride ?? decimalsByKey[key] ?? 2;

  const container =
    "rounded-xl border border-black/10 bg-white/80 " +
    (dense ? "px-4 py-3" : "px-4 py-3") +
    " flex flex-col h-full";

  const titleCls = dense
    ? "text-xs font-medium text-gray-700 mb-2 leading-tight"
    : "text-sm font-medium text-gray-700 mb-2 leading-tight";

  const valueCls = dense
    ? "text-lg font-bold text-gray-900"
    : "text-xl font-bold text-gray-900";

  const iconCls = dense ? "w-5 h-5 flex-shrink-0" : "w-6 h-6 flex-shrink-0";

  return (
    <div className={`${container} ${className}`} aria-busy={!!loading}>
      <div className={titleCls}>{title}</div>

      {loading ? (
        <div className="flex-1 flex items-center">
          <div
            className={
              dense
                ? "h-5 w-3/4 animate-pulse bg-gray-200 rounded"
                : "h-6 w-3/4 animate-pulse bg-gray-200 rounded"
            }
            aria-label="Loading value"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-between">
          <div className="flex flex-col">
            <span className={valueCls}>{formatValue(value, decimals)}</span>
            {unit && value != null && (
              <span
                className={
                  dense
                    ? "text-xs font-normal text-gray-600 mt-1"
                    : "text-sm font-normal text-gray-600 mt-1"
                }
              >
                {unit}
              </span>
            )}
          </div>
          <img src={iconSrc} alt="" className={iconCls} />
        </div>
      )}
    </div>
  );
};

export default Cards;
