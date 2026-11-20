import { RevealGroup, RevealItem } from "../../components/Reveal";
import { SectionHeader } from "./SectionHeader";
import { OFFSCREEN_SECTION } from "./offscreen";

export const BOOKING_STEPS = [
  {
    title: "Pick a service",
    body: "Checkup, whitening, a filling… each one with its duration and price shown up front.",
  },
  {
    title: "Choose your dentist",
    body: "Meet the team and pick who you'd like to see, or whoever is free first.",
  },
  {
    title: "Find a time",
    body: "Real-time availability, so the slot you see is a slot you get.",
  },
  {
    title: "You're booked",
    body: "Create your account in one step and get your visit confirmed by the front desk.",
  },
] as const;

/** 02 — How booking works: four steps (static here; pinned and scroll-driven in 5b.5). */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className={`${OFFSCREEN_SECTION} scroll-mt-20 bg-mint-50 py-24 lg:py-32`}
    >
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
        <RevealGroup className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-ink-200 ring-1 ring-ink-200 sm:grid-cols-2 lg:grid-cols-4">
          {BOOKING_STEPS.map((step, index) => (
            <RevealItem key={step.title} index={index} className="bg-white p-7">
              <span aria-hidden="true" className="font-display text-4xl text-brand-600">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-6 font-display text-2xl text-ink-900">{step.title}</h3>
              <p className="mt-2 text-ink-600">{step.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
