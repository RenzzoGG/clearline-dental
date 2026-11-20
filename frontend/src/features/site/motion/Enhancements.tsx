import { useEffect } from "react";

import { useMotionPreference } from "../../../app/motion-preference";

/**
 * Landing "enhancements": interaction-driven effects that are nice to have but never needed
 * to read or use the page. This module is its own lazy chunk, mounted only once the browser
 * is idle after the first paint (see LandingPage), and every effect is progressive: the
 * markup and layout are identical without it.
 *
 * Plain DOM + CSS here (no Motion): these run per pointer move / scroll frame, so they write
 * transforms or CSS custom properties directly instead of going through React renders.
 */
export default function Enhancements() {
  const { enabled } = useMotionPreference();

  useEffect(() => {
    if (!enabled) return;
    const cleanups = [attachMagnetic()];
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [enabled]);

  return null;
}

const MAX_SHIFT = 10; // px
const PULL = 0.3; // fraction of the pointer's distance from the center

/**
 * Magnetic CTAs: `[data-magnetic]` elements lean slightly toward the pointer and spring back
 * on leave. Mouse/trackpad only (`pointer: fine` + hover); touch never sees it.
 */
function attachMagnetic(): () => void {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const elements = [...document.querySelectorAll<HTMLElement>("[data-magnetic]")];
  const detach = elements.map((element) => {
    let frame = 0;
    const clamp = (value: number) => Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, value));
    const onMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      const x = clamp((event.clientX - (box.left + box.width / 2)) * PULL);
      const y = clamp((event.clientY - (box.top + box.height / 2)) * PULL);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      element.style.transform = "";
    };
    element.style.transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      element.style.transform = "";
      element.style.transition = "";
    };
  });
  return () => detach.forEach((cleanup) => cleanup());
}
