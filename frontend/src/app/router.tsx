import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Link } from "react-router";

import { buttonClasses } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { RequireStaff } from "../features/auth/RequireStaff";
import LandingPage from "../features/site/LandingPage";
import PublicLayout from "./PublicLayout";

// Route-level code splitting: the landing page ships in the main bundle,
// everything else (incl. recharts in the dashboard) loads on demand.
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

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "book", element: page(<BookingPage />) },
      { path: "login", element: page(<LoginPage />) },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "dashboard",
    element: <RequireStaff>{page(<DashboardLayout />)}</RequireStaff>,
    children: [
      { index: true, element: page(<SchedulePage />) },
      { path: "insights", element: page(<InsightsPage />) },
    ],
  },
]);
