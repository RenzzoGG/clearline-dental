import { describe, expect, it } from "vitest";

import { addDays, formatTime, minutesOfDay, startOfWeekKey, toDateKey, todayKey } from "./time";

// The test script runs with TZ=Asia/Tokyo: results must not depend on the browser's zone.
describe("clinic time helpers (America/Hermosillo, UTC-7)", () => {
  it("formats times in clinic local time", () => {
    expect(formatTime("2030-06-10T16:00:00Z")).toBe("9:00 AM");
    expect(formatTime("2030-06-10T09:00:00-07:00")).toBe("9:00 AM");
  });

  it("uses the clinic's calendar date, not UTC's", () => {
    // 20:00 in Hermosillo is already the next day in UTC (and in Tokyo).
    expect(toDateKey("2030-06-11T03:00:00Z")).toBe("2030-06-10");
    expect(todayKey(new Date("2030-06-11T03:00:00Z"))).toBe("2030-06-10");
  });

  it("computes minutes since clinic-local midnight", () => {
    expect(minutesOfDay("2030-06-10T16:30:00Z")).toBe(9 * 60 + 30);
  });

  it("does date-only arithmetic on keys", () => {
    expect(addDays("2030-06-30", 1)).toBe("2030-07-01");
    expect(startOfWeekKey("2030-06-12")).toBe("2030-06-10"); // Wednesday -> Monday
    expect(startOfWeekKey("2030-06-16")).toBe("2030-06-10"); // Sunday -> previous Monday
  });
});
