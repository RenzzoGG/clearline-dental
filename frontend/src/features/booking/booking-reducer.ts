import type { Slot } from "../../lib/types";

export const STEPS = ["service", "dentist", "time", "details", "confirm"] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABELS: Record<Step, string> = {
  service: "Service",
  dentist: "Dentist",
  time: "Date & time",
  details: "Your details",
  confirm: "Confirm",
};

export interface BookingState {
  step: Step;
  serviceId: number | null;
  dentistId: number | null;
  date: string | null; // YYYY-MM-DD, clinic local
  slot: Slot | null;
}

/**
 * Facts owned by other parts of the app (not duplicated in this state).
 * hasPatient: the visitor is signed in as a patient (comes from the auth context).
 */
export interface BookingContext {
  hasPatient: boolean;
}

export type BookingAction =
  | { type: "selectService"; serviceId: number }
  | { type: "selectDentist"; dentistId: number }
  | { type: "selectDate"; date: string }
  | { type: "selectSlot"; slot: Slot }
  | { type: "goTo"; step: Step; context: BookingContext }
  | { type: "next"; context: BookingContext }
  | { type: "back" }
  | { type: "slotTaken" }
  | { type: "reset" };

export const initialBookingState: BookingState = {
  step: "service",
  serviceId: null,
  dentistId: null,
  date: null,
  slot: null,
};

/** Whether each step has what it needs. Drives the checklist, the stepper and "Continue". */
export function completedSteps(
  state: BookingState,
  context: BookingContext,
): Record<Step, boolean> {
  return {
    service: state.serviceId !== null,
    dentist: state.dentistId !== null,
    time: state.slot !== null,
    details: context.hasPatient,
    confirm: false,
  };
}

/** A step is reachable when every step before it is complete. */
export function canGoTo(state: BookingState, step: Step, context: BookingContext): boolean {
  const done = completedSteps(state, context);
  return STEPS.slice(0, STEPS.indexOf(step)).every((previous) => done[previous]);
}

const stepAt = (index: number): Step => STEPS[Math.min(Math.max(index, 0), STEPS.length - 1)]!;

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "selectService":
      // A different service changes the duration, so the chosen slot may no longer fit.
      return action.serviceId === state.serviceId
        ? state
        : { ...state, serviceId: action.serviceId, slot: null };
    case "selectDentist":
      return action.dentistId === state.dentistId
        ? state
        : { ...state, dentistId: action.dentistId, slot: null };
    case "selectDate":
      return action.date === state.date ? state : { ...state, date: action.date, slot: null };
    case "selectSlot":
      return { ...state, slot: action.slot };
    case "goTo":
      return canGoTo(state, action.step, action.context) ? { ...state, step: action.step } : state;
    case "next": {
      const next = stepAt(STEPS.indexOf(state.step) + 1);
      const ready = completedSteps(state, action.context)[state.step];
      return ready && canGoTo(state, next, action.context) ? { ...state, step: next } : state;
    }
    case "back":
      return { ...state, step: stepAt(STEPS.indexOf(state.step) - 1) };
    case "slotTaken":
      // Someone booked it first: send the visitor back to pick another time.
      return { ...state, slot: null, step: "time" };
    case "reset":
      return initialBookingState;
  }
}
