import { useEffect } from "react";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Clearline Dental` : "Clearline Dental";
  }, [title]);
}
