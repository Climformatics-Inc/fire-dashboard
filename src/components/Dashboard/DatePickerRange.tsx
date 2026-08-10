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

const DatePickerRange = ({
  date,
  setCalendarRange,
}: {
  date: { from: Date; to: Date };
  setCalendarRange: (range: { from: Date; to: Date }) => void;
}) => {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const displayDate = (value: Date) =>
    isValid(value) ? format(value, "MMM d, yyyy") : "Pick a date";

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
              <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
              {displayDate(date.from)}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="z-[3000] w-auto border-black bg-white p-0 text-black"
            align="start"
          >
            <Calendar
              mode="single"
              selected={date.from}
              defaultMonth={date.from}
              onSelect={selectFrom}
              initialFocus
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
              <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
              {displayDate(date.to)}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="z-[3000] w-auto border-black bg-white p-0 text-black"
            align="start"
          >
            <Calendar
              mode="single"
              selected={date.to}
              defaultMonth={date.to}
              onSelect={selectTo}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default DatePickerRange;
