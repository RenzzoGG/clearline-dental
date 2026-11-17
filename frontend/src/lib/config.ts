/** Base URL of the REST API. In dev Vite proxies "/api" to Django. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? "/api";

/** Must match Django's TIME_ZONE: every time shown in the UI is clinic local time. */
export const CLINIC_TIME_ZONE: string =
  import.meta.env.VITE_CLINIC_TIME_ZONE ?? "America/Hermosillo";
