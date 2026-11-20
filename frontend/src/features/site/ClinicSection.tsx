import { OFFSCREEN_SECTION } from "./offscreen";
import { Photo } from "./Photo";
import { SectionHeader } from "./SectionHeader";
import { Thread } from "./Thread";

/** 03 — The clinic: two asymmetric photos framed by strokes of "the clear line". */
export function ClinicSection() {
  return (
    <section className={`${OFFSCREEN_SECTION} relative isolate bg-white py-24 lg:py-32`}>
      <Thread />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          number="03"
          label="The clinic"
          title={
            <>
              Bright rooms, <em className="text-brand-600">unhurried</em> care
            </>
          }
          intro="One calm floor in Hermosillo: natural light, quiet rooms and the time to explain every step."
        />

        <div className="mt-14 grid grid-cols-12 gap-x-4 gap-y-6 sm:gap-x-6 lg:ml-[25%]">
          <figure className="relative col-span-12 sm:col-span-8">
            <Photo
              photo="clinicRoom"
              sizes="(min-width: 1152px) 548px, (min-width: 640px) 62vw, calc(100vw - 2rem)"
              className="aspect-[3/2]"
            />
            {/* The clear line, tracing the photo's lower edge. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 400 60"
              fill="none"
              preserveAspectRatio="none"
              className="pointer-events-none absolute -bottom-7 -left-3 h-14 w-[70%] text-brand-500"
            >
              <path
                d="M2 4 C 60 56, 260 58, 398 30"
                pathLength={1}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                className="line-scroll"
              />
            </svg>
          </figure>
          <figure className="col-span-7 col-start-6 sm:col-span-4 sm:col-start-auto sm:mt-24">
            <Photo
              photo="clinicDetail"
              sizes="(min-width: 1152px) 268px, (min-width: 640px) 30vw, 58vw"
              className="aspect-[4/5]"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
