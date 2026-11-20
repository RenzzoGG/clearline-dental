import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";

import { Spinner } from "../../../components/ui/Spinner";
import { api } from "../../../lib/api";
import { addDays, formatDateKey, formatTime, minutesOfDay, todayKey } from "../../../lib/time";
import type { Slot } from "../../../lib/types";

const DAYS_SHOWN = 14;
const NOON = 12 * 60;

export function TimeStep({
  dentistId,
  serviceId,
  date,
  slot,
  onDate,
  onSlot,
}: {
  dentistId: number;
  serviceId: number;
  date: string | null;
  slot: Slot | null;
  onDate: (date: string) => void;
  onSlot: (slot: Slot) => void;
}) {
  const today = todayKey();
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i));
  const selectedDate = date ?? today;

  const { data, isPending, isError } = useQuery({
    queryKey: ["availability", dentistId, serviceId, selectedDate],
    queryFn: ({ signal }) => api.availability(dentistId, serviceId, selectedDate, signal),
    staleTime: 30_000,
  });
  const slots = data?.slots ?? [];
  const groups = [
    { label: "Morning", slots: slots.filter((s) => minutesOfDay(s.starts_at) < NOON) },
    { label: "Afternoon", slots: slots.filter((s) => minutesOfDay(s.starts_at) >= NOON) },
  ].filter((group) => group.slots.length);

  return (
    <div>
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
        role="group"
        aria-label="Choose a day"
      >
        {days.map((day) => {
          const selected = day === selectedDate;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={selected}
              onClick={() => onDate(day)}
              className={[
                "flex w-16 shrink-0 flex-col items-center rounded-2xl py-2.5 ring-1 transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                selected
                  ? "bg-brand-700 text-white ring-brand-700"
                  : "bg-white text-ink-700 ring-ink-200 hover:ring-brand-300",
              ].join(" ")}
            >
              <span className="text-xs font-medium uppercase">{formatDateKey(day, "weekday")}</span>
              <span className="text-lg font-bold">{formatDateKey(day, "day")}</span>
            </button>
          );
        })}
      </div>

      <h3 className="mt-6 font-semibold text-ink-900">{formatDateKey(selectedDate, "long")}</h3>
      <div className="mt-3 min-h-40" aria-live="polite">
        {isPending ? (
          <Spinner label="Checking availability…" />
        ) : isError ? (
          <p className="text-red-700">Availability could not be loaded. Please try again.</p>
        ) : groups.length === 0 ? (
          <p className="rounded-2xl bg-ink-50 p-4 text-ink-600">
            No openings this day. Please choose another date.
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <m.div
              key={selectedDate}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-sm font-medium text-ink-500">{group.label}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {group.slots.map((option) => {
                      const selected = slot?.starts_at === option.starts_at;
                      return (
                        <button
                          key={option.starts_at}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => onSlot(option)}
                          className={[
                            "rounded-xl py-2.5 text-sm font-semibold ring-1 transition-colors",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                            selected
                              ? "bg-brand-700 text-white ring-brand-700"
                              : "bg-white text-ink-700 ring-ink-200 hover:ring-brand-400",
                          ].join(" ")}
                        >
                          {formatTime(option.starts_at)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </m.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
