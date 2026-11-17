import { Reveal, RevealGroup, RevealItem } from "../../components/Reveal";
import { useCountUp } from "../../hooks/useCountUp";

// Marketing figures for the fictional clinic (static on purpose).
const STATS = [
  { value: 12400, suffix: "+", label: "Patients cared for", decimals: 0 },
  { value: 15, suffix: "", label: "Years in Hermosillo", decimals: 0 },
  { value: 4.9, suffix: "/5", label: "Average review", decimals: 1 },
  { value: 92, suffix: "%", label: "Seen the same week", decimals: 0 },
];

function Counter({ value, suffix, label, decimals }: (typeof STATS)[number]) {
  const { ref, value: current } = useCountUp<HTMLParagraphElement>(value);
  const text = current.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <div>
      <p
        ref={ref}
        className="text-4xl font-extrabold tracking-tight text-white tabular-nums sm:text-5xl"
      >
        {/* Screen readers get the final value, not every animation frame. */}
        <span aria-hidden="true">
          {text}
          {suffix}
        </span>
        <span className="sr-only">
          {value.toLocaleString("en-US")}
          {suffix}
        </span>
      </p>
      <p className="mt-2 text-brand-200">{label}</p>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="bg-brand-900 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="max-w-xl text-2xl font-bold text-white sm:text-3xl">
            A neighborhood clinic that runs like clockwork
          </h2>
        </Reveal>
        <RevealGroup className="mt-12 grid grid-cols-2 gap-10 lg:grid-cols-4">
          {STATS.map((stat) => (
            <RevealItem key={stat.label}>
              <Counter {...stat} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
