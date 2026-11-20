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
    const cleanups = [attachMagnetic(), attachPin()];
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

const HEADER = 72; // px, the sticky site header (the pinned panel sits below it)

/**
 * Pinned "How it works": maps the scroll position inside `[data-pin]` (a tall track whose
 * panel is `position: sticky`) to `--pin-progress` (0..1) and `data-active-step` (0..3).
 * One passive scroll listener, at most one rAF per frame, and no React renders. The track
 * is display:none below lg (CSS), in which case there is nothing to do.
 */
function attachPin(): () => void {
  const track = document.querySelector<HTMLElement>("[data-pin]");
  if (!track) return () => {};
  const steps = track.querySelectorAll(".pin-step").length || 1;
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!track.offsetHeight) return;
    const box = track.getBoundingClientRect();
    const travel = box.height - (window.innerHeight - HEADER);
    const progress = Math.min(1, Math.max(0, (HEADER - box.top) / travel));
    track.style.setProperty("--pin-progress", progress.toFixed(4));
    const active = String(Math.min(steps - 1, Math.floor(progress * steps)));
    if (track.dataset.activeStep !== active) track.dataset.activeStep = active;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  update();
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    track.style.removeProperty("--pin-progress");
    track.dataset.activeStep = "0";
  };
}
