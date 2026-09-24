/** UI variable keys → folder names in usa-gridmet-map-data-do */
export const UI_TO_TILE_VAR: Record<string, string> = {
  relativeHumMax: "rmax",
  relativeHumMin: "rmin",
  temperatureMax: "tmmx",
  temperatureMin: "tmmn",
  windSpeed: "vs",
  fireWeatherIndex: "fwi",
  heatStressIndex: "hsi",
  severeFireDangerIndex: "sfdi",
};

export const TILE_BUCKET_ORIGIN =
  "https://usa-gridmet-map-data-do.sfo3.digitaloceanspaces.com";

export type TileAvailability = {
  schema_version: string;
  updated_at: string;
  variables: Record<
    string,
    { dates: string[]; kind?: string; count?: number }
  >;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateHasTiles(available: Set<string> | undefined, d: Date): boolean {
  if (!available) return false;
  return available.has(ymd(d));
}

export { ymd as toYmd };
