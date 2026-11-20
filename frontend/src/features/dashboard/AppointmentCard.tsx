import { motion } from "motion/react";
import type { CSSProperties } from "react";

import { formatTime } from "../../lib/time";
import type { Appointment } from "../../lib/types";
import { STATUS_LABELS, STATUS_STYLES } from "./status";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Name with an animated strike-through once the appointment is completed. */
export function StrikeText({ text, struck }: { text: string; struck: boolean }) {
  return (
    <span className="relative inline-block max-w-full truncate align-bottom">
      {text}
      <motion.span
        aria-hidden="true"
        className="absolute top-1/2 left-0 h-[1.5px] w-full origin-left bg-current"
        initial={false}
        animate={{ scaleX: struck ? 1 : 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      />
    </span>
  );
}

export function AppointmentCard({
  appointment,
  onOpen,
  compact = false,
  showDentist = false,
  className = "",
  style,
}: {
  appointment: Appointment;
  onOpen: (appointment: Appointment) => void;
  compact?: boolean;
  showDentist?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { status } = appointment;
  return (
    <button
      type="button"
      onClick={() => onOpen(appointment)}
      style={style}
      aria-label={`${formatTime(appointment.starts_at)} ${appointment.patient_name}, ${appointment.service_name}, ${STATUS_LABELS[status]}`}
      className={[
        "group w-full overflow-hidden rounded-xl px-2.5 py-1.5 text-left ring-1 transition-[background-color,opacity,box-shadow] duration-300",
        "hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
        STATUS_STYLES[status].card,
        status === "cancelled" ? "opacity-60" : "",
        className,
      ].join(" ")}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
        <span
          className={`size-1.5 shrink-0 rounded-full ${STATUS_STYLES[status].dot}`}
          aria-hidden="true"
        />
        {/* The time never wraps; the dentist name is what gets truncated (min-w-0). */}
        <span className="shrink-0 whitespace-nowrap">{formatTime(appointment.starts_at)}</span>
        {showDentist && (
          <span className="min-w-0 truncate font-medium">· {appointment.dentist_name}</span>
        )}
      </span>
      <span
        className={`block text-sm font-semibold ${status === "completed" ? "text-ink-500" : "text-ink-900"}`}
      >
        <StrikeText text={appointment.patient_name} struck={status === "completed"} />
      </span>
      {!compact && (
        <span className="block truncate text-xs text-ink-600">{appointment.service_name}</span>
      )}
    </button>
  );
}
