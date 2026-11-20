import { useState } from "react";
import { Outlet, useLocation } from "react-router";

/**
 * Route outlet with an enter transition (fade + small rise) as a CSS animation.
 *
 * CSS instead of Motion's AnimatePresence: this lives in the app shell, and Motion's render
 * engine would add ~10 KB gz to the critical bundle for a 200 ms effect. Enter-only is
 * enough for a calm site. The first page shown skips it (no animation on initial load).
 */
export function AnimatedOutlet() {
  const { pathname } = useLocation();
  const [firstPath, setFirstPath] = useState<string | null>(pathname);
  if (firstPath !== null && firstPath !== pathname) setFirstPath(null);
  const isFirstPage = firstPath === pathname;

  return (
    <div key={pathname} className={isFirstPage ? undefined : "motion-on:animate-page-in"}>
      <Outlet />
    </div>
  );
}
