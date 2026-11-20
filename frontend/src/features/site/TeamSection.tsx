import { RevealGroup, RevealItem } from "../../components/Reveal";
import { useDentists } from "./queries";
import { SectionHeader } from "./SectionHeader";
import { OFFSCREEN_SECTION } from "./offscreen";
import { Photo } from "./Photo";
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
        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <figure className="lg:col-span-7">
            <Photo
              photo="teamAtWork"
              sizes="(min-width: 1152px) 620px, (min-width: 1024px) 56vw, calc(100vw - 2rem)"
              className="aspect-[3/2]"
            />
          </figure>
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:content-center">
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
                  <h3 className="mt-4 font-display text-xl text-ink-900">
                    Dr. {dentist.full_name}
                  </h3>
                  <p className="mt-1 text-sm text-ink-500">
                    {dentist.specialty || "General dentistry"}
                  </p>
                </article>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
