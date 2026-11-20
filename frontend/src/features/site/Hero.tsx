import { motion } from "motion/react";
import { Link } from "react-router";

import { buttonClasses } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";

const HEADLINE = ["Gentle", "dental", "care,", "booked", "in", "a", "minute."];
const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-mint-50">
      {/* Decorative blobs: transform-only infinite drift (disabled with reduced motion). */}
      <motion.div
        aria-hidden="true"
        className="absolute -top-32 -right-24 size-[28rem] rounded-full bg-brand-200/50 blur-3xl"
        animate={{ y: [0, 24, 0], x: [0, -12, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -bottom-40 -left-24 size-[24rem] rounded-full bg-coral-100/70 blur-3xl"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-24 sm:px-6 md:pt-24 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-100"
          >
            <Icon name="sparkle" className="size-4" /> Now booking same-week visits in Hermosillo
          </motion.p>

          <h1 className="mt-6 text-4xl leading-[1.05] font-extrabold tracking-tight text-ink-900 sm:text-6xl">
            {HEADLINE.map((word, index) => (
              <motion.span
                key={index}
                className="mr-[0.25em] inline-block"
                initial={{ opacity: 0, y: "0.4em" }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.1 + index * 0.06 }}
              >
                {word === "minute." ? <span className="text-brand-600">{word}</span> : word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.55 }}
            className="mt-6 max-w-xl text-lg text-ink-600"
          >
            Checkups, whitening, orthodontics and more — with clear prices, real-time availability
            and a team that actually explains what&apos;s going on.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.7 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link to="/book" className={buttonClasses("accent", "lg")}>
              Book a visit <Icon name="arrowRight" className="size-5" />
            </Link>
            <a href="#services" className={buttonClasses("secondary", "lg")}>
              See services
            </a>
          </motion.div>
        </div>

        <BookingPreview />
      </div>
    </section>
  );
}

/** Illustrative card that mimics the booking flow (pure markup, no images). */
function BookingPreview() {
  const slots = ["9:00 AM", "9:15 AM", "10:30 AM", "11:45 AM", "2:00 PM", "4:15 PM"];
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
      className="relative mx-auto w-full max-w-md"
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
            <motion.span
              key={slot}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.06, duration: 0.4 }}
              className={`rounded-xl py-2.5 text-center text-sm font-semibold ${
                index === 2 ? "bg-brand-700 text-white" : "bg-ink-50 text-ink-700"
              }`}
            >
              {slot}
            </motion.span>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: [0, -6, 0] }}
        transition={{
          opacity: { delay: 1.1, duration: 0.5 },
          y: { delay: 1.6, duration: 5, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute -bottom-7 -left-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-ink-100 sm:-left-10"
      >
        <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <Icon name="check" className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-bold text-ink-900">Visit confirmed</span>
          <span className="block text-xs text-ink-500">Dr. Ramirez · 10:30 AM</span>
        </span>
      </motion.div>
    </motion.div>
  );
}
