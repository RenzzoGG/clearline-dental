import { RevealGroup, RevealItem } from "../../components/Reveal";
import { useCountUp } from "../../hooks/useCountUp";
import { formatNumber } from "../../lib/format";
import { SectionHeader } from "./SectionHeader";
import { OFFSCREEN_SECTION } from "./offscreen";
import { Thread } from "./Thread";

type Stat = { value: number; suffix: string; label: string; decimals: 0 | 1 };

// Marketing figures for the fictional clinic (static on purpose).
const STATS: Stat[] = [
  { value: 12400, suffix: "+", label: "Patients cared for", decimals: 0 },
  { value: 15, suffix: "", label: "Years in Hermosillo", decimals: 0 },
  { value: 4.9, suffix: "/5", label: "Average review", decimals: 1 },
  { value: 92, suffix: "%", label: "Seen the same week", decimals: 0 },
];

function Counter({ value, suffix, label, decimals }: Stat) {
  const { ref, value: current } = useCountUp<HTMLParagraphElement>(value);
  const text = formatNumber(current, decimals);
  return (
    <div>
      <p
        ref={ref}
        className="font-display text-[clamp(2rem,9vw,3rem)] text-white tabular-nums sm:text-6xl"
      >
        {/* Screen readers get the final value, not every animation frame. */}
        <span aria-hidden="true">
          {text}
          {suffix}
        </span>
        <span className="sr-only">
          {formatNumber(value, decimals)}
          {suffix}
        </span>
      </p>
      <p className="mt-3 border-t border-white/15 pt-3 text-brand-100">{label}</p>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className={`${OFFSCREEN_SECTION} relative isolate bg-brand-900 py-24 lg:py-32`}>
      <Thread tone="dark" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          number="04"
          label="In numbers"
          tone="dark"
          title="A neighborhood clinic that runs like clockwork"
        />
        <RevealGroup className="mt-14 grid grid-cols-2 gap-x-8 gap-y-12 sm:gap-x-12 lg:ml-[25%] lg:gap-x-16">
          {STATS.map((stat, index) => (
            <RevealItem key={stat.label} index={index}>
              <Counter {...stat} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
