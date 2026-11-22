#!/usr/bin/env node
// Portfolio screenshots of the live demo (README + docs/screenshots/), Phase 7.
//
//   node scripts/capture-screenshots.mjs [--base URL] [--raw DIR] [--out DIR] [--book]
//
// Uses only the public demo accounts: their passwords come from the public GET /api/demo/
// at runtime (never hardcoded, never printed). Raw PNGs (DPR 2) go to --raw (default
// .cache/shots/phase7/, git-ignored); optimized WebP go to --out (default docs/screenshots/).
// Without --book nothing is written to the API; with --book the demo patient submits exactly
// one booking to capture the confirmation (the nightly demo reset removes it).
//
// Before any dashboard shot it checks, read-only, that every patient in the visible weeks
// has a seed/fake email domain, so no visitor's data ends up in a screenshot.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const REPO = path.resolve(import.meta.dirname, "../..");
const { values: args } = parseArgs({
  options: {
    base: { type: "string", default: "https://clearline.renzzogg.com" },
    raw: { type: "string", default: path.join(REPO, ".cache/shots/phase7") },
    out: { type: "string", default: path.join(REPO, "docs/screenshots") },
    book: { type: "boolean", default: false },
  },
});
const BASE = args.base.replace(/\/$/, "");
const SAFE_EMAIL = /@(clearline\.example|clearline\.test|example\.com)$/i;
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

fs.mkdirSync(args.raw, { recursive: true });
fs.mkdirSync(args.out, { recursive: true });

// --- API helpers (read-only) -------------------------------------------------------------

