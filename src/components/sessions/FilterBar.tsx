import { useEffect, useMemo, useState } from "react";
import { Input } from "../ui/input";
import type { SessionListQueryParams } from "../../types";

const STATUS_OPTIONS: SessionListQueryParams["status"][] = [
  "all",
  "active",
  "completed",
];

const PRESET_OPTIONS: Array<{ label: string; days?: number }> = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All" },
];

interface FilterBarProps {
  onChange: (params: SessionListQueryParams) => void;
  initial?: SessionListQueryParams;
}

export function FilterBar({ onChange, initial }: FilterBarProps) {
  const [status, setStatus] = useState<SessionListQueryParams["status"]>(
    initial?.status ?? "all"
  );
  const [query, setQuery] = useState(initial?.q ?? "");
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");

  useEffect(() => {
    setStatus(initial?.status ?? "all");
    setQuery(initial?.q ?? "");
    setFrom(initial?.from ?? "");
    setTo(initial?.to ?? "");
  }, [initial]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onChange({
        status,
        q: query.trim().length >= 2 ? query.trim() : undefined,
        from: from || undefined,
        to: to || undefined,
        pageSize: initial?.pageSize,
      });
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [status, query, from, to, onChange, initial?.pageSize]);

  const handlePreset = (days?: number) => {
    if (!days) {
      setFrom("");
      setTo("");
      return;
    }

    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - days);

    setFrom(fromDate.toISOString().slice(0, 10));
    setTo(toDate.toISOString().slice(0, 10));
  };

  const handleReset = () => {
    setStatus("all");
    setQuery("");
    setFrom("");
    setTo("");
  };

  return (
    <section className="space-y-3 rounded-2xl bg-white/80 p-4 shadow-lg shadow-slate-200 backdrop-blur">
      <h2 className="text-lg font-semibold text-slate-900">Filter Sessions</h2>
      <div className="flex flex-wrap items-center gap-3">
        {/* <div className="flex gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                status === option
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => setStatus(option)}
            >
              {option === "all"
                ? "All"
                : (option?.charAt(0).toUpperCase() ?? "") +
                    (option?.slice(1) ?? "") || ""}
            </button>
          ))}
        </div> */}
        <div className="flex gap-2">
          {PRESET_OPTIONS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
              onClick={() => handlePreset(preset.days)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search sessions (min 2 characters)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Filter sessions by name"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Start date filter"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="End date filter"
          />
          <button
            type="button"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div> */}
    </section>
  );
}
