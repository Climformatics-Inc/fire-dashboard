import { useEffect, useMemo, useState } from "react";
import { uiToVar } from "../constants/legendVars";
import { fetchLegend, toColorBarData, LegendResp } from "../utils/legendApi";

const FWI_BREAKS = [0,5,12,25,40,60];
const FWI_LABELS = ["Low","Moderate","Elevated","High","Severe"];

export function defaultLegendOptions(uiVar: string) {
  switch (uiVar) {
    case "fireWeatherIndex":        return { breaks: FWI_BREAKS, labels: FWI_LABELS };
    case "severeFireDangerIndex":   return { breaks: FWI_BREAKS, labels: FWI_LABELS };
    case "heatStressIndex":         return { steps: 11 };
    default:                        return { steps: 10 };
  }
}

export function useLegend(uiVar: string) {
  const [bar, setBar] = useState<any[] | null>(null);
  const [meta, setMeta] = useState<LegendResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiVar = uiToVar[uiVar];
  const opts = useMemo(() => defaultLegendOptions(uiVar), [uiVar]);

  useEffect(() => {
    let abort = false;
    setBar(null); setMeta(null); setError(null);
    if (!apiVar) { setError("Unknown variable"); return; }

    fetchLegend(apiVar, opts)
      .then(r => { if (!abort) { setMeta(r); setBar(toColorBarData(r)); } })
      .catch(e => { if (!abort) setError(String(e)); });

    return () => { abort = true; };
  }, [apiVar, JSON.stringify(opts)]);

  return { bar, meta, error };
}