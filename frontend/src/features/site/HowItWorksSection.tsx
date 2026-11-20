import { RevealGroup, RevealItem } from "../../components/Reveal";
import { SectionHeader } from "./SectionHeader";
import { OFFSCREEN_SECTION } from "./offscreen";
import { Thread } from "./Thread";

export const BOOKING_STEPS = [
  {
    title: "Pick a service",
    short: "Service",
    body: "Checkup, whitening, a filling… each one with its duration and price shown up front.",
  },
  {
    title: "Choose your dentist",
    short: "Dentist",
    body: "Meet the team and pick who you'd like to see, or whoever is free first.",
  },
  {
    title: "Find a time",
    short: "Time",
    body: "Real-time availability, so the slot you see is a slot you get.",
  },
  {
    title: "You're booked",
    short: "Booked",
    body: "Create your account in one step and get your visit confirmed by the front desk.",
  },
] as const;

const stepNumber = (index: number) => String(index + 1).padStart(2, "0");

/**
 * 02 — How booking works.
 *
 * Two presentations, switched by CSS only (so layout never depends on JavaScript and there
 * is no layout shift):
 * - Large screens with motion on: a tall track with a sticky ("pinned") panel. Scrolling
 *   through the track advances "the clear line" down the number column and swaps the
 *   active step. The driver (motion/Enhancements) only writes `--pin-progress` and
 *   `data-active-step`; before it loads, step 1 is shown.
 * - Phones, or motion off: the four steps as a static grid.
 * Only one is displayed at a time, so screen readers never get the steps twice; in the
 * pinned panel all four stay in the DOM (inactive ones are only visually hidden).
 */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className={`${OFFSCREEN_SECTION} relative isolate scroll-mt-20 bg-mint-50 py-24 lg:py-32`}
    >
      {/* The pinned panel draws its own line; the section thread is for the static layout. */}
      <span className="lg:motion-on:hidden">
        <Thread />
      </span>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          number="02"
          label="How it works"
          title={
            <>
              Four calm steps, <em className="text-brand-600">about a minute</em>
            </>
          }
        />

        <RevealGroup className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-ink-200 ring-1 ring-ink-200 sm:grid-cols-2 lg:grid-cols-4 lg:motion-on:hidden">
          {BOOKING_STEPS.map((step, index) => (
            <RevealItem key={step.title} index={index} className="bg-white p-7">
              <span aria-hidden="true" className="font-display text-4xl text-brand-600">
                {stepNumber(index)}
              </span>
              <h3 className="mt-6 font-display text-2xl text-ink-900">{step.title}</h3>
              <p className="mt-2 text-ink-600">{step.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>

        <div data-pin data-active-step="0" className="pin-track mt-6 hidden lg:motion-on:block">
          <div className="sticky top-[4.5rem] grid h-[calc(100dvh-4.5rem)] grid-cols-12 items-center gap-x-10">
            {/* The clear line, advancing through the four steps. */}
            <ol aria-hidden="true" className="relative col-span-3 h-[56%] pl-6">
              <span className="absolute top-0 bottom-0 left-[1.2rem] w-px bg-brand-500/25" />
              <span className="pin-fill absolute top-0 bottom-0 left-[1.2rem] w-px origin-top bg-brand-600" />
              {BOOKING_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="pin-node absolute left-0 flex -translate-y-1/2 items-center gap-4"
                  style={{ top: `${(index / (BOOKING_STEPS.length - 1)) * 100}%` }}
                >
                  <span className="pin-dot ml-[0.95rem] size-2.5 rounded-full bg-mint-50 ring-1 ring-brand-500" />
                  <span className="pin-label text-sm font-semibold tracking-[0.12em] whitespace-nowrap text-ink-500 uppercase">
                    {stepNumber(index)} · {step.short}
                  </span>
                </li>
              ))}
            </ol>

            <ol className="col-span-9 grid">
              {BOOKING_STEPS.map((step, index) => (
                <li key={step.title} className="pin-step [grid-area:1/1]">
                  <span
                    aria-hidden="true"
                    className="font-display text-8xl leading-none text-brand-600"
                  >
                    {stepNumber(index)}
                  </span>
                  <h3 className="mt-8 font-display text-5xl text-ink-900">{step.title}</h3>
                  <p className="mt-4 max-w-xl text-xl text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
