import type { ReactNode } from "react";

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
}) {
  const styles = {
    error: "bg-red-50 text-red-800 ring-red-200",
    info: "bg-brand-50 text-brand-900 ring-brand-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ring-1 ${styles}`}
    >
      {children}
    </div>
  );
}
