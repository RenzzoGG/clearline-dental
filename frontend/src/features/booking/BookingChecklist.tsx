import { motion } from "motion/react";

import { STEP_LABELS, type Step } from "./booking-reducer";

export interface ChecklistItem {
  step: Step;
  done: boolean;
  /** What was chosen, e.g. the service name. */
  detail?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Live summary: each finished step gets a drawn check and an animated strike-through. */
export function BookingChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <aside className="rounded-3xl bg-ink-50 p-6 ring-1 ring-ink-100">
      <h2 className="font-bold text-ink-900">Your visit</h2>
      <ul className="mt-4 space-y-4">
        {items.map(({ step, done, detail }) => (
          <li key={step} className="flex gap-3">
            <span
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
                done ? "bg-brand-600 text-white" : "bg-white text-transparent ring-1 ring-ink-200"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={false}
                  animate={{ pathLength: done ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                />
              </svg>
            </span>
            <div className="min-w-0">
              <span
                className={`relative inline-block font-semibold ${done ? "text-ink-400" : "text-ink-800"}`}
              >
                {STEP_LABELS[step]}
                <motion.span
                  aria-hidden="true"
                  className="absolute top-1/2 left-0 h-0.5 w-full origin-left rounded bg-ink-400"
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: done ? 0.15 : 0 }}
                />
                {done && <span className="sr-only"> (completed)</span>}
              </span>
              {detail && <p className="truncate text-sm text-ink-600">{detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
