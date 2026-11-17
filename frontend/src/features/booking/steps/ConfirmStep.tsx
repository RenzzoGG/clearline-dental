import { Icon, type IconName } from "../../../components/ui/Icon";
import { formatDuration, formatPrice } from "../../../lib/format";
import { formatDateKey, formatTimeRange, toDateKey } from "../../../lib/time";
import type { Dentist, Me, Service, Slot } from "../../../lib/types";

export function ConfirmStep({
  service,
  dentist,
  slot,
  user,
}: {
  service: Service;
  dentist: Dentist;
  slot: Slot;
  user: Me;
}) {
  const rows: { icon: IconName; label: string; value: string }[] = [
    {
      icon: "sparkle",
      label: "Service",
      value: `${service.name} · ${formatDuration(service.duration_minutes)}`,
    },
    { icon: "user", label: "Dentist", value: `Dr. ${dentist.full_name}` },
    {
      icon: "calendar",
      label: "When",
      value: `${formatDateKey(toDateKey(slot.starts_at), "long")}, ${formatTimeRange(slot.starts_at, slot.ends_at)}`,
    },
    { icon: "heart", label: "Patient", value: `${user.first_name} ${user.last_name}` },
  ];

  return (
    <div className="rounded-3xl ring-1 ring-ink-200">
      <dl className="divide-y divide-ink-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-4 px-5 py-4">
            <Icon name={row.icon} className="size-5 shrink-0 text-brand-600" />
            <dt className="w-24 shrink-0 text-sm text-ink-500">{row.label}</dt>
            <dd className="font-semibold text-ink-900">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between rounded-b-3xl bg-ink-50 px-5 py-4">
        <span className="text-ink-600">Estimated price</span>
        <span className="text-xl font-extrabold text-ink-900">{formatPrice(service.price)}</span>
      </div>
    </div>
  );
}
