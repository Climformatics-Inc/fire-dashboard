import { useEffect } from "react";
import type { Interval } from "../hooks/useChart";

export type UrlState = {
  zone?: string;
  variable?: string;
  interval?: Interval | string;
  from?: string;
  to?: string;
  t?: string | number;
  popup?: string;
};

export function useUrlState(
  current: UrlState,
  onInit: (u: UrlState) => void
) {
  // READ once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u: UrlState = {
      zone: params.get("zone") ?? undefined,
      variable: params.get("var") ?? undefined,
      interval: params.get("int") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      t: params.get("t") ?? undefined,
      popup: params.get("popup") ?? undefined, // ← NEW
    };
    onInit(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WRITE when current changes (omit popup so it’s one-shot)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const set = (k: string, v?: unknown) =>
      v == null || v === "" ? p.delete(k) : p.set(k, String(v));

    set("var", current.variable);
    set("int", current.interval);
    set("from", current.from);
    set("to", current.to);
    set("zone", current.zone);
    set("t", current.t);
    // do NOT set "popup" here to avoid re-opening on refresh

    const search = p.toString();
    const hash = window.location.hash || "#/";
    const url = `${window.location.pathname}${search ? `?${search}` : ""}${hash}`;
    window.history.replaceState(null, "", url);
  }, [
    current.variable,
    current.interval,
    current.from,
    current.to,
    current.zone,
    current.t,
  ]);
}
