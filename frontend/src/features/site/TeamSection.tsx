import { RevealGroup, RevealItem } from "../../components/Reveal";
import { useDentists } from "./queries";
import { SectionHeader } from "./SectionHeader";
import { OFFSCREEN_SECTION } from "./offscreen";
import { Thread } from "./Thread";

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
    <section className={`${OFFSCREEN_SECTION} relative isolate bg-mint-50 py-24 lg:py-32`}>
      <Thread />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          number="05"
          label="Our team"
          title={
            <>
              Specialists who <em className="text-brand-600">take the time</em> to explain
            </>
          }
        />
        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dentists.map((dentist, index) => (
            <RevealItem key={dentist.id} index={index}>
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
                <h3 className="mt-4 font-display text-xl text-ink-900">Dr. {dentist.full_name}</h3>
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
