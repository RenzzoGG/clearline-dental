import { m } from "motion/react";
import { Link } from "react-router";

import { Button, buttonClasses } from "../../components/ui/Button";
import { formatDateKey, formatTimeRange, toDateKey } from "../../lib/time";
import type { Appointment } from "../../lib/types";

export function BookingSuccess({
  appointment,
  onBookAnother,
}: {
  appointment: Appointment;
  onBookAnother: () => void;
}) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl shadow-brand-900/5 ring-1 ring-ink-100"
      role="status"
    >
      <svg viewBox="0 0 52 52" className="mx-auto size-20" aria-hidden="true">
        <m.circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          className="stroke-brand-600"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <m.path
          d="M15 27l7 7 15-15"
          fill="none"
          className="stroke-brand-600"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.45, ease: "easeOut" }}
        />
      </svg>
      <h2 className="mt-6 text-2xl font-extrabold text-ink-900">You&apos;re booked!</h2>
      <p className="mt-2 text-ink-600">
        {appointment.service_name} with Dr. {appointment.dentist_name}
        <br />
        <span className="font-semibold text-ink-900">
          {formatDateKey(toDateKey(appointment.starts_at), "long")},{" "}
          {formatTimeRange(appointment.starts_at, appointment.ends_at)}
        </span>
      </p>
      <p className="mt-4 text-sm text-ink-500">
        Your request is pending; the front desk will confirm it shortly.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className={buttonClasses("secondary")}>
          Back to home
        </Link>
        <Button onClick={onBookAnother}>Book another visit</Button>
      </div>
    </m.div>
  );
}
