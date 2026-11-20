import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { useLocation, useOutlet } from "react-router";

/** Keeps the outgoing page's content while it animates out (instead of the new route's). */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

/** Route outlet with a fade/slide page transition. */
export function AnimatedOutlet() {
  const { pathname } = useLocation();
  // The first page shown skips the page-level transition. This is done on the wrapper, not
  // with <AnimatePresence initial={false}>: that flag reaches every descendant through
  // context and silently disabled the pages' own entrance animations on first load.
  const [firstPath, setFirstPath] = useState<string | null>(pathname);
  if (firstPath !== null && firstPath !== pathname) setFirstPath(null);
  const isFirstPage = firstPath === pathname;

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pathname}
        initial={isFirstPage ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <FrozenOutlet />
      </m.div>
    </AnimatePresence>
  );
}
