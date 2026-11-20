import { Reveal, RevealGroup, RevealItem } from "../../components/Reveal";
import { useDentists } from "./queries";

const AVATAR_TONES = [
  "bg-brand-200 text-brand-900",
  "bg-coral-100 text-coral-800",
  "bg-mint-200 text-brand-800",
  "bg-ink-200 text-ink-800",
];

export function TeamSection() {
  const { data: dentists } = useDentists();
  if (!dentists?.length) return null;

  return (
    <section className="bg-mint-50 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="font-semibold text-brand-600">Our team</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Specialists who take the time to explain
          </h2>
        </Reveal>
        <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dentists.map((dentist, index) => (
            <RevealItem key={dentist.id}>
              <article className="h-full rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-ink-100">
                <span
                  aria-hidden="true"
                  className={`mx-auto grid size-20 place-items-center rounded-full text-2xl font-extrabold ${
                    AVATAR_TONES[index % AVATAR_TONES.length]
                  }`}
                >
                  {dentist.first_name[0]}
                  {dentist.last_name[0]}
                </span>
                <h3 className="mt-4 font-bold text-ink-900">Dr. {dentist.full_name}</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {dentist.specialty || "General dentistry"}
                </p>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