async function api(pathname, { token, method = "GET", body } = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${pathname} → ${response.status}`);
  return response.json();
}

async function listAll(pathname, token) {
  const rows = [];
  let next = pathname;
  while (next) {
    const page = await api(next, { token });
    rows.push(...(page.results ?? page));
    next = page.next ? new URL(page.next).pathname + new URL(page.next).search : null;
  }
  return rows;
}

const isoDate = (date) => date.toISOString().slice(0, 10);

/** Throws if any patient with an appointment in the next 15 days has a non-seed email. */
async function assertDashboardIsSafe() {
  const { accounts } = await api("/api/demo/");
  const reception = accounts.find((account) => account.role === "receptionist");
  const { access } = await api("/api/auth/token/", {
    method: "POST",
    body: { username: reception.username, password: reception.password },
  });
  const today = new Date();
  const from = new Date(today.getTime() - 7 * 86_400_000);
  const to = new Date(today.getTime() + 15 * 86_400_000);
  const appointments = await listAll(
    `/api/appointments/?date_from=${isoDate(from)}&date_to=${isoDate(to)}&page_size=100`,
    access,
  );
  const patients = new Map(
    (await listAll("/api/patients/?page_size=100", access)).map((p) => [p.id, p]),
  );
  const unsafe = appointments.filter((a) => !SAFE_EMAIL.test(patients.get(a.patient)?.email ?? ""));
  console.log(
    `privacy check: ${appointments.length} appointments, ${unsafe.length} with a non-seed email`,
  );
  if (unsafe.length) {
    // Only ids: never print a visitor's name or email.
    throw new Error(`visitor data in range (appointment ids ${unsafe.map((a) => a.id)})`);
  }
}

// --- Browser helpers ---------------------------------------------------------------------

async function shot(page, name, width, clip) {
  const raw = path.join(args.raw, `${name}.png`);
  await page.screenshot({ path: raw, clip });
  await sharp(raw)
    .resize({ width })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(args.out, `${name}.webp`));
  console.log(`  ${name}.webp`);
}

// Motion stays on (the header toggle reads "on"); shots wait for animations to settle.
async function newPage(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion });
  return context.newPage();
}

async function signInAsDemo(page, label) {
  await page.goto(`${BASE}/login`);
  await page
    .getByRole("region", { name: "Try the demo" })
    .locator("li", { hasText: label })
    .getByRole("button", { name: "Use this account" })
    .click();
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Opens a day in the picker and waits until its slots (or "No openings") have rendered. */
async function openDay(page, day) {
  await day.click();
  const list = page.locator("div.min-h-40");
  await page.waitForTimeout(300);
  await list
    .getByRole("status")
    .waitFor({ state: "detached" })
    .catch(() => {});
  await list
    .locator("button[aria-pressed]")
    .first()
    .or(list.getByText(/^No openings/))
    .waitFor();
  await page.waitForTimeout(400); // let the list's entrance animation finish
}

const continueStep = (page) => page.getByRole("button", { name: /^continue/i }).click();

/** Booking steps 1-3 (as in e2e/smoke.e2e.ts); `onService` runs on step 1,
 * `onSlot` once a slot is selected. */
async function pickServiceDentistAndSlot(page, { onService, onSlot } = {}) {
  await page.goto(`${BASE}/book`);
  await page.locator("main button[aria-pressed]").first().waitFor();
  if (onService) await onService();
  await page.locator("main button[aria-pressed]").first().click();
  await continueStep(page);
  await page.getByRole("heading", { name: "Dentist", exact: true }).waitFor();
  await page.locator("main button[aria-pressed]").first().click();
  await continueStep(page);

  const days = page.getByRole("group", { name: "Choose a day" }).getByRole("button");
  await days.first().waitFor();
  const slots = page.locator("div.min-h-40 button[aria-pressed]");
  // The day with the most free slots among the first 10 (a fuller picker for the shot).
  let best = { index: 0, count: -1 };
  for (let i = 0; i < Math.min(10, await days.count()); i++) {
    await openDay(page, days.nth(i));
    const count = await slots.count();
    if (count > best.count) best = { index: i, count };
  }
  if (best.count < 1) throw new Error("no free slots in the next 10 days");
  await openDay(page, days.nth(best.index));
  await slots.nth(Math.min(2, best.count - 1)).click();
  if (onSlot) await onSlot();
  await continueStep(page);
}

const settle = (page, ms = 1200) => page.waitForTimeout(ms);

// --- Shots -------------------------------------------------------------------------------

const browser = await chromium.launch();
try {
  console.log(`base: ${BASE}`);

  // Landing hero, with motion on so the entrance plays out to its final state.
  for (const [name, viewport, width] of [
    ["landing-hero", DESKTOP, DESKTOP.width],
    ["mobile-landing-hero", MOBILE, MOBILE.width],
  ]) {
    const page = await newPage(browser, viewport, "no-preference");
    await page.goto(BASE);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForLoadState("networkidle");
    await settle(page, 3000);
    // Crop to the hero section so no blank band shows under it.
    const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
    const box = await hero.boundingBox();
    const height = Math.min(viewport.height, Math.ceil((box?.y ?? 0) + (box?.height ?? 0)));
    await shot(page, name, width, { x: 0, y: 0, width: viewport.width, height });
    await page.context().close();
  }

  // Booking flow as a visitor: service step and availability picker (nothing submitted).
  for (const [prefix, viewport, width] of [
    ["", DESKTOP, DESKTOP.width],
    ["mobile-", MOBILE, MOBILE.width],
  ]) {
    const page = await newPage(browser, viewport);
    await pickServiceDentistAndSlot(page, {
      onService: async () => {
        if (prefix) return;
        await page.locator("main button[aria-pressed]").first().click();
        await settle(page);
        await shot(page, "booking-service", width);
        await page.locator("main button[aria-pressed]").first().click(); // toggle back
      },
      onSlot: async () => {
        await page.evaluate(() => window.scrollTo(0, 0)); // picking a day scrolls the page
        await settle(page);
        await shot(page, `${prefix}booking-availability`, width);
      },
    });
    await page.context().close();
  }

  // Signed-in demo patient: "Booking as …", the review step and (with --book) one booking.
  {
    const page = await newPage(browser, DESKTOP);
    await signInAsDemo(page, "Patient");
    await pickServiceDentistAndSlot(page);
    await page.getByText(/^Booking as /).waitFor();
    await settle(page);
    await shot(page, "patient-details", DESKTOP.width);
    await continueStep(page);
    const confirm = page.getByRole("button", { name: "Confirm booking" });
    await confirm.waitFor();
    await settle(page);
    await shot(page, "patient-review", DESKTOP.width);
    if (args.book) {
      await confirm.click();
      await page.getByRole("heading", { name: "You're booked!" }).waitFor();
      await settle(page, 1200);
      await shot(page, "patient-booked", DESKTOP.width);
      console.log("  (one demo-patient booking submitted)");
    }
    await page.context().close();
  }

  // Front desk dashboard, after the privacy check.
  await assertDashboardIsSafe();
  for (const [prefix, viewport, width] of [
    ["", DESKTOP, DESKTOP.width],
    ["mobile-", MOBILE, MOBILE.width],
  ]) {
    const page = await newPage(browser, viewport);
    await signInAsDemo(page, "Front desk");
    await page.getByRole("heading", { name: "Schedule" }).waitFor();
    // Upcoming appointments (pending/confirmed) read better than a past week: desktop shows
    // next week, mobile the day view of tomorrow.
    if (prefix) await page.getByRole("button", { name: /^day$/i }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForLoadState("networkidle");
    await settle(page);
    await shot(page, `${prefix}reception-schedule`, width);
    if (!prefix) {
      await page.goto(`${BASE}/dashboard/insights`);
      await page.getByRole("heading", { name: "Insights" }).waitFor();
      await page.getByRole("button", { name: "Last 7 days" }).click();
      await page.waitForLoadState("networkidle");
      await settle(page, 1500);
      await shot(page, "reception-insights", width);
    }
    await page.context().close();
  }

  // Swagger UI (public, no token entered).
  {
    const page = await newPage(browser, DESKTOP);
    await page.goto(`${BASE}/api/docs/`);
    await page.locator(".swagger-ui .opblock").first().waitFor();
    await settle(page, 1000);
    await shot(page, "swagger", DESKTOP.width);
    await page.context().close();
  }
} finally {
  await browser.close();
}
