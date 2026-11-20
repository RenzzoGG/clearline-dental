import { MotionConfig, MotionGlobalConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Site-wide motion preference (the header toggle).
 *
 * - Default: follows the OS `prefers-reduced-motion` setting.
 * - An explicit choice is saved in localStorage and wins over the OS setting.
 * - The inline script in index.html applies the same rule to `<html data-motion>` before the
 *   first paint, so CSS (`motion-on:` / `motion-off:` variants) never flashes the wrong state.
 *   This provider reads that attribute as its initial value and keeps it in sync.
 */
export const MOTION_STORAGE_KEY = "clearline-motion";

type MotionPreference = { enabled: boolean; setEnabled: (enabled: boolean) => void };

const MotionPreferenceContext = createContext<MotionPreference>({
  enabled: true,
  setEnabled: () => {},
});

function readStoredChoice(): boolean | null {
  try {
    const value = localStorage.getItem(MOTION_STORAGE_KEY);
    return value === "on" ? true : value === "off" ? false : null;
  } catch {
    return null; // Storage can be blocked (private mode, sandboxed iframes).
  }
}

const systemPrefersReduced = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Motion off = every Motion animation (fades included) jumps straight to its end state. */
function applyToMotion(enabled: boolean) {
  MotionGlobalConfig.instantAnimations = !enabled;
}

function initialEnabled(): boolean {
  const attribute = document.documentElement.dataset.motion;
  const enabled =
    attribute === "on" || attribute === "off"
      ? attribute === "on"
      : (readStoredChoice() ?? !systemPrefersReduced());
  // Set before any child mounts: children start their animations in their own effects,
  // which run before this provider's effects.
  applyToMotion(enabled);
  return enabled;
}

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(initialEnabled);

  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);

  // Without an explicit choice, follow live changes of the OS setting.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      if (readStoredChoice() !== null) return;
      applyToMotion(!query.matches);
      setEnabledState(!query.matches);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    applyToMotion(next);
    setEnabledState(next);
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, next ? "on" : "off");
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  }, []);

  return (
    <MotionPreferenceContext.Provider value={{ enabled, setEnabled }}>
      {/* "never" = animate even if the OS asks to reduce: the default already follows the
          OS, so "on" here means the visitor chose motion explicitly. */}
      <MotionConfig reducedMotion={enabled ? "never" : "always"}>{children}</MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}

export const useMotionPreference = () => useContext(MotionPreferenceContext);
