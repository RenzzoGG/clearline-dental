import { useCallback, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Spinner } from "../../components/ui/Spinner";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { addDays, formatDateKey, startOfWeekKey, todayKey } from "../../lib/time";
import { useDentists } from "../site/queries";
import { AppointmentDrawer } from "./AppointmentDrawer";
import { DayView } from "./DayView";
import { useAppointments } from "./queries";
import { STATUS_LABELS, STATUS_STYLES } from "./status";
import { WeekView } from "./WeekView";

type View = "day" | "week";

export default function SchedulePage() {
  useDocumentTitle("Schedule");
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(todayKey);
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Stable identity: the drawer's focus/Escape effect depends on it.
  const closeDrawer = useCallback(() => setSelectedId(null), []);

  const weekStart = startOfWeekKey(anchor);
  const [from, to] = view === "day" ? [anchor, anchor] : [weekStart, addDays(weekStart, 6)];
  const { data: appointments = [], isPending, isError, isFetching } = useAppointments(from, to);
  const { data: dentists = [] } = useDentists();

  const visible = showCancelled
    ? appointments
    : appointments.filter((a) => a.status !== "cancelled");
  // Look the selection up in fresh data so the drawer reflects optimistic status changes.
  const selected = appointments.find((a) => a.id === selectedId) ?? null;
  const step = view === "day" ? 1 : 7;
  const title =
    view === "day"
      ? formatDateKey(anchor, "long")
      : `${formatDateKey(from)} – ${formatDateKey(to)}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Schedule</h1>
          <p className="flex items-center gap-2 text-ink-600" aria-live="polite">
            {title}
            {isFetching && !isPending && <Spinner className="size-4" />}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-ink-100 p-1" role="group" aria-label="View">
            {(["day", "week"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  view === option
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setAnchor(todayKey())}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous"
            onClick={() => setAnchor(addDays(anchor, -step))}
          >
            <Icon name="chevronLeft" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next"
            onClick={() => setAnchor(addDays(anchor, step))}
          >
            <Icon name="chevronRight" />
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600">
        {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${STATUS_STYLES[status].dot}`}
              aria-hidden="true"
            />
            {STATUS_LABELS[status]}
          </span>
        ))}
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-brand-700"
            checked={showCancelled}
            onChange={(event) => setShowCancelled(event.target.checked)}
          />
          Show cancelled
        </label>
      </div>

      <div className="mt-6">
        {isPending ? (
          <Spinner label="Loading appointments…" />
        ) : isError ? (
          <p className="text-red-700">Appointments could not be loaded.</p>
        ) : view === "day" ? (
          <DayView appointments={visible} dentists={dentists} onOpen={(a) => setSelectedId(a.id)} />
        ) : (
          <WeekView
            weekStart={weekStart}
            appointments={visible}
            onOpen={(a) => setSelectedId(a.id)}
            onPickDay={(day) => {
              setAnchor(day);
              setView("day");
            }}
          />
        )}
      </div>

      <AppointmentDrawer appointment={selected} onClose={closeDrawer} />
    </div>
  );
}
