import { addDays as addDaysFns, format, parseISO } from "date-fns";

import { CLINIC_TIME_ZONE } from "./config";

/**
 * All dates/times are shown in the clinic's time zone, whatever the browser's zone is.
 * "Date keys" are plain YYYY-MM-DD strings in clinic local time.
 */

/**
 * Formatters are created on first use, not at import time: building the first Intl formatter
 * with a time zone loads ICU time-zone data, a noticeable main-thread cost that would land on
 * every page importing this module (e.g. /book before the visitor reaches the time step).
 */
function lazyFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  let formatter: Intl.DateTimeFormat | undefined;
  return () =>
    (formatter ??= new Intl.DateTimeFormat(locale, { timeZone: CLINIC_TIME_ZONE, ...options }));
}

const timeFormatter = lazyFormatter("en-US", { hour: "numeric", minute: "2-digit" });

const dateKeyFormatter = lazyFormatter("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourMinuteFormatter = lazyFormatter("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "9:00 AM" in clinic time. */
export const formatTime = (iso: string): string => timeFormatter().format(new Date(iso));

/** "9:00 AM – 9:30 AM" in clinic time. */
export const formatTimeRange = (startIso: string, endIso: string): string =>
  `${formatTime(startIso)} – ${formatTime(endIso)}`;

/** Clinic-local calendar date of an instant, as YYYY-MM-DD. */
export const toDateKey = (iso: string | Date): string =>
  dateKeyFormatter().format(typeof iso === "string" ? new Date(iso) : iso);

/** Today's date in the clinic, as YYYY-MM-DD. */
export const todayKey = (now: Date = new Date()): string => toDateKey(now);

/** Minutes since clinic-local midnight (for placing appointments on a time grid). */
export const minutesOfDay = (iso: string): number => {
  const [hours = "0", minutes = "0"] = hourMinuteFormatter().format(new Date(iso)).split(":");
  return Number(hours) * 60 + Number(minutes);
};

/** Date-only arithmetic on YYYY-MM-DD keys (no time zone involved). */
export const addDays = (dateKey: string, days: number): string =>
  format(addDaysFns(parseISO(dateKey), days), "yyyy-MM-dd");

/** Monday of the week containing dateKey. */
export const startOfWeekKey = (dateKey: string): string => {
  const weekday = parseISO(dateKey).getDay(); // 0 = Sunday
  return addDays(dateKey, weekday === 0 ? -6 : 1 - weekday);
};

export const isSundayKey = (dateKey: string): boolean => parseISO(dateKey).getDay() === 0;

/** "Mon, Jun 10" for a date key. */
export const formatDateKey = (
  dateKey: string,
  pattern: "short" | "long" | "weekday" | "day" = "short",
): string => {
  const date = parseISO(dateKey);
  switch (pattern) {
    case "long":
      return format(date, "EEEE, MMMM d");
    case "weekday":
      return format(date, "EEE");
    case "day":
      return format(date, "d");
    default:
      return format(date, "EEE, MMM d");
  }
};
