import { useState, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { cn } from "cn";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  ariaLabel?: string;
}

function DatePicker({ value, onChange, ariaLabel }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => {
    if (!value) return undefined;
    const date = parseISO(value);
    return isNaN(date.getTime()) ? undefined : date;
  }, [value]);

  const handleSelect = useCallback(
    (day: Date | undefined) => {
      if (day) {
        const yyyy = day.getFullYear();
        const mm = String(day.getMonth() + 1).padStart(2, "0");
        const dd = String(day.getDate()).padStart(2, "0");
        onChange(`${yyyy}-${mm}-${dd}`);
      }
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setOpen(false);
    },
    [onChange]
  );

  const handleToday = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      onChange(`${yyyy}-${mm}-${dd}`);
      setOpen(false);
    },
    [onChange]
  );

  const displayValue = selected ? format(selected, "dd MMM yyyy") : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(
          "flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
          !displayValue && "text-muted-foreground"
        )}
      >
        <span className="flex-1 truncate">{displayValue || "Select date..."}</span>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          captionLayout="dropdown"
          showOutsideDays
          fixedWeeks
        />
        <div className="flex items-center justify-between border-t border-border p-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
