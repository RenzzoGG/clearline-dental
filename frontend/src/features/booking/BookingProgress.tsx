import { motion } from "motion/react";

import { STEP_LABELS, STEPS, type Step } from "./booking-reducer";

export function BookingProgress({
  step,
  canGoTo,
  onGoTo,
}: {
  step: Step;
  canGoTo: (step: Step) => boolean;
  onGoTo: (step: Step) => void;
}) {
  const index = STEPS.indexOf(step);
  const progress = (index + 1) / STEPS.length;

  return (
    <nav aria-label="Booking steps">
      <div
        className="h-2 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-label="Booking progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={index + 1}
        aria-valuetext={`Step ${index + 1} of ${STEPS.length}: ${STEP_LABELS[step]}`}
      >
        {/* scaleX instead of width: a compositor-only animation. */}
        <motion.div
          className="h-full origin-left rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
          initial={false}
          animate={{ scaleX: progress }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
        />
      </div>
      <ol className="mt-3 hidden justify-between text-sm sm:flex">
        {STEPS.map((item, itemIndex) => {
          const current = item === step;
          const reachable = canGoTo(item);
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => onGoTo(item)}
                disabled={!reachable || current}
                aria-current={current ? "step" : undefined}
                className={[
                  "rounded-md px-1 font-semibold transition-colors",
                  current
                    ? "text-brand-700"
                    : itemIndex < index
                      ? "text-ink-700 hover:text-brand-700"
                      : "text-ink-400",
                  reachable && !current ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                {itemIndex + 1}. {STEP_LABELS[item]}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
