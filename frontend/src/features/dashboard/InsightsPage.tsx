import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useMotionPreference } from "../../app/motion-preference";
import { Spinner } from "../../components/ui/Spinner";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatPercent } from "../../lib/format";
import { addDays, formatDateKey, todayKey } from "../../lib/time";
import { useStats } from "./queries";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;

const BRAND = "#227a70";
// coral-600: 3.8:1 against white, above the 3:1 WCAG minimum for chart marks.
const CORAL = "#de5636";

export default function InsightsPage() {
  useDocumentTitle("Insights");
  const reduceMotion = !useMotionPreference().enabled;
  const [days, setDays] = useState<number>(30);
  const to = todayKey();
  const from = addDays(to, -(days - 1));
  const { data: stats, isPending, isError } = useStats(from, to);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Insights</h1>
          <p className="text-ink-600">
            {formatDateKey(from)} – {formatDateKey(to)}
          </p>
        </div>
        <div
          className="inline-flex rounded-full bg-ink-100 p-1"
          role="group"
          aria-label="Date range"
        >
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              aria-pressed={days === range.days}
              onClick={() => setDays(range.days)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                days === range.days
                  ? "bg-white text-ink-900 shadow-sm"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="mt-10">
          <Spinner label="Crunching numbers…" />
        </div>
      ) : isError ? (
        <p className="mt-10 text-red-700">Statistics could not be loaded.</p>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Appointments" value={stats.total.toLocaleString("en-US")} />
            <Kpi label="Completed" value={stats.by_status.completed.toLocaleString("en-US")} />
            <Kpi
              label="Upcoming (pending + confirmed)"
              value={(stats.by_status.pending + stats.by_status.confirmed).toLocaleString("en-US")}
            />
            <Kpi
              label="Cancellation rate"
              value={formatPercent(stats.cancellation_rate)}
              tone="coral"
            />
          </dl>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <ChartCard title="Appointments per day" description="Excludes cancellations.">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.by_day} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceff2" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => formatDateKey(value)}
                    tick={{ fontSize: 12, fill: "#66747f" }}
                    minTickGap={24}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#66747f" }} />
                  <Tooltip
                    labelFormatter={(value) => formatDateKey(String(value), "long")}
                    formatter={(value) => [value, "Appointments"]}
                    cursor={{ fill: "#effaf8" }}
                  />
                  <Bar
                    dataKey="count"
                    fill={BRAND}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={!reduceMotion}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="By service" description="Excludes cancellations.">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.by_service}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
                >
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis
                    type="category"
                    dataKey="service"
                    width={150}
                    tick={{ fontSize: 12, fill: "#3a444c" }}
                  />
                  <Tooltip
                    formatter={(value) => [value, "Appointments"]}
                    cursor={{ fill: "#fff4f1" }}
                  />
                  <Bar
                    dataKey="count"
                    fill={CORAL}
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={!reduceMotion}
                  >
                    {/* Direct labels: the value is readable without hovering (touch, keyboard). */}
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fontSize: 12, fontWeight: 600, fill: "#3a444c" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "brand",
}: {
  label: string;
  value: string;
  tone?: "brand" | "coral";
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-ink-200">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd
        className={`mt-1 text-3xl font-extrabold tabular-nums ${tone === "coral" ? "text-coral-600" : "text-ink-900"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-ink-200">
      <h2 className="font-bold text-ink-900">{title}</h2>
      <p className="text-sm text-ink-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
