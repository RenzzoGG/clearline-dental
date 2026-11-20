import { Link } from "react-router";

import { Reveal, RevealGroup, RevealItem } from "../../components/Reveal";
import { Icon } from "../../components/ui/Icon";
import { formatDuration, formatPrice } from "../../lib/format";
import { useServices } from "./queries";
import { SectionHeader } from "./SectionHeader";
import { OFFSCREEN_SECTION } from "./offscreen";
import { Thread } from "./Thread";

/** 01 — Services as an editorial numbered list (number · name · duration and price). */
export function ServicesSection() {
  const { data: services, isPending, isError } = useServices();

  return (
    <section
      id="services"
      className={`${OFFSCREEN_SECTION} relative isolate scroll-mt-20 bg-white py-24 lg:py-32`}
    >
      <Thread />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          number="01"
          label="Services"
          title={
            <>
              Everything your smile needs, <em className="text-brand-600">priced up front</em>
            </>
          }
          intro="No surprises: every visit shows its duration and price before you book."
        />

        {isError ? (
          <p className="mt-12 text-ink-500">Our services list is unavailable right now.</p>
        ) : isPending ? (
          <div className="mt-14 divide-y divide-ink-100 border-y border-ink-100" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse bg-ink-50/60 motion-off:animate-none" />
            ))}
          </div>
        ) : (
          <RevealGroup className="mt-14 border-t border-ink-200 lg:ml-[25%]">
            {services.map((service, index) => (
              <RevealItem key={service.id} index={index}>
                <article
                  data-service-row
                  className="group relative grid grid-cols-[3rem_1fr] gap-x-4 gap-y-1 border-b border-ink-200 py-6 transition-colors hover:bg-mint-50/60 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:gap-x-6 sm:px-3"
                >
                  {/* The clear line underlines the row on hover. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-brand-500 transition-transform duration-500 ease-out group-hover:scale-x-100 motion-off:transition-none"
                  />
                  <span
                    aria-hidden="true"
                    className="row-span-2 font-display text-3xl leading-none text-brand-600 sm:row-span-1"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl leading-tight text-ink-900">
                      {service.name}
                    </h3>
                    <p className="mt-1 text-ink-600">{service.description}</p>
                  </div>
                  <p className="flex items-baseline gap-3 text-sm font-semibold text-ink-700 sm:flex-col sm:items-end sm:gap-1 sm:text-right">
                    <span className="font-display text-xl font-normal text-brand-700">
                      {formatPrice(service.price)}
                    </span>
                    <span className="text-ink-500">{formatDuration(service.duration_minutes)}</span>
                  </p>
                </article>
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        <Reveal className="mt-10 lg:ml-[25%]">
          <Link
            to="/book"
            className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline"
          >
            Choose a service and a time <Icon name="arrowRight" className="size-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
