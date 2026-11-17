import { describe, expect, it } from "vitest";

import {
  bookingReducer,
  canGoTo,
  completedSteps,
  initialBookingState,
  type BookingState,
} from "./booking-reducer";

const slot = { starts_at: "2030-06-10T09:00:00-07:00", ends_at: "2030-06-10T09:30:00-07:00" };
const anonymous = { hasPatient: false };
const patient = { hasPatient: true };

const filled: BookingState = {
  ...initialBookingState,
  step: "time",
  serviceId: 1,
  dentistId: 2,
  date: "2030-06-10",
  slot,
};

describe("bookingReducer", () => {
  it("does not advance until the current step is complete", () => {
    const state = bookingReducer(initialBookingState, { type: "next", context: anonymous });
    expect(state.step).toBe("service");

    const chosen = bookingReducer(initialBookingState, { type: "selectService", serviceId: 1 });
    expect(bookingReducer(chosen, { type: "next", context: anonymous }).step).toBe("dentist");
  });

  it.each([
    ["selectService", { type: "selectService", serviceId: 9 }],
    ["selectDentist", { type: "selectDentist", dentistId: 9 }],
    ["selectDate", { type: "selectDate", date: "2030-06-11" }],
  ] as const)("%s clears the chosen slot", (_name, action) => {
    expect(bookingReducer(filled, action).slot).toBeNull();
  });

  it("keeps the slot when re-selecting the same service", () => {
    expect(bookingReducer(filled, { type: "selectService", serviceId: 1 }).slot).toEqual(slot);
  });

  it("only jumps to steps whose previous steps are complete", () => {
    expect(
      bookingReducer(initialBookingState, { type: "goTo", step: "time", context: anonymous }).step,
    ).toBe("service");
    expect(bookingReducer(filled, { type: "goTo", step: "service", context: anonymous }).step).toBe(
      "service",
    );
  });

  it("requires a signed-in patient before confirming", () => {
    const details = { ...filled, step: "details" as const };
    expect(canGoTo(details, "confirm", anonymous)).toBe(false);
    expect(bookingReducer(details, { type: "next", context: anonymous }).step).toBe("details");
    expect(bookingReducer(details, { type: "next", context: patient }).step).toBe("confirm");
  });

  it("sends the visitor back to pick a time when the slot was taken", () => {
    const state = bookingReducer({ ...filled, step: "confirm" }, { type: "slotTaken" });
    expect(state.step).toBe("time");
    expect(state.slot).toBeNull();
    expect(state.serviceId).toBe(1);
  });

  it("derives completed steps from the state", () => {
    expect(completedSteps(filled, patient)).toEqual({
      service: true,
      dentist: true,
      time: true,
      details: true,
      confirm: false,
    });
  });
});
