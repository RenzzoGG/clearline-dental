import { API_URL } from "./config";
import { tokens } from "./tokens";
import type {
  Appointment,
  Availability,
  DemoAccount,
  Dentist,
  Me,
  Paginated,
  Service,
  Stats,
  StatusAction,
  TokenPair,
} from "./types";

/** DRF error bodies: {"detail": "..."} or {"field": ["msg"], "non_field_errors": [...]} */
export type ApiErrorBody = Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(ApiError.describe(body) ?? `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }

  /** First message for a field (or the general error when no field is given). */
  fieldError(field?: string): string | undefined {
    const value = field ? this.body[field] : (this.body.detail ?? this.body.non_field_errors);
    if (Array.isArray(value)) return value.map(String)[0];
    return typeof value === "string" ? value : undefined;
  }

  private static describe(body: ApiErrorBody): string | undefined {
    for (const value of Object.values(body)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && value.length) return String(value[0]);
    }
    return undefined;
  }
}

/** Fired when the refresh token is rejected: the auth layer logs the user out. */
export const SESSION_EXPIRED_EVENT = "clearline:session-expired";

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Send the access token (default true). */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const access = tokens.getAccess();
  if (options.auth !== false && access) headers.Authorization = `Bearer ${access}`;

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange the refresh token for a new pair. Concurrent callers share one request:
 * with rotation + blacklist, a second parallel refresh would use an already-revoked token.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = tokens.getRefresh();
  if (!refresh) return Promise.resolve(false);

  refreshInFlight = (async () => {
    try {
      const response = await send("/auth/token/refresh/", {
        method: "POST",
        body: { refresh },
        auth: false,
      });
      if (!response.ok) return false;
      const pair = (await response.json()) as TokenPair;
      tokens.set(pair.access, pair.refresh);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : {};
  if (!response.ok) throw new ApiError(response.status, (data ?? {}) as ApiErrorBody);
  return data as T;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  const canRetry = options.auth !== false && response.status === 401 && tokens.getRefresh();
  if (canRetry) {
    if (await refreshAccessToken()) {
      response = await send(path, options);
    } else {
      tokens.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }
  return parse<T>(response);
}

// --- Endpoints -------------------------------------------------------------------

export interface AppointmentQuery {
  date_from?: string;
  date_to?: string;
  dentist?: number;
  status?: string;
}

const PAGE_SIZE = 100;

export const api = {
  services: () => request<Paginated<Service>>("/services/", { query: { page_size: PAGE_SIZE } }),
  dentists: () => request<Paginated<Dentist>>("/dentists/", { query: { page_size: PAGE_SIZE } }),
  availability: (dentist: number, service: number, date: string, signal?: AbortSignal) =>
    request<Availability>("/availability/", {
      query: { dentist, service, date },
      auth: false,
      signal,
    }),

  login: (username: string, password: string) =>
    request<TokenPair>("/auth/token/", {
      method: "POST",
      body: { username, password },
      auth: false,
    }),
  logout: (refresh: string) =>
    request<void>("/auth/token/blacklist/", { method: "POST", body: { refresh }, auth: false }),
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
  }) => request<Me>("/auth/register/", { method: "POST", body: data, auth: false }),
  me: () => request<Me>("/auth/me/"),
  demoAccounts: () => request<{ accounts: DemoAccount[] }>("/demo/", { auth: false }),

  createAppointment: (data: { dentist: number; service: number; starts_at: string }) =>
    request<Appointment>("/appointments/", { method: "POST", body: data }),
  transition: (id: number, action: StatusAction) =>
    request<Appointment>(`/appointments/${id}/${action}/`, { method: "POST" }),

  /** Every appointment matching the query, following pagination. */
  async allAppointments(query: AppointmentQuery): Promise<Appointment[]> {
    const results: Appointment[] = [];
    for (let page = 1; ; page++) {
      const data = await request<Paginated<Appointment>>("/appointments/", {
        query: { ...query, page, page_size: PAGE_SIZE, ordering: "starts_at" },
      });
      results.push(...data.results);
      if (!data.next) return results;
    }
  },

  stats: (date_from: string, date_to: string) =>
    request<Stats>("/stats/", { query: { date_from, date_to } }),
};
