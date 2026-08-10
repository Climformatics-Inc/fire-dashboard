export type LegendSegment = { min:number; max:number; label:string; color:string; weight:number };
export type LegendResp = {
  variable:string; palette:string; reverse:boolean; units?:string;
  mode:'discrete'; range:[number,number]; segments:LegendSegment[]; schema_version:string;
};

const configuredApiBase = import.meta.env.VITE_API_BASE as string | undefined;
const configuredApiKey = import.meta.env.VITE_API_KEY as string | undefined;
const API_BASE =
  configuredApiBase && configuredApiBase !== "undefined"
    ? configuredApiBase
    : "";
const API_KEY =
  configuredApiKey && configuredApiKey !== "undefined" ? configuredApiKey : "";

export type LegendOpts = {
  steps?: number;
  breaks?: number[];
  labels?: string[];
  palette?: string;
  orientation?: 'horizontal'|'vertical';
};

export async function fetchLegend(variable: string, opts: LegendOpts = {}): Promise<LegendResp> {
  if (!API_BASE) {
    throw new Error("Legend API base is not configured");
  }

  const p = new URLSearchParams({ variable, format: "json" });
  if (opts.steps) p.set("steps", String(opts.steps));
  if (opts.breaks?.length! > 1) p.set("breaks", opts.breaks!.join(","));
  if (opts.labels?.length) p.set("labels", opts.labels!.join(","));
  if (opts.palette) p.set("palette", opts.palette);
  if (opts.orientation) p.set("orientation", opts.orientation);

  const res = await fetch(`${API_BASE}/v1/legend?${p}`, {
    headers: { "x-api-key": API_KEY },
  });
  if (!res.ok) throw new Error(`Legend ${res.status}`);
  return res.json();
}

export function toColorBarData(resp: LegendResp) {
  return resp.segments.map(s => ({
    value: Math.max(1, s.weight),
    color: s.color,
    legend: { value: s.label },
  }));
}
