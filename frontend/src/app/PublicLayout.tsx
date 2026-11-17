import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router";

import { buttonClasses } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../features/auth/auth-context";
import { isStaff } from "../lib/types";
import { AnimatedOutlet } from "./AnimatedOutlet";

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { pathname, hash } = useLocation();

  // SPA navigation keeps the scroll position; reset it on page changes.
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Clearline Dental home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <a
              href="/#services"
              className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink-600 hover:text-ink-900 sm:inline"
            >
              Services
            </a>
            {user ? (
              <>
                {isStaff(user) && (
                  <NavLink
                    to="/dashboard"
                    className="rounded-full px-3 py-2 text-sm font-semibold text-ink-600 hover:text-ink-900"
                  >
                    Dashboard
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-ink-600 hover:text-ink-900"
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="rounded-full px-3 py-2 text-sm font-semibold text-ink-600 hover:text-ink-900"
              >
                Sign in
              </NavLink>
            )}
            {pathname !== "/book" && (
              <Link to="/book" className={buttonClasses("accent", "sm")}>
                Book a visit
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <AnimatedOutlet />
      </main>

      <footer className="bg-brand-950 text-brand-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo inverted />
          <p className="text-sm text-brand-200">
            Clearline Dental is a fictional clinic — a portfolio project. No real appointments are
            made.
          </p>
        </div>
      </footer>
    </div>
  );
}
