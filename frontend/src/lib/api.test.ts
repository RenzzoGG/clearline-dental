import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, ApiError, request, SESSION_EXPIRED_EVENT } from "./api";
import { tokens } from "./tokens";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("request()", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    tokens.set("old-access", "old-refresh");
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    tokens.clear();
  });

  it("sends the access token", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await request("/auth/me/");
    const init = fetchMock.mock.calls[0]?.[1];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer old-access");
  });

  it("refreshes once on 401 and retries, sharing the refresh between parallel calls", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const auth = (init?.headers as Record<string, string>).Authorization;
      if (url.endsWith("/auth/token/refresh/"))
        return json(200, { access: "new-access", refresh: "new-refresh" });
      return auth === "Bearer new-access" ? json(200, { url }) : json(401, { detail: "expired" });
    });

    const results = await Promise.all([request("/a/"), request("/b/"), request("/c/")]);

    expect(results).toHaveLength(3);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/refresh/"));
    expect(refreshCalls).toHaveLength(1);
    expect(tokens.getAccess()).toBe("new-access");
    expect(tokens.getRefresh()).toBe("new-refresh");
  });

  it("clears the session and notifies when the refresh token is rejected", async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith("/refresh/")
        ? json(401, { detail: "blacklisted" })
        : json(401, { detail: "expired" }),
    );

    await expect(request("/auth/me/")).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledOnce();
    expect(tokens.getRefresh()).toBeNull();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("exposes DRF field errors", async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, { email: ["Already registered."], non_field_errors: ["Nope."] }),
    );

    const error = await api
      .register({ email: "a@b.c", password: "x", first_name: "A", last_name: "B", phone: "1" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.fieldError("email")).toBe("Already registered.");
    expect(error.fieldError()).toBe("Nope.");
  });

  it("follows pagination for allAppointments", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json(200, { count: 2, next: "page2", previous: null, results: [{ id: 1 }] }),
      )
      .mockResolvedValueOnce(
        json(200, { count: 2, next: null, previous: "page1", results: [{ id: 2 }] }),
      );

    const all = await api.allAppointments({ date_from: "2030-06-10", date_to: "2030-06-16" });

    expect(all.map((a) => a.id)).toEqual([1, 2]);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("page=2");
  });
});
