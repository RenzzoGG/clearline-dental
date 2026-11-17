/**
 * Token storage. The short-lived access token lives only in memory; the refresh token is
 * kept in localStorage so a page reload keeps the session (trade-off: readable by XSS;
 * an httpOnly cookie would need cookie-based auth endpoints on the backend).
 */
const REFRESH_KEY = "clearline.refresh";

let accessToken: string | null = null;

export const tokens = {
  getAccess: () => accessToken,
  getRefresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(access: string, refresh?: string) {
    accessToken = access;
    if (refresh) {
      try {
        localStorage.setItem(REFRESH_KEY, refresh);
      } catch {
        // Storage unavailable (private mode): the session lasts until reload.
      }
    }
  },
  clear() {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // ignore
    }
  },
};
