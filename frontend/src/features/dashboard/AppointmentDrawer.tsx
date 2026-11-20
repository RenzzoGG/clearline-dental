import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef } from "react";

import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api";
import { formatDateKey, formatTimeRange, toDateKey } from "../../lib/time";
import type { Appointment, StatusAction } from "../../lib/types";
import { StrikeText } from "./AppointmentCard";
import { useTransitionAppointment } from "./queries";
import { ACTION_LABELS, availableActions } from "./status";
import { StatusBadge } from "./StatusBadge";

/** Side panel with details and status actions. Escape or the backdrop closes it. */
export function AppointmentDrawer({
  appointment,
  onClose,
}: {
  appointment: Appointment | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {appointment && (
        <DrawerPanel key={appointment.id} appointment={appointment} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

function DrawerPanel({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const transition = useTransitionAppointment();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const run = (action: StatusAction) => transition.mutate({ id: appointment.id, action });
  const actions = availableActions(appointment.status, appointment.starts_at);
  const errorMessage =
    transition.error instanceof ApiError
      ? transition.error.message
      : transition.error
        ? "Could not update the appointment."
        : null;

  return (
    <>
      <m.div
        className="fixed inset-0 z-40 bg-ink-900/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        <div className="flex items-start justify-between border-b border-ink-100 p-6">
          <div className="min-w-0">
            <StatusBadge status={appointment.status} />
            <h2 id="appointment-title" className="mt-3 text-xl font-bold text-ink-900">
              <StrikeText
                text={appointment.patient_name}
                struck={appointment.status === "completed"}
              />
            </h2>
            <p className="text-ink-600">{appointment.service_name}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-500 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500"
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </div>

        <dl className="space-y-4 p-6 text-sm">
          <div className="flex gap-3">
            <Icon name="calendar" className="size-5 text-brand-600" />
            <div>
              <dt className="sr-only">Date</dt>
              <dd className="font-semibold text-ink-900">
                {formatDateKey(toDateKey(appointment.starts_at), "long")}
              </dd>
              <dd className="text-ink-600">
                {formatTimeRange(appointment.starts_at, appointment.ends_at)}
              </dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Icon name="user" className="size-5 text-brand-600" />
            <div>
              <dt className="sr-only">Dentist</dt>
              <dd className="font-semibold text-ink-900">Dr. {appointment.dentist_name}</dd>
            </div>
          </div>
          {appointment.notes && (
            <div className="rounded-xl bg-ink-50 p-3 text-ink-700">
              <dt className="mb-1 font-semibold">Notes</dt>
              <dd>{appointment.notes}</dd>
            </div>
          )}
        </dl>

        <div className="mt-auto space-y-3 border-t border-ink-100 p-6">
          {errorMessage && <Alert>{errorMessage}</Alert>}
          {actions.length === 0 ? (
            <p className="text-sm text-ink-500">
              This appointment is {appointment.status}; no further changes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action}
                  variant={action === "cancel" ? "danger" : "primary"}
                  onClick={() => run(action)}
                  disabled={transition.isPending}
                >
                  {ACTION_LABELS[action]}
                </Button>
              ))}
            </div>
          )}
          {appointment.status === "confirmed" && !actions.includes("complete") && (
            <p className="text-xs text-ink-500">It can be marked completed once it starts.</p>
          )}
        </div>
      </m.div>
    </>
  );
}
