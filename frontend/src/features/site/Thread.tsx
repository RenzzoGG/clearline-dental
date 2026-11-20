/**
 * "The clear line" (the page's visual thread): a 1px line in the section-number column that
 * runs down each section on large screens and draws itself as the section scrolls by.
 *
 * Pure CSS (`.thread-line` in index.css): a scroll-driven animation (animation-timeline:
 * view()) runs off the main thread with no JavaScript. Browsers without scroll timelines,
 * and motion off, simply show the line fully drawn. Sections using it need `relative
 * isolate` so the line sits above their background but behind their content.
 */
export function Thread({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span
      aria-hidden="true"
      className={`thread-line pointer-events-none absolute bottom-0 -z-10 hidden w-px origin-top lg:block ${
        tone === "dark" ? "bg-brand-300/60" : "bg-brand-500/50"
      }`}
    />
  );
}
