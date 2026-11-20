import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion } from "motion/react";
import { useState, type ReactNode } from "react";

import { AuthProvider } from "../features/auth/AuthProvider";
import { ApiError } from "../lib/api";
import { MotionPreferenceProvider } from "./motion-preference";

// Motion's animation engine is fetched after the first render (separate chunk).
const loadMotionFeatures = () => import("../lib/motion-features").then((module) => module.default);

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't retry client errors (400/401/403/404): they won't fix themselves.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {/* LazyMotion: only the animation/gesture/in-view features we use, loaded async.
          The full bundle would also create a layout-projection node per element and measure
          the DOM on every commit (no `layout` animations exist here). strict = using
          `motion.*` instead of `m.*` throws in development. */}
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionPreferenceProvider>
          <AuthProvider>{children}</AuthProvider>
        </MotionPreferenceProvider>
      </LazyMotion>
    </QueryClientProvider>
  );
}
