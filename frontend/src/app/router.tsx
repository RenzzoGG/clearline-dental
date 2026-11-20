import { lazy, Suspense, type ReactNode } from "react";
import { Link, Route, Routes } from "react-router";

import { buttonClasses } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { RequireStaff } from "../features/auth/RequireStaff";
import LandingPage from "../features/site/LandingPage";
import PublicLayout from "./PublicLayout";

// Route-level code splitting: each page is its own chunk (the landing keeps only its hero in
// the shell). The route-preload Vite plugin fetches the current page's chunk in parallel.
const BookingPage = lazy(() => import("../features/booking/BookingPage"));
const LoginPage = lazy(() => import("../features/auth/LoginPage"));
const DashboardLayout = lazy(() => import("../features/dashboard/DashboardLayout"));
const SchedulePage = lazy(() => import("../features/dashboard/SchedulePage"));
const InsightsPage = lazy(() => import("../features/dashboard/InsightsPage"));

const page = (element: ReactNode) => (
  <Suspense
    fallback={
      // Full viewport height: keeps the footer below the fold while a route chunk loads,
      // so it doesn't visibly jump down when the page renders (CLS).
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Loading…" />
      </div>
    }
  >
    {element}
  </Suspense>
);

function NotFound() {
  return (
    <section className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink-900">This page doesn&apos;t exist</h1>
        <Link to="/" className={buttonClasses("primary", "md", "mt-8")}>
          Back to home
        </Link>
      </div>
    </section>
  );
}

/**
 * Declarative routes (<BrowserRouter> + <Routes>) instead of createBrowserRouter: the app
 * uses no loaders/actions, so the data-router engine was dead weight in the critical bundle.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="book" element={page(<BookingPage />)} />
        <Route path="login" element={page(<LoginPage />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="dashboard" element={<RequireStaff>{page(<DashboardLayout />)}</RequireStaff>}>
        <Route index element={page(<SchedulePage />)} />
        <Route path="insights" element={page(<InsightsPage />)} />
      </Route>
    </Routes>
  );
}
