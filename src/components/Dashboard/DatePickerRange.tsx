import React, { useState } from "react";
import { format, isAfter, isBefore, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Interval } from "./hooks/useChart";
import { formatWeekLabel, singleWeekRange } from "./utils/weekRange";

const calendarPopoverProps = {
  className: "z-[3000] w-auto border-black bg-white p-0 text-black",
  align: "start" as const,
  side: "right" as const,
  sideOffset: 8,
  avoidCollisions: false,
};

type DatePickerRangeProps = {
  date: { from: Date; to: Date };
  setCalendarRange: (range: { from: Date; to: Date }) => void;
  interval?: Interval;
  availableYmd?: Set<string>;
  availabilityLoaded?: boolean;
  availabilityError?: string | null;
};

const DatePickerRange = ({
  date,
  setCalendarRange,
  interval = "daily",
  availableYmd,
  availabilityLoaded = false,
  availabilityError = null,
}: DatePickerRangeProps) => {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);
  const isWeekly = interval === "weekly";

  const showTileShading =
    availabilityLoaded && !availabilityError && availableYmd != null;
  const hasAnyTiles = (availableYmd?.size ?? 0) > 0;

  const isAvailable = (value: Date) =>
    !!availableYmd?.has(format(value, "yyyy-MM-dd"));

  const calendarExtras = showTileShading
    ? {
        modifiers: { hasTiles: isAvailable },
        modifiersClassNames: { hasTiles: "rdp-day-has-tiles" },
      }
    : {};

  const displayDate = (value: Date) =>
    isValid(value) ? format(value, "MMM d, yyyy") : "Pick a date";

  const selectWeek = (value?: Date) => {
    if (!value || !isValid(value)) return;
    setCalendarRange(singleWeekRange(value));
    setWeekOpen(false);
  };

  const selectFrom = (value?: Date) => {
    if (!value || !isValid(value)) return;
    setCalendarRange({
      from: value,
      to: isAfter(value, date.to) ? value : date.to,
    });
    setFromOpen(false);
  };

  const selectTo = (value?: Date) => {
    if (!value || !isValid(value)) return;
    setCalendarRange({
      from: isBefore(value, date.from) ? value : date.from,
      to: value,
    });
    setToOpen(false);
  };

  const availabilityHint = !availabilityLoaded
    ? null
    : availabilityError
      ? "Could not load which days have map tiles; all dates are selectable."
      : !hasAnyTiles
        ? "No map tiles for this variable yet."
        : "Shaded days have a map overlay. White days are still selectable; the map will be blank.";

  if (isWeekly) {
    return (
      <div className="flex flex-col gap-3 text-black bg-white p-3 rounded border border-black">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Week</label>
          <Popover open={weekOpen} onOpenChange={setWeekOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-start border-black bg-white px-3 text-left text-base font-normal text-black"
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">{formatWeekLabel(date.from)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent {...calendarPopoverProps}>
              <Calendar
                mode="single"
                selected={date.from}
                defaultMonth={date.from}
                onSelect={selectWeek}
                initialFocus
                {...calendarExtras}
              />
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-slate-600">
          Weeks run Monday–Sunday. Pick any day in a week to select that full week.
        </p>
        {availabilityHint ? (
          <p className="text-xs text-slate-600">{availabilityHint}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-black bg-white p-3 rounded border border-black">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">From</label>
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-start border-black bg-white px-3 text-left text-base font-normal text-black"
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate">{displayDate(date.from)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent {...calendarPopoverProps}>
            <Calendar
              mode="single"
              selected={date.from}
              defaultMonth={date.from}
              onSelect={selectFrom}
              initialFocus
              {...calendarExtras}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">To</label>
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-start border-black bg-white px-3 text-left text-base font-normal text-black"
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate">{displayDate(date.to)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent {...calendarPopoverProps}>
            <Calendar
              mode="single"
              selected={date.to}
              defaultMonth={date.to}
              onSelect={selectTo}
              initialFocus
              {...calendarExtras}
            />
          </PopoverContent>
        </Popover>
      </div>
      {availabilityHint ? (
        <p className="text-xs text-slate-600">{availabilityHint}</p>
      ) : null}
    </div>
  );
};

export default DatePickerRange;
