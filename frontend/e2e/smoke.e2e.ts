import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke tests (docs/DEPLOY.md §2), run in order against the production image:
 * 1. the public site loads;
 * 2. a new patient books an appointment end to end;
 * 3. the front desk (demo account) confirms that appointment in the dashboard.
 * Requires demo mode and `manage.py reset_demo` (fresh data, demo accounts).
 */
test.describe.configure({ mode: "serial" });

// Unique per run, so the front desk can find exactly this patient's appointment.
const runId = Date.now().toString(36);
const patient = {
  firstName: "Erin",
  lastName: `Smoke${runId}`,
  email: `e2e.${runId}@example.com`,
  phone: "+52 662 555 0142",
  password: `E2e-${runId}-Brightly`,
};
let bookedDateLabel = ""; // e.g. "Tuesday, November 24", from the booking confirmation

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("public site loads with its call to action", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Gentle dental care");
  await expect(page.locator("main").getByRole("link", { name: /book a visit/i })).toBeVisible();
  await page.getByRole("heading", { name: /priced up front/i }).scrollIntoViewIfNeeded();
  await expect(page.locator("[data-service-row]").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("a new patient books an appointment end to end", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/book");
  const next = () => page.getByRole("button", { name: /^continue/i }).click();

  // 1-2. First service and first dentist.
  await page.locator("main button[aria-pressed]").first().click();
  await next();
  await page.getByRole("heading", { name: "Dentist", exact: true }).waitFor();
  await page.locator("main button[aria-pressed]").first().click();
  await next();

  // 3. The first day with a free slot, then its first slot.
  const days = page.getByRole("group", { name: "Choose a day" }).getByRole("button");
  await days.first().waitFor();
  const slots = page.locator("div.min-h-40 button[aria-pressed]");
  for (let i = 0; i < (await days.count()); i++) {
    await days.nth(i).click();
    await page.waitForLoadState("networkidle");
    if (await slots.count()) break;
  }
  await slots.first().click();
  await next();

  // 4. Sign up as a new patient.
  await page.getByLabel("First name").fill(patient.firstName);
  await page.getByLabel("Last name").fill(patient.lastName);
  await page.getByLabel("Email").fill(patient.email);
  await page.getByLabel("Phone").fill(patient.phone);
  await page.getByLabel("Password").fill(patient.password);
  await page.getByRole("button", { name: /create account/i }).click();

  // 5. Confirm.
  await page.getByRole("button", { name: "Confirm booking" }).click();
  const success = page.getByRole("heading", { name: "You're booked!" });
  await expect(success).toBeVisible();
  const summary = await success.locator("..").innerText();
  bookedDateLabel =
    summary.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), \w+ \d+/)?.[0] ?? "";
  expect(bookedDateLabel).not.toBe("");
  expect(errors).toEqual([]);
});

test("the front desk confirms that appointment in the dashboard", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/login");

  // Demo front desk account, straight from the login page's demo card.
  const demo = page.getByRole("region", { name: "Try the demo" });
  await demo
    .locator("li", { hasText: "Front desk" })
    .getByRole("button", { name: "Use this account" })
    .click();
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();

  // Day view of the booked date: step forward until its title matches (within two weeks).
  await page.getByRole("button", { name: /^day$/i }).click();
  const title = page.locator("h1 + p");
  for (let i = 0; i < 15 && !(await title.innerText()).includes(bookedDateLabel); i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(title).toContainText(bookedDateLabel);

  const card = page.getByRole("button", { name: new RegExp(`${patient.lastName}.*Pending`) });
  await card.click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: /^confirm/i }).click();
  await expect(drawer.getByText("Confirmed", { exact: true })).toBeVisible();

  // The change is saved: it survives a reload.
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: /^day$/i }).click();
  for (let i = 0; i < 15 && !(await title.innerText()).includes(bookedDateLabel); i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(
    page.getByRole("button", { name: new RegExp(`${patient.lastName}.*Confirmed`) }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
