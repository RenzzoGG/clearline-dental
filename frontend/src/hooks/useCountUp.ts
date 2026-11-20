import { useEffect, useRef, useState } from "react";

import { useMotionPreference } from "../app/motion-preference";

/** Fast start, gentle landing (same feel as the site's cubic-bezier(0.16, 1, 0.3, 1)). */
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;

/**
 * Counts from 0 to `target` the first time the element scrolls into view.
 * With motion off (toggle or prefers-reduced-motion) the final value is shown immediately.
 *
 * Plain IntersectionObserver + requestAnimationFrame on purpose: importing Motion's
 * `animate`/`useInView` here pulled its whole animation engine into the critical bundle.
 */
export function useCountUp<T extends Element>(target: number, duration = 1.6) {
  const ref = useRef<T>(null);
  const { enabled } = useMotionPreference();
  const [value, setValue] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / (duration * 1000), 1);
          setValue(target * easeOutQuart(progress));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [enabled, target, duration]);

  return { ref, value: enabled ? value : target };
}
