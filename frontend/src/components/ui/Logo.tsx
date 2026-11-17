export function ToothMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-brand-700" />
      <path
        d="M10 9c2.2-1.3 4.2-.4 6 .4 1.8-.8 3.8-1.7 6-.4 2.6 1.6 2.4 5.3 1.4 8.4-.8 2.5-1.4 5-2.2 6.8-.6 1.3-2 1.2-2.4-.2l-1.1-4c-.4-1.4-2.9-1.4-3.3 0l-1.1 4c-.4 1.4-1.8 1.5-2.4.2-.8-1.8-1.4-4.3-2.2-6.8-1-3.1-1.2-6.8 1.3-8.4z"
        fill="white"
      />
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <ToothMark />
      <span
        className={`text-lg font-extrabold tracking-tight ${inverted ? "text-white" : "text-ink-900"}`}
      >
        Clearline<span className={inverted ? "text-mint-300" : "text-brand-600"}> Dental</span>
      </span>
    </span>
  );
}
