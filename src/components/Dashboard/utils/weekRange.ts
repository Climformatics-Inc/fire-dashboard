import { endOfWeek, format, isValid, startOfWeek } from "date-fns";

/** Forecast weeks align to ISO-style weeks (Monday start). */
export const WEEK_STARTS_ON = 1 as const;

export type DateRange = { from: Date; to: Date };

export function startOfForecastWeek(value: Date): Date {
  return startOfWeek(value, { weekStartsOn: WEEK_STARTS_ON });
}

export function endOfForecastWeek(value: Date): Date {
  return endOfWeek(value, { weekStartsOn: WEEK_STARTS_ON });
}

/** One forecast week (Monday–Sunday) containing the picked day. */
export function singleWeekRange(value: Date): DateRange {
  const from = startOfForecastWeek(value);
  return { from, to: endOfForecastWeek(from) };
}

export function formatWeekLabel(value: Date): string {
  if (!isValid(value)) return "Pick a week";
  const start = startOfForecastWeek(value);
  const end = endOfForecastWeek(value);
  return `Week of ${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function rangesEqual(a: DateRange, b: DateRange): boolean {
  return +a.from === +b.from && +a.to === +b.to;
}
