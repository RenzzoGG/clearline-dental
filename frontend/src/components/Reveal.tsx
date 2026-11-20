import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Scroll reveals as CSS transitions + one IntersectionObserver per block (no Motion).
 *
 * The element gets `data-revealed` the first time it scrolls into view; the `.reveal` rules
 * in index.css fade/slide it in (opacity + transform only, compositor-friendly). With motion
 * off (toggle or prefers-reduced-motion) those rules don't apply and content is simply
 * visible. Motion's engine is not needed on the landing at all.
 */
function useRevealedOnce<T extends Element>() {
  const ref = useRef<T>(null);
  // Without IntersectionObserver (old browsers, jsdom) content starts revealed.
  const [revealed, setRevealed] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}

/** Fades/slides content in the first time it scrolls into view. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, revealed } = useRevealedOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-revealed={revealed || undefined}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      className={`reveal ${className}`}
    >
      {children}
    </div>
  );
}

/** Container whose <RevealItem> children appear one after another (`index` sets the order). */
export function RevealGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, revealed } = useRevealedOnce<HTMLDivElement>();
  return (
    <div ref={ref} data-revealed={revealed || undefined} className={`reveal-group ${className}`}>
      {children}
    </div>
  );
}

export function RevealItem({
  children,
  className = "",
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <div
      className={`reveal-item ${className}`}
      style={{ "--reveal-index": index } as CSSProperties}
    >
      {children}
    </div>
  );
}
