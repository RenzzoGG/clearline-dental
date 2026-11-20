import { lazy, Suspense, useEffect, useState } from "react";

import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Hero } from "./Hero";

const LandingSections = lazy(() => import("./LandingSections"));
const Enhancements = lazy(() => import("./motion/Enhancements"));

/** Resolves once the browser is idle after the first paint (with a timeout fallback). */
function useIdle() {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(() => setIdle(true), 1200);
    return () => clearTimeout(timer);
  }, []);
  return idle;
}

/**
 * The hero ships in the critical bundle and paints with the first render (it is the LCP
 * element); the sections below the fold load as their own chunk, preloaded in parallel by
 * the route-preload Vite plugin. The fallback reserves a viewport of height so the footer
 * stays below the fold until they arrive (no layout shift). Interaction effects
 * (motion/Enhancements) load last, when the browser is idle.
 */
export default function LandingPage() {
  useDocumentTitle();
  const idle = useIdle();
  return (
    <>
      <Hero />
      <Suspense fallback={<div className="min-h-dvh" />}>
        <LandingSections />
      </Suspense>
      {idle && (
        <Suspense fallback={null}>
          <Enhancements />
        </Suspense>
      )}
    </>
  );
}
