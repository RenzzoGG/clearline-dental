import type { CSSProperties } from "react";
import { Link } from "react-router";

import { buttonClasses } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";

const HEADLINE = "Gentle dental care, booked in a minute.";
/**
 * The headline is split into explicit lines (one set per breakpoint): a fixed line count and
 * line-height mean the font swap (fallback serif -> Fraunces) can't reflow it (no layout
 * shift), and it gives the line-by-line reveal its lines. "minute." is the italic accent.
 */
const LINES_MOBILE = ["Gentle dental", "care, booked", "in a minute."];
const LINES_WIDE = ["Gentle dental care,", "booked in a", "minute."];
/**
 * Hero entrance as CSS keyframes (see `fade-up` in index.css): ~17 elements animate at
 * once on load, and CSS runs them on the compositor instead of a JS frame loop. With
 * motion off (header toggle or prefers-reduced-motion; `motion-on:` variant) the content
 * simply appears.
 */
function fadeUp(
  delay: number,
  {
    from,
    duration,
    slideOnly = false,
  }: { from?: string; duration?: number; slideOnly?: boolean } = {},
): CSSProperties {
  return {
    animationDelay: `${delay}s`,
    ...(duration && { animationDuration: `${duration}s` }),
    ...(from && { "--fade-from": from }),
    // slideOnly: visible from the first paint (no fade). Used for the main text, which is
    // the LCP element: Chrome ignores opacity-0 content, so a fade-in delays LCP until the
    // first animation frame, which can sit behind React's render work on slow phones.
    ...(slideOnly && { "--fade-opacity": 1 }),
  } as CSSProperties;
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-mint-50">
      {/* Decorative blobs, static on purpose: endless ambient loops recalculate style every
          frame wherever there is no GPU compositing (headless Chrome, low-end phones), and a
          calm brand doesn't need motion that never stops. */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-24 size-[28rem] rounded-full bg-brand-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-24 size-[24rem] rounded-full bg-coral-100/70 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-24 sm:px-6 md:pt-20 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-7">
          <p
            style={fadeUp(0, { duration: 0.5, slideOnly: true })}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap text-brand-700 ring-1 ring-brand-100 motion-on:animate-fade-up"
          >
            {/* Never wraps (short copy on phones): a badge that wrapped in the fallback font and
                not in Plus Jakarta Sans moved the whole hero when the web font arrived (CLS). */}
            <Icon name="sparkle" className="size-4" />
            <span className="sm:hidden">Same-week visits · Hermosillo</span>
            <span className="hidden sm:inline">Now booking same-week visits in Hermosillo</span>
          </p>

          <h1 className="mt-6 font-display text-[clamp(2.6rem,11.5vw,3.5rem)] leading-[1.04] tracking-[-0.02em] text-ink-900 sm:text-[4rem] lg:text-[4rem] xl:text-[4.5rem]">
            <span className="sr-only">{HEADLINE}</span>
            <HeadlineLines lines={LINES_MOBILE} className="sm:hidden" />
            <HeadlineLines lines={LINES_WIDE} className="hidden sm:block" />
          </h1>

          <p
            style={fadeUp(0.55, { slideOnly: true })}
            className="mt-8 max-w-xl text-lg text-ink-600 motion-on:animate-fade-up"
          >
            Checkups, whitening, orthodontics and more — with clear prices, real-time availability
            and a team that actually explains what&apos;s going on.
          </p>

          <div style={fadeUp(0.7)} className="mt-9 flex flex-wrap gap-3 motion-on:animate-fade-up">
            <Link to="/book" data-magnetic className={buttonClasses("accent", "lg")}>
              Book a visit <Icon name="arrowRight" className="size-5" />
            </Link>
            <a href="#services" data-magnetic className={buttonClasses("secondary", "lg")}>
              See services
            </a>
          </div>
        </div>

        <BookingPreview />
      </div>
    </section>
  );
}

function HeadlineLines({ lines, className }: { lines: readonly string[]; className: string }) {
  return (
    <span aria-hidden="true" className={className}>
      {lines.map((line, index) => (
        // Mask: each line slides up from behind its own clip box. The clip margin and the
        // padding/negative margin keep italic overhangs, descenders and the smile visible.
        <span
          key={line}
          className="-mb-[0.24em] block overflow-clip pb-[0.24em] [overflow-clip-margin:0.25em]"
        >
          <span
            className="block whitespace-nowrap motion-on:animate-line-up"
            style={{ animationDelay: `${0.08 + index * 0.1}s` }}
          >
            {line.endsWith("minute.") ? (
              <>
                {line.slice(0, -"minute.".length)}
                <SmileWord />
              </>
            ) : (
              line
            )}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * "minute." with "the clear line" drawn under it as a smile (the page's visual thread).
 * pathLength=1 lets CSS draw it with stroke-dashoffset 1 -> 0; with motion off it is
 * simply there. No vector-effect="non-scaling-stroke": with the stretched viewBox it makes
 * Chrome measure the dash in screen units, so the normalized length stops covering the path.
 */
function SmileWord() {
  return (
    <em className="relative inline-block text-brand-600">
      minute.
      <svg
        aria-hidden="true"
        viewBox="0 0 120 24"
        preserveAspectRatio="none"
        fill="none"
        className="absolute top-[88%] left-[2%] h-[0.3em] w-[92%] overflow-visible text-brand-500"
      >
        <path
          d="M3 5 C 34 21, 86 21, 117 5"
          pathLength={1}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="smile-path"
        />
      </svg>
    </em>
  );
}

/** Illustrative card that mimics the booking flow (pure markup, no images). */
function BookingPreview() {
  const slots = ["9:00 AM", "9:15 AM", "10:30 AM", "11:45 AM", "2:00 PM", "4:15 PM"];
  return (
    <div
      aria-hidden="true"
      style={{ animationDelay: "0.35s" }}
      className="relative mx-auto w-full max-w-md motion-on:animate-rise-in lg:col-span-5"
    >
      <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-brand-900/10 ring-1 ring-ink-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-500">Checkup &amp; cleaning · 30 min</p>
            <p className="mt-0.5 text-lg font-bold text-ink-900">Tuesday, next week</p>
          </div>
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon name="calendar" />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {slots.map((slot, index) => (
            <span
              key={slot}
              style={fadeUp(0.7 + index * 0.06, { from: "8px", duration: 0.4 })}
              className={`rounded-xl py-2.5 text-center text-sm font-semibold motion-on:animate-fade-up ${
                index === 2 ? "bg-brand-700 text-white" : "bg-ink-50 text-ink-700"
              }`}
            >
              {slot}
            </span>
          ))}
        </div>
      </div>

      {/* One-time entrance only (no endless float). */}
      <div
        style={fadeUp(1.1, { from: "16px", duration: 0.5 })}
        className="absolute -bottom-7 -left-2 motion-on:animate-fade-up sm:-left-10"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-ink-100">
          <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-ink-900">Visit confirmed</span>
            <span className="block text-xs text-ink-500">Dr. Ramirez · 10:30 AM</span>
          </span>
        </div>
      </div>
    </div>
  );
}
