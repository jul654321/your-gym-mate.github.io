import { useMemo } from "react";

import { startOfDay, startOfWeek } from "../../lib/date/week";
import { Button } from "../ui/button";

interface WeekBarProps {
  referenceDate: number | Date;
  selectedDate?: number;
  onDayClick: (dateMs: number) => void;
  onPrevWeek: () => void;
  hasSessionForDate: (dateMs: number) => boolean;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

const LARGE_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function WeekBar({
  referenceDate,
  selectedDate,
  onDayClick,
  onPrevWeek,
  hasSessionForDate,
}: WeekBarProps) {
  const weekStart = useMemo(() => startOfWeek(referenceDate), [referenceDate]);
  const currentWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const isCurrentWeek = weekStart.getTime() >= currentWeekStart.getTime();

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [weekStart]);

  const selectedDayStart = selectedDate
    ? startOfDay(selectedDate).getTime()
    : undefined;

  const headerLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(weekStart));

  return (
    <div aria-label="Weekly selector">
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <Button
          type="button"
          onClick={onPrevWeek}
          disabled={isCurrentWeek}
          aria-label="Show previous week"
          variant="ghost"
          size="sm"
        >
          Previous Week
        </Button>
        <p className="text-sm text-card-foreground">Week of {headerLabel}</p>
      </div>
      <div className="flex gap-1 overflow-x-auto px-1">
        {daysOfWeek.map((date) => {
          const dayStart = startOfDay(date).getTime();
          const isSelected = dayStart === selectedDayStart;
          const hasSession = hasSessionForDate(dayStart);
          const dayLabel = LARGE_DATE_FORMATTER.format(date);
          const dotStatus = hasSession ? "has sessions" : "no sessions";

          return (
            <button
              key={dayStart}
              type="button"
              onClick={() => onDayClick(dayStart)}
              aria-pressed={isSelected}
              aria-label={`${dayLabel} — ${dotStatus}`}
              className={`flex min-w-[40px] flex-col items-center rounded-xl border p-2 text-center shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isSelected
                  ? "border-primary bg-primary/10 font-semibold text-primary shadow-primary/50"
                  : "border-transparent bg-secondary text-secondary-foreground hover:border-secondary hover:text-secondary-foreground"
              }`}
            >
              <span className="text-xs text-muted-foreground">
                {WEEKDAY_FORMATTER.format(date)}
              </span>
              <span className="text-lg mt-1 font-semibold leading-tight">
                {date.getDate()}
              </span>
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full transition ${
                  hasSession ? "bg-primary" : "bg-card"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
