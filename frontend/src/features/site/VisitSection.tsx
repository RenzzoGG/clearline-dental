import { Link } from "react-router";

import { Reveal } from "../../components/Reveal";
import { buttonClasses } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";

export function VisitSection() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <Reveal className="rounded-3xl bg-ink-50 p-8 ring-1 ring-ink-100">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Visit us</h2>
          {/* Valid <dl>: each <div> groups exactly one <dt> + <dd>; the icon lives in the <dt>. */}
          <dl className="mt-6 space-y-5 text-ink-700">
            <div>
              <dt className="flex items-center gap-3 font-semibold text-ink-900">
                <Icon name="clock" className="size-5 shrink-0 text-brand-600" />
                Opening hours
              </dt>
              <dd className="pl-8">Monday to Saturday, 9:00 AM – 6:00 PM</dd>
            </div>
            <div>
              <dt className="flex items-center gap-3 font-semibold text-ink-900">
                <Icon name="mapPin" className="size-5 shrink-0 text-brand-600" />
                Address
              </dt>
              <dd className="pl-8">Blvd. Kino 1234, Hermosillo, Sonora</dd>
            </div>
            <div>
              <dt className="flex items-center gap-3 font-semibold text-ink-900">
                <Icon name="phone" className="size-5 shrink-0 text-brand-600" />
                Phone
              </dt>
              <dd className="pl-8">+52 662 555 0100</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal
          delay={0.1}
          className="relative overflow-hidden rounded-3xl bg-coral-700 p-8 text-white sm:p-12"
        >
          <div
            aria-hidden="true"
            className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10"
          />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your next checkup is a few taps away.
          </h2>
          <p className="relative mt-4 max-w-md text-coral-50">
            Pick a service, a dentist and a time that works for you. We&apos;ll confirm it right
            away.
          </p>
          <Link
            to="/book"
            className={buttonClasses("secondary", "lg", "relative mt-8 text-coral-700 ring-0")}
          >
            Book a visit <Icon name="arrowRight" className="size-5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
