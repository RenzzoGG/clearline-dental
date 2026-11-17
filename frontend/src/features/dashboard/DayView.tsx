import { minutesOfDay } from "../../lib/time";
import type { Appointment, Dentist } from "../../lib/types";
import { AppointmentCard } from "./AppointmentCard";

const PX_PER_MINUTE = 1.4;
const DEFAULT_START = 9 * 60;
const DEFAULT_END = 18 * 60;

const label = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  return `${((hour + 11) % 12) + 1} ${hour < 12 ? "AM" : "PM"}`;
};

/** Time grid with one column per dentist (how clinics actually read a day). */
export function DayView({
  appointments,
  dentists,
  onOpen,
}: {
  appointments: Appointment[];
  dentists: Dentist[];
  onOpen: (appointment: Appointment) => void;
}) {
  // Widen the grid if an appointment falls outside opening hours (e.g. added in the admin).
  const starts = appointments.map((a) => minutesOfDay(a.starts_at));
  const ends = appointments.map((a) => minutesOfDay(a.ends_at));
  const gridStart = Math.floor(Math.min(DEFAULT_START, ...starts) / 60) * 60;
  const gridEnd = Math.ceil(Math.max(DEFAULT_END, ...ends) / 60) * 60;
  const hours = Array.from({ length: (gridEnd - gridStart) / 60 }, (_, i) => gridStart + i * 60);
  const height = (gridEnd - gridStart) * PX_PER_MINUTE;

  const columns = dentists.filter(
    (d) => d.is_active || appointments.some((a) => a.dentist === d.id),
  );

  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-ink-200">
      <div className="min-w-[44rem]">
        <div
          className="sticky top-0 z-10 grid border-b border-ink-200 bg-white"
          style={{ gridTemplateColumns: `4rem repeat(${columns.length}, minmax(9rem, 1fr))` }}
        >
          <span />
          {columns.map((dentist) => (
            <span
              key={dentist.id}
              className="truncate border-l border-ink-100 px-3 py-3 text-sm font-semibold text-ink-900"
            >
              Dr. {dentist.full_name}
            </span>
          ))}
        </div>
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `4rem repeat(${columns.length}, minmax(9rem, 1fr))`,
            height,
          }}
        >
          <div className="relative">
            {hours.map((minutes) => (
              <span
                key={minutes}
                className="absolute right-2 -translate-y-1/2 text-xs text-ink-400"
                style={{ top: (minutes - gridStart) * PX_PER_MINUTE }}
              >
                {minutes === gridStart ? "" : label(minutes)}
              </span>
            ))}
          </div>
          {columns.map((dentist) => (
            <div key={dentist.id} className="relative border-l border-ink-100">
              {hours.map((minutes) => (
                <div
                  key={minutes}
                  className="absolute inset-x-0 border-t border-ink-100"
                  style={{ top: (minutes - gridStart) * PX_PER_MINUTE }}
                />
              ))}
              {appointments
                .filter((a) => a.dentist === dentist.id)
                .map((appointment) => {
                  const top = (minutesOfDay(appointment.starts_at) - gridStart) * PX_PER_MINUTE;
                  const minutes =
                    minutesOfDay(appointment.ends_at) - minutesOfDay(appointment.starts_at);
                  return (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onOpen={onOpen}
                      compact={minutes < 45}
                      className="absolute inset-x-1"
                      style={{ top: top + 1, height: Math.max(minutes * PX_PER_MINUTE - 2, 24) }}
                    />
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
