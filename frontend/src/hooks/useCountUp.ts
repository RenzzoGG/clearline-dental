import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 to `target` the first time the element scrolls into view.
 * With prefers-reduced-motion the final value is shown immediately.
 */
export function useCountUp<T extends Element>(target: number, duration = 1.6) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setValue(latest),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, target, duration]);

  return { ref, value: reduceMotion ? target : value };
}
