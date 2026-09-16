import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";

/**
 * Gate P1's journey (roadmap §8.1): operator seeded a teacher (scripts/e2e.sh); the teacher signs in,
 * changes password, creates a class; a phone joins with the code and creates an account; the
 * teacher approves; the phone sees it; the teacher issues a reset code; the phone resets and signs
 * in. Every page visited gets an axe scan with no WCAG 2.2 AA violations.
 */
const TEACHER = {
  username: "e2e.teacher",
  temporary: process.env.E2E_TEACHER_PASSWORD ?? "",
  password: "e2e-teacher-password",
};
const STUDENT = {
  username: `e2e.student.${Date.now().toString(36)}`,
  password: "e2e-student-password",
  reset: "e2e-student-password-2",
};

async function expectAccessible(page: Page) {
  // Measure the settled page: a colour transition caught halfway (a route's CSS arriving just after
  // first paint starts one on every button) reads as a contrast failure that no user ever sees.
  // A cancelled animation (its element replaced by navigation) rejects `finished`; that's settled too.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))),
  );
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

async function phone(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true });
  return context.newPage();
}

test.describe.configure({ mode: "serial" });

test("the Phase 1 journey", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");

  // Signed out → login with next.
  await teacher.goto("/teach");
  await expect(teacher).toHaveURL(/\/login\?next=%2Fteach/);
  await expectAccessible(teacher);

  // Teacher signs in with the temporary password and is forced to change it. The harness seeds
  // one teacher for both projects, so the second project finds the password already changed:
  // the temporary one is refused, and it signs in with the permanent one instead.
  await teacher.getByRole("textbox", { name: "Username" }).fill(TEACHER.username);
  await teacher.getByLabel("Password").fill(TEACHER.temporary);
  await teacher.getByRole("button", { name: "Sign in" }).click();
  const forcedChange = teacher.getByRole("heading", { name: "Change password" });
  // Filtered by text: Next's route announcer is an empty role="alert" on every page.
  const refused = teacher.getByRole("alert").filter({ hasText: "Wrong username or password" });
  await expect(forcedChange.or(refused)).toBeVisible();
  if (await forcedChange.isVisible()) {
    await expect(teacher).toHaveURL(/\/account\/password/);
    await expectAccessible(teacher);
    await teacher.getByLabel("Current password").fill(TEACHER.temporary);
    await teacher.getByLabel("New password", { exact: true }).fill(TEACHER.password);
    await teacher.getByLabel("Confirm new password").fill(TEACHER.password);
    await teacher.getByRole("button", { name: "Change password" }).click();
  } else {
    await teacher.getByLabel("Password").fill(TEACHER.password);
    await teacher.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(teacher).toHaveURL(/\/teach$/);
  await expectAccessible(teacher);

  // Creates a class and reads the code.
  await teacher.getByRole("link", { name: "Create class" }).click();
  await expectAccessible(teacher);
  await teacher.getByRole("textbox", { name: "Class name" }).fill("6A Biology");
  await teacher.getByRole("button", { name: "Create" }).click();
  await expect(teacher).toHaveURL(/\/teach\/classes\//);
  await expectAccessible(teacher);
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  const classUrl = teacher.url();

  // A phone joins with the code and creates an account.
  const student = await phone(browser);
  await student.goto("/join");
  await expectAccessible(student);
  await student.getByRole("textbox", { name: "Join code" }).fill(code.toLowerCase());
  await student.getByRole("button", { name: "Continue" }).click();
  await expect(student.getByRole("heading", { name: "Join a class" })).toBeVisible();
  await expect(student.getByText("6A Biology")).toBeVisible();
  await expectAccessible(student);
  await student.getByRole("textbox", { name: "First name" }).fill("Aoife");
  await student.getByRole("textbox", { name: "Surname" }).fill("Byrne");
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByLabel("Password").fill(STUDENT.password);
  await student.getByRole("button", { name: "Create account and join" }).click();
  await expect(student).toHaveURL(/\/home$/);
  await expect(student.getByRole("listitem")).toContainText("Pending approval");
  await expectAccessible(student);

  // The teacher approves.
  await teacher.goto(classUrl);
  await teacher.getByRole("button", { name: "Approve Aoife Byrne" }).click();
  await expect(teacher.getByRole("region", { name: "Students" })).toContainText("Aoife Byrne");

  // The phone sees it.
  await student.reload();
  await expect(student.getByRole("listitem")).toContainText("Approved");

  // The teacher issues a reset code.
  await teacher.getByRole("button", { name: "Issue reset code for Aoife Byrne" }).click();
  const resetCode = (await teacher.getByRole("status").locator("strong").textContent())?.trim() ?? "";
  expect(resetCode).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  await expectAccessible(teacher);

  // The phone signs out, resets, and signs back in.
  await student.getByRole("button", { name: "Sign out" }).click();
  await expect(student).toHaveURL(/\/login/);
  await student.goto("/reset");
  await expectAccessible(student);
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByRole("textbox", { name: "Reset code" }).fill(resetCode);
  await student.getByLabel("New password").fill(STUDENT.reset);
  await student.getByRole("button", { name: "Set new password" }).click();
  await student.getByRole("link", { name: "Sign in" }).click();
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByLabel("Password").fill(STUDENT.reset);
  await student.getByRole("button", { name: "Sign in" }).click();
  await expect(student).toHaveURL(/\/home$/);
  await expect(student.getByRole("listitem")).toContainText("Approved");
});

test("keyboard-only sign in", async ({ page }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await page.keyboard.type(TEACHER.username);
  await page.keyboard.press("Tab");
  await page.keyboard.type(TEACHER.password);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/teach$/);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
