import { describe, expect, it } from "vitest";

import { availableActions } from "./status";

describe("availableActions", () => {
  const now = new Date("2030-06-10T17:00:00Z");

  it("mirrors the backend lifecycle", () => {
    expect(availableActions("pending", "2030-06-11T16:00:00Z", now)).toEqual(["confirm", "cancel"]);
    expect(availableActions("completed", "2030-06-10T16:00:00Z", now)).toEqual([]);
    expect(availableActions("cancelled", "2030-06-10T16:00:00Z", now)).toEqual([]);
  });

  it("only offers 'complete' once the appointment has started", () => {
    expect(availableActions("confirmed", "2030-06-11T16:00:00Z", now)).toEqual(["cancel"]);
    expect(availableActions("confirmed", "2030-06-10T16:00:00Z", now)).toEqual([
      "complete",
      "cancel",
    ]);
  });
});
