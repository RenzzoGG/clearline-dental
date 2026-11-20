import { addDays, formatDateKey, toDateKey, todayKey } from "../../lib/time";
import type { Appointment } from "../../lib/types";
import { AppointmentCard } from "./AppointmentCard";

/** Seven day columns, each listing that day's appointments in order. */
export function WeekView({
  weekStart,
  appointments,
  onOpen,
  onPickDay,
}: {
  weekStart: string;
  appointments: Appointment[];
  onOpen: (appointment: Appointment) => void;
  onPickDay: (day: string) => void;
}) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[56rem] grid-cols-7 gap-3">
        {days.map((day) => {
          const items = appointments.filter((a) => toDateKey(a.starts_at) === day);
          const active = items.filter((a) => a.status !== "cancelled").length;
          return (
            <section
              key={day}
              aria-label={formatDateKey(day, "long")}
              className="flex min-w-0 flex-col"
            >
              <button
                type="button"
                onClick={() => onPickDay(day)}
                className={`mb-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-ink-100 ${
                  day === today ? "bg-brand-50 ring-1 ring-brand-200" : ""
                }`}
              >
                <span className="block text-xs font-semibold text-ink-500 uppercase">
                  {formatDateKey(day, "weekday")}
                </span>
                <span className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-ink-900">
                    {formatDateKey(day, "day")}
                  </span>
                  <span className="text-xs text-ink-500">{active} appts</span>
                </span>
              </button>
              <div className="max-h-[36rem] space-y-1.5 overflow-y-auto pr-1">
                {items.length === 0 ? (
                  <p className="rounded-xl bg-ink-50 px-2 py-3 text-center text-xs text-ink-500">
                    No appointments
                  </p>
                ) : (
                  items.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onOpen={onOpen}
                      showDentist
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
