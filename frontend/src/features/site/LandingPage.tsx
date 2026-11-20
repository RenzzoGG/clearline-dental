import { lazy, Suspense } from "react";

import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Hero } from "./Hero";

const LandingSections = lazy(() => import("./LandingSections"));

/**
 * The hero ships in the critical bundle and paints with the first render (it is the LCP
 * element); the sections below the fold load as their own chunk, preloaded in parallel by
 * the route-preload Vite plugin. The fallback reserves a viewport of height so the footer
 * stays below the fold until they arrive (no layout shift).
 */
export default function LandingPage() {
  useDocumentTitle();
  return (
    <>
      <Hero />
      <Suspense fallback={<div className="min-h-dvh" />}>
        <LandingSections />
      </Suspense>
    </>
  );
}
