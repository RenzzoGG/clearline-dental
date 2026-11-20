import { useMotionPreference } from "../../app/motion-preference";
import { Icon } from "./Icon";

/** Header switch for site animations. Its initial state follows prefers-reduced-motion. */
export function MotionToggle() {
  const { enabled, setEnabled } = useMotionPreference();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}
      title={enabled ? "Turn animations off" : "Turn animations on"}
      className="inline-flex h-9 items-center gap-2 rounded-full px-2 text-sm font-semibold whitespace-nowrap text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <Icon name="wave" className="size-4" />
      <span className="sr-only lg:not-sr-only">Motion</span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? "bg-brand-600" : "bg-ink-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm motion-on:transition-transform ${enabled ? "translate-x-4" : ""}`}
        />
      </span>
    </button>
  );
}
