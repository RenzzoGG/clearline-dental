import type { AppointmentStatus, StatusAction } from "../../lib/types";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<
  AppointmentStatus,
  { badge: string; card: string; dot: string }
> = {
  pending: {
    badge: "bg-amber-100 text-amber-800",
    card: "bg-amber-50 ring-amber-200",
    dot: "bg-amber-500",
  },
  confirmed: {
    badge: "bg-sky-100 text-sky-800",
    card: "bg-sky-50 ring-sky-200",
    dot: "bg-sky-500",
  },
  completed: {
    badge: "bg-emerald-100 text-emerald-800",
    card: "bg-emerald-50 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelled: {
    badge: "bg-ink-100 text-ink-600",
    card: "bg-ink-50 ring-ink-200",
    dot: "bg-ink-400",
  },
};

export const ACTION_RESULT: Record<StatusAction, AppointmentStatus> = {
  confirm: "confirmed",
  complete: "completed",
  cancel: "cancelled",
};

export const ACTION_LABELS: Record<StatusAction, string> = {
  confirm: "Confirm",
  complete: "Mark completed",
  cancel: "Cancel",
};

/**
 * Actions offered in the UI. Mirrors the backend lifecycle so we only show useful buttons;
 * the API remains the authority (it answers 409 for anything invalid).
 */
export function availableActions(
  status: AppointmentStatus,
  startsAt: string,
  now = new Date(),
): StatusAction[] {
  switch (status) {
    case "pending":
      return ["confirm", "cancel"];
    case "confirmed":
      return new Date(startsAt) <= now ? ["complete", "cancel"] : ["cancel"];
    default:
      return [];
  }
}
