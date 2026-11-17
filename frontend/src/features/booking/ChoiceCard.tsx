import type { ReactNode } from "react";

/** Radio-like selectable card. Uses aria-pressed so screen readers announce the choice. */
export function ChoiceCard({
  selected,
  onSelect,
  children,
  className = "",
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "w-full rounded-2xl p-4 text-left ring-1 transition-[background-color,box-shadow] duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        selected
          ? "bg-brand-50 ring-2 ring-brand-600"
          : "bg-white ring-ink-200 hover:ring-brand-300",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
