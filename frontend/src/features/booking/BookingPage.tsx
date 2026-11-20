import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";

import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Spinner } from "../../components/ui/Spinner";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { api, ApiError } from "../../lib/api";
import { formatDateKey, formatTime, toDateKey } from "../../lib/time";
import { isStaff, type Appointment, type Me } from "../../lib/types";
import { useAuth } from "../auth/auth-context";
import { useDentists, useServices } from "../site/queries";
import { BookingChecklist } from "./BookingChecklist";
import { BookingProgress } from "./BookingProgress";
import {
  bookingReducer,
  canGoTo,
  completedSteps,
  initialBookingState,
  STEP_LABELS,
  STEPS,
  type BookingContext,
  type Step,
} from "./booking-reducer";
import { BookingSuccess } from "./BookingSuccess";
import { ConfirmStep } from "./steps/ConfirmStep";
import { DentistStep } from "./steps/DentistStep";
import { ServiceStep } from "./steps/ServiceStep";
import { TimeStep } from "./steps/TimeStep";

// Step 4 carries the forms (react-hook-form + zod). Loading it lazily keeps them out of the
// JS needed to paint /book; it is prefetched as soon as the visitor reaches the time step.
const loadDetailsStep = () => import("./steps/DetailsStep");
const DetailsStep = lazy(() =>
  loadDetailsStep().then((module) => ({ default: module.DetailsStep })),
);

const STEP_INTROS: Record<Step, string> = {
  service: "What would you like to come in for?",
  dentist: "Who would you like to see?",
  time: "Pick a day and a time that works for you.",
  details: "Tell us who's coming in.",
  confirm: "Check everything and confirm your visit.",
};

const isBookablePatient = (user: Me | null) => Boolean(user && !isStaff(user) && user.patient);

export default function BookingPage() {
  useDocumentTitle("Book a visit");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: services } = useServices();
  const { data: dentists } = useDentists();
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const context: BookingContext = { hasPatient: isBookablePatient(user) };
  const done = completedSteps(state, context);
  const service = services?.find((s) => s.id === state.serviceId);
  const dentist = dentists?.find((d) => d.id === state.dentistId);

  // Prefetch the forms one step early so step 4 opens without a spinner.
  useEffect(() => {
    if (state.step === "time") void loadDetailsStep();
  }, [state.step]);

  // Move focus to the step heading so keyboard/screen reader users know where they are.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [state.step]);

  const book = useMutation({
    mutationFn: () =>
      api.createAppointment({
        dentist: state.dentistId!,
        service: state.serviceId!,
        starts_at: state.slot!.starts_at,
      }),
    onSuccess: (appointment) => {
      setBooked(appointment);
      void queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        // Most likely the slot was taken (overlap) or is no longer bookable.
        setNotice(
          `${error.fieldError() ?? error.fieldError("starts_at") ?? error.message} Please pick another time.`,
        );
        void queryClient.invalidateQueries({ queryKey: ["availability"] });
        dispatch({ type: "slotTaken" });
      }
    },
  });

  if (booked) {
    return (
      <section className="bg-mint-50 px-4 py-20">
        <BookingSuccess
          appointment={booked}
          onBookAnother={() => {
            setBooked(null);
            book.reset();
            dispatch({ type: "reset" });
          }}
        />
      </section>
    );
  }

  const detailFor = (step: Step): string | undefined => {
    switch (step) {
      case "service":
        return service?.name;
      case "dentist":
        return dentist ? `Dr. ${dentist.full_name}` : undefined;
      case "time":
        return state.slot
          ? `${formatDateKey(toDateKey(state.slot.starts_at))} · ${formatTime(state.slot.starts_at)}`
          : undefined;
      case "details":
        return done.details && user ? `${user.first_name} ${user.last_name}` : undefined;
      default:
        return undefined;
    }
  };
  const checklist = STEPS.filter((step) => step !== "confirm").map((step) => ({
    step,
    done: done[step],
    detail: detailFor(step),
  }));

  const stepIndex = STEPS.indexOf(state.step);
  const next = () => dispatch({ type: "next", context });

  return (
    // overflow-x-clip: the sliding step transition (x: ±24px) must not cause sideways
    // scrolling on phones. "clip" (not "hidden") keeps the checklist's sticky positioning.
    <section className="overflow-x-clip bg-white py-12 md:py-16">
      {/* Padding inside the max-width box, like the header, so edges line up. */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Book a visit
        </h1>
        <div className="mt-6">
          <BookingProgress
            step={state.step}
            canGoTo={(step) => canGoTo(state, step, context)}
            onGoTo={(step) => dispatch({ type: "goTo", step, context })}
          />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
          {/* min-w-0: grid items default to min-width:auto, so the scrollable day picker
              would otherwise widen the column (and the page) instead of scrolling. */}
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={state.step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <p className="text-sm font-semibold text-brand-600">
                  Step {stepIndex + 1} of {STEPS.length}
                </p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-1 text-xl font-bold text-ink-900 outline-none"
                >
                  {STEP_LABELS[state.step]}
                </h2>
                <p className="mt-1 text-ink-600">{STEP_INTROS[state.step]}</p>

                {notice && state.step === "time" && (
                  <div className="mt-4">
                    <Alert>{notice}</Alert>
                  </div>
                )}

                <div className="mt-6">
                  {state.step === "service" && (
                    <ServiceStep
                      value={state.serviceId}
                      onChange={(serviceId) => dispatch({ type: "selectService", serviceId })}
                    />
                  )}
                  {state.step === "dentist" && (
                    <DentistStep
                      value={state.dentistId}
                      onChange={(dentistId) => dispatch({ type: "selectDentist", dentistId })}
                    />
                  )}
                  {state.step === "time" && state.serviceId && state.dentistId && (
                    <TimeStep
                      serviceId={state.serviceId}
                      dentistId={state.dentistId}
                      date={state.date}
                      slot={state.slot}
                      onDate={(date) => dispatch({ type: "selectDate", date })}
                      onSlot={(slot) => {
                        setNotice(null);
                        dispatch({ type: "selectSlot", slot });
                      }}
                    />
                  )}
                  {state.step === "details" && (
                    <Suspense fallback={<Spinner label="Loading…" />}>
                      <DetailsStep
                        onReady={(me) =>
                          dispatch({ type: "next", context: { hasPatient: isBookablePatient(me) } })
                        }
                      />
                    </Suspense>
                  )}
                  {state.step === "confirm" && service && dentist && state.slot && user && (
                    <>
                      {book.isError &&
                        !(book.error instanceof ApiError && book.error.status === 400) && (
                          <div className="mb-4">
                            <Alert>We couldn&apos;t complete your booking. Please try again.</Alert>
                          </div>
                        )}
                      <ConfirmStep
                        service={service}
                        dentist={dentist}
                        slot={state.slot}
                        user={user}
                      />
                    </>
                  )}
                </div>
              </m.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-6">
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: "back" })}
                disabled={stepIndex === 0}
                icon={<Icon name="arrowLeft" className="size-4" />}
              >
                Back
              </Button>
              {state.step === "confirm" ? (
                <Button
                  variant="accent"
                  size="lg"
                  loading={book.isPending}
                  onClick={() => book.mutate()}
                >
                  Confirm booking
                </Button>
              ) : (
                <Button onClick={next} disabled={!done[state.step]}>
                  Continue <Icon name="arrowRight" className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <BookingChecklist items={checklist} />
          </div>
        </div>
      </div>
    </section>
  );
}
