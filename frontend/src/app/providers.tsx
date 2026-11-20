import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";

import { AuthProvider } from "../features/auth/AuthProvider";
import { ApiError } from "../lib/api";

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
      {/* "user": honor prefers-reduced-motion everywhere (transforms off, fades kept). */}
      {/* LazyMotion + domAnimation: only the animation/gesture/in-view features we use.
          The full bundle also creates a layout-projection node per element and measures
          the DOM on every commit (no `layout` animations exist here). strict = using
          `motion.*` instead of `m.*` throws in development. */}
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <AuthProvider>{children}</AuthProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
