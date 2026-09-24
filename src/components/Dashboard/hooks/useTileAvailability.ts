import { useEffect, useMemo, useState } from "react";
import {
  TILE_BUCKET_ORIGIN,
  UI_TO_TILE_VAR,
  type TileAvailability,
} from "../constants/tileVars";

async function loadAvailability(): Promise<TileAvailability> {
  const urls = [
    `${TILE_BUCKET_ORIGIN}/availability.json`,
    "/availability.json",
  ];
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) {
        lastError = new Error(`availability ${res.status} from ${url}`);
        continue;
      }
      return (await res.json()) as TileAvailability;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new Error("availability.json unavailable");
}

export function useTileAvailability(uiVariable: string) {
  const [index, setIndex] = useState<TileAvailability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAvailability()
      .then((data) => {
        if (!cancelled) {
          setIndex(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tileVar = UI_TO_TILE_VAR[uiVariable];
  const availableYmd = useMemo(() => {
    const dates = tileVar ? index?.variables?.[tileVar]?.dates : undefined;
    return new Set(dates ?? []);
  }, [index, tileVar]);

  return { availableYmd, loaded, error, tileVar, updatedAt: index?.updated_at };
}
