import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke tests (docs/DEPLOY.md §2), run in order against the production image:
 * 1. the public site loads;
 * 2. a new patient books an appointment end to end;
 * 3. the front desk (demo account) confirms that appointment in the dashboard;
 * 4. the demo patient signs in, is kept out of the dashboard and books as themselves.
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
  // Scope to the hero (the section holding the h1): the final "Visit us" section has a
  // second "Book a visit" link, which exists or not depending on whether the lazy
  // below-the-fold chunk has rendered yet, so an unscoped locator is timing dependent.
  const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
  await expect(hero.getByRole("link", { name: /book a visit/i })).toBeVisible();
  await page.getByRole("heading", { name: /priced up front/i }).scrollIntoViewIfNeeded();
  await expect(page.locator("[data-service-row]").first()).toBeVisible();
  expect(errors).toEqual([]);
});

/** Booking steps 1-3: the first service and dentist, then the first day with a free slot. */
async function pickServiceDentistAndSlot(page: Page) {
  await page.goto("/book");
  await page.locator("main button[aria-pressed]").first().click();
  await continueStep(page);
  await page.getByRole("heading", { name: "Dentist", exact: true }).waitFor();
  await page.locator("main button[aria-pressed]").first().click();
  await continueStep(page);

  const days = page.getByRole("group", { name: "Choose a day" }).getByRole("button");
  await days.first().waitFor();
  const slots = page.locator("div.min-h-40 button[aria-pressed]");
  for (let i = 0; i < (await days.count()); i++) {
    await days.nth(i).click();
    await page.waitForLoadState("networkidle");
    if (await slots.count()) break;
  }
  await slots.first().click();
  await continueStep(page);
}

function continueStep(page: Page) {
  return page.getByRole("button", { name: /^continue/i }).click();
}

/** Signs in with one of the login page's demo accounts ("Front desk" or "Patient"). */
async function signInAsDemo(page: Page, label: "Front desk" | "Patient") {
  await page.goto("/login");
  await page
    .getByRole("region", { name: "Try the demo" })
    .locator("li", { hasText: label })
    .getByRole("button", { name: "Use this account" })
    .click();
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
}

test("a new patient books an appointment end to end", async ({ page }) => {
  const errors = collectErrors(page);
  await pickServiceDentistAndSlot(page);

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
  await signInAsDemo(page, "Front desk");
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

test("the demo patient signs in and books as themselves", async ({ page }) => {
  const errors = collectErrors(page);
  await signInAsDemo(page, "Patient");
  // Patients land on the public site, and the dashboard sends them back to the login.
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

  await pickServiceDentistAndSlot(page);
  await expect(page.getByText(/^Booking as /)).toBeVisible();
  await continueStep(page);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "You're booked!" })).toBeVisible();
  expect(errors).toEqual([]);
});
