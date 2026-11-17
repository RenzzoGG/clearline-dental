import { Link } from "react-router";

import { Reveal, RevealGroup, RevealItem } from "../../components/Reveal";
import { Icon, type IconName } from "../../components/ui/Icon";
import { formatDuration, formatPrice } from "../../lib/format";
import { useServices } from "./queries";

const ICONS: IconName[] = ["sparkle", "shield", "heart", "check", "user", "clock"];

export function ServicesSection() {
  const { data: services, isPending, isError } = useServices();

  return (
    <section id="services" className="scroll-mt-20 bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="font-semibold text-brand-600">Services</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Everything your smile needs, with prices up front
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            No surprises: every visit shows its duration and price before you book.
          </p>
        </Reveal>

        {isError ? (
          <p className="mt-12 text-ink-500">Our services list is unavailable right now.</p>
        ) : isPending ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-3xl bg-ink-50 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : (
          <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <RevealItem key={service.id}>
                <article className="group h-full rounded-3xl bg-ink-50 p-6 ring-1 ring-ink-100 transition-colors hover:bg-mint-50 hover:ring-brand-200">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white text-brand-700 shadow-sm transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                    <Icon name={ICONS[index % ICONS.length] ?? "sparkle"} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink-900">{service.name}</h3>
                  <p className="mt-1.5 text-sm text-ink-600">{service.description}</p>
                  <p className="mt-4 flex items-center gap-3 text-sm font-semibold text-ink-700">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="clock" className="size-4 text-ink-400" />
                      {formatDuration(service.duration_minutes)}
                    </span>
                    <span className="text-brand-700">{formatPrice(service.price)}</span>
                  </p>
                </article>
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        <Reveal className="mt-10">
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
