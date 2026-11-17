import { Link, NavLink, useNavigate } from "react-router";

import { AnimatedOutlet } from "../../app/AnimatedOutlet";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../auth/auth-context";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
    isActive ? "bg-brand-700 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
  }`;

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/dashboard" aria-label="Clearline Dental dashboard">
            <Logo />
          </Link>
          <nav aria-label="Dashboard" className="flex gap-1">
            <NavLink to="/dashboard" end className={navClass}>
              <Icon name="calendar" className="size-4" /> Schedule
            </NavLink>
            <NavLink to="/dashboard/insights" className={navClass}>
              <Icon name="chart" className="size-4" /> Insights
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-sm sm:block">
              <span className="block font-semibold text-ink-900">
                {user?.first_name || user?.username}
              </span>
              <span className="block text-ink-500 capitalize">{user?.role}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon name="logout" className="size-4" />}
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <AnimatedOutlet />
      </main>
    </div>
  );
}
