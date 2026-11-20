import type { ReactNode } from "react";

import { Reveal } from "../../components/Reveal";

/**
 * Editorial section opener: a large serif section number with its label in a narrow
 * column, the serif title in a wide one (asymmetric 3/9 grid on large screens, stacked on
 * phones). The number is decorative; the label carries the meaning for screen readers.
 */
export function SectionHeader({
  number,
  label,
  title,
  intro,
  tone = "light",
}: {
  number: string;
  label: string;
  title: ReactNode;
  intro?: ReactNode;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:gap-10">
      <Reveal className="lg:col-span-3">
        <p className="flex items-baseline gap-3 lg:flex-col lg:gap-2">
          <span
            aria-hidden="true"
            data-section-number={number}
            className={`font-display text-5xl leading-none lg:text-7xl ${dark ? "text-brand-300" : "text-brand-600"}`}
          >
            {number}
          </span>
          <span
            className={`text-sm font-semibold tracking-[0.14em] uppercase ${dark ? "text-brand-200" : "text-ink-600"}`}
          >
            {label}
          </span>
        </p>
      </Reveal>
      <Reveal className="lg:col-span-9" delay={0.08}>
        <h2
          className={`font-display text-4xl leading-[1.05] text-balance sm:text-5xl lg:text-6xl ${dark ? "text-white" : "text-ink-900"}`}
        >
          {title}
        </h2>
        {intro && (
          <p className={`mt-5 max-w-2xl text-lg ${dark ? "text-brand-100" : "text-ink-600"}`}>
            {intro}
          </p>
        )}
      </Reveal>
    </div>
  );
}
