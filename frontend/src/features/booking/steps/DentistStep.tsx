import { Spinner } from "../../../components/ui/Spinner";
import { useDentists } from "../../site/queries";
import { ChoiceCard } from "../ChoiceCard";

export function DentistStep({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number) => void;
}) {
  const { data: dentists, isPending, isError } = useDentists();
  if (isPending) return <Spinner label="Loading our team…" />;
  if (isError) return <p className="text-red-700">Dentists could not be loaded. Please refresh.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {dentists.map((dentist) => (
        <ChoiceCard
          key={dentist.id}
          selected={value === dentist.id}
          onSelect={() => onChange(dentist.id)}
        >
          <span className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-mint-200 font-bold text-brand-800"
            >
              {dentist.first_name[0]}
              {dentist.last_name[0]}
            </span>
            <span>
              <span className="block font-bold text-ink-900">Dr. {dentist.full_name}</span>
              <span className="block text-sm text-ink-600">
                {dentist.specialty || "General dentistry"}
              </span>
            </span>
          </span>
        </ChoiceCard>
      ))}
    </div>
  );
}
