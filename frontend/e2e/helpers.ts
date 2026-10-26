import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page } from "@playwright/test";

export const TEACHER = {
  username: "e2e.teacher",
  temporary: process.env.E2E_TEACHER_PASSWORD ?? "",
  password: "e2e-teacher-password",
};

export async function expectAccessible(page: Page) {
  // Measure the settled page: a colour transition caught halfway (a route's CSS arriving just after
  // first paint starts one on every button) reads as a contrast failure that no user ever sees.
  // A cancelled animation (its element replaced by navigation) rejects `finished`; that's settled too.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))),
  );
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

export async function phone(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });
  return context.newPage();
}

/** Signs the seeded teacher in whether or not an earlier journey already changed the temporary password. */
export async function signInTeacher(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Username" }).fill(TEACHER.username);
  await page.getByLabel("Password").fill(TEACHER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  const refused = page.getByRole("alert").filter({ hasText: "Wrong username or password" });
  await expect(page.getByRole("heading", { name: "My classes" }).or(refused)).toBeVisible();
  if (await refused.isVisible()) {
    await page.getByLabel("Password").fill(TEACHER.temporary);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByLabel("Current password").fill(TEACHER.temporary);
    await page.getByLabel("New password", { exact: true }).fill(TEACHER.password);
    await page.getByLabel("Confirm new password").fill(TEACHER.password);
    await page.getByRole("button", { name: "Change password" }).click();
  }
  await expect(page).toHaveURL(/\/teach$/);
}

/**
 * Sets a date the only way the page allows (plan date-picker-drawer C-35, C-41): open the date button, type the date
 * day first into the drawer's "Type a date" field, and press Enter to use it. Nothing is typed on the page itself.
 */
export async function setDate(page: Page, label: string, iso: string) {
  await page.getByLabel(label, { exact: true }).click();
  const drawer = page.getByRole("dialog");
  const [year, month, day] = iso.split("-");
  const field = drawer.getByRole("textbox", { name: "Type a date" });
  await field.fill(`${day}${month}${year}`);
  await field.press("Enter");
  await expect(drawer).toHaveCount(0);
}
