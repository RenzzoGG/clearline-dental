import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { Spinner } from "../../components/ui/Spinner";
import { isStaff } from "../../lib/types";
import { useAuth } from "./auth-context";

/** Route guard for the dashboard. The API enforces roles too; this only improves UX. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Checking your session…" />
      </div>
    );
  }
  if (!isStaff(user)) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}
