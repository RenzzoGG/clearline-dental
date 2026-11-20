import { formatDuration, formatPrice } from "../../../lib/format";
import { useServices } from "../../site/queries";
import { ChoiceCard } from "../ChoiceCard";

// The demo clinic offers six services; a close guess keeps the skeleton honest.
const SKELETON_CARDS = 6;

export function ServiceStep({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number) => void;
}) {
  const { data: services, isPending, isError } = useServices();
  if (isPending) {
    // Same footprint as the loaded cards (h-28 = their measured 112px), so the buttons,
    // checklist and footer don't jump when the list arrives (CLS).
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <span className="sr-only" role="status">
          Loading services…
        </span>
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="h-28 animate-pulse rounded-2xl bg-ink-100 motion-off:animate-none"
          />
        ))}
      </div>
    );
  }
  if (isError) return <p className="text-red-700">Services could not be loaded. Please refresh.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => (
        <ChoiceCard
          key={service.id}
          selected={value === service.id}
          onSelect={() => onChange(service.id)}
        >
          <span className="block font-bold text-ink-900">{service.name}</span>
          <span className="mt-1 block text-sm text-ink-600">{service.description}</span>
          <span className="mt-3 block text-sm font-semibold text-ink-700">
            {formatDuration(service.duration_minutes)} ·{" "}
            <span className="text-brand-700">{formatPrice(service.price)}</span>
          </span>
        </ChoiceCard>
      ))}
    </div>
  );
}
