import { expect, type Page, test } from "@playwright/test";

import { TEACHER, expectAccessible, phone, signInTeacher } from "./helpers";

/**
 * Ready-for-signoff: the class requires a link; the student adds one, marks Stage 1 ready with a note; the teacher sees
 * the badge and the queue, says Not yet with a note; the student reads it and asks again; the teacher accepts; the
 * student sees it signed off.
 */
const R = { className: "", classPath: "", aoife: "", password: "e2e-student-password" };
const INITIAL = "Initial ideas discussed with the teacher";

test.describe.configure({ mode: "serial" });

async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function signInStudent(browser: import("@playwright/test").Browser) {
  const s = await phone(browser);
  await s.goto("/login");
  await s.getByRole("textbox", { name: "Username" }).fill(R.aoife);
  await s.getByLabel("Password").fill(R.password);
  await s.getByRole("button", { name: "Sign in" }).click();
  await s.getByRole("link", { name: /Biology/ }).click();
  return s;
}

async function openStage1(s: import("@playwright/test").Page) {
  const stage1 = s.getByTestId("stage-list").getByRole("button", { name: /Initial Response/ });
  if ((await stage1.getAttribute("aria-expanded")) !== "true") await stage1.click();
}

test("a class that requires a link, with one approved student", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  const tag = `${test.info().project.name}.${Date.now().toString(36)}`;
  R.className = `6R Biology ${tag}`;
  R.aoife = `e2e.r.aoife.${tag}`;
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: "Create class" }).click();
  await teacher.getByRole("textbox", { name: "Class name" }).fill(R.className);
  await teacher.getByRole("button", { name: "Create" }).click();
  await teacher.getByRole("link", { name: "Component" }).click();
  await teacher.getByRole("button", { name: "Create component" }).click();
  await teacher.getByLabel("Stage 1 date").fill("2026-09-01");
  await Promise.all([
    teacher.waitForResponse((r) => r.url().includes("/stage-dates") && r.request().method() === "PUT"),
    teacher.getByRole("button", { name: "Save dates" }).click(),
  ]);
  await Promise.all([
    teacher.waitForResponse((r) => r.url().includes("/settings") && r.request().method() === "PUT"),
    teacher.getByRole("switch", { name: "Require a link to their work before students ask for sign-off" }).click(),
  ]);
  await expectAccessible(teacher);
  R.classPath = new URL(teacher.url()).pathname.replace(/\/component$/, "");
  await teacher.getByRole("link", { name: "Students" }).click();
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";

  const s = await phone(browser);
  await s.goto(`/join/${code}`);
  await s.getByRole("textbox", { name: "First name" }).fill("Aoife");
  await s.getByRole("textbox", { name: "Surname" }).fill("Byrne");
  await s.getByRole("textbox", { name: "Username" }).fill(R.aoife);
  await s.getByLabel("Password").fill(R.password);
  await s.getByRole("button", { name: "Create account and join" }).click();
  await expect(s).toHaveURL(/\/home$/);
  await s.context().close();
  await teacher.reload();
  await teacher.getByRole("button", { name: "Approve Aoife Byrne" }).click();
  await expect(teacher.getByRole("link", { name: "Aoife Byrne" })).toBeVisible();
});

test("the student needs a link, adds one, and asks with a note", async ({ browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  const s = await signInStudent(browser);
  await openStage1(s);
  await s.getByRole("button", { name: `Ready for sign-off: ${INITIAL}` }).click();
  await expect(s.getByRole("button", { name: "Send" })).toBeDisabled();
  await s.getByRole("textbox", { name: "Link to your work" }).fill("https://docs.google.com/document/d/e2e");
  await s.getByRole("button", { name: "Save link" }).click();
  await expect(s.getByRole("link", { name: "Open your work (opens in a new tab)" })).toHaveAttribute("rel", "noopener noreferrer");
  // The form the student opened stays open across the refresh, and Send is now allowed.
  await expect(s.getByRole("button", { name: "Send" })).toBeEnabled();
  await s.getByRole("textbox", { name: "Note for your teacher (optional)" }).fill("My ideas are on page 1");
  await s.getByRole("button", { name: "Send" }).click();
  await expect(s.getByText(/^Waiting for your teacher · asked /)).toBeVisible();
  await expectAccessible(s);
  await noSidewaysScroll(s);
  await s.context().close();
});

test("the teacher sees the badge and the queue, and says not yet", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await expect(teacher.getByRole("listitem").filter({ hasText: R.className }).getByText("1 waiting for sign-off")).toBeVisible();
  await teacher.goto(`${R.classPath}/progress`);
  await expect(teacher.getByRole("heading", { name: "1 student waiting for you" })).toBeVisible();
  await expectAccessible(teacher);
  await noSidewaysScroll(teacher);
  await teacher.getByRole("link", { name: `Review ${INITIAL} for Aoife Byrne` }).first().click();
  await expect(teacher).toHaveURL(/#checkpoint-/);
  await expect(teacher.getByText("My ideas are on page 1")).toBeVisible();
  await expect(teacher.getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" }).first())
    .toHaveAttribute("href", "https://docs.google.com/document/d/e2e");
  await expectAccessible(teacher);
  await noSidewaysScroll(teacher);
  await teacher.getByRole("textbox", { name: "Note to Aoife Byrne (optional)" }).fill("Say which idea you'll test.");
  await teacher.getByRole("button", { name: `Not yet: ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: "Full history (1 answer)" })).toBeVisible();
});

test("the student reads the note and asks again; the teacher accepts; the student sees it signed off", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  let s = await signInStudent(browser);
  await openStage1(s);
  await expect(s.getByText("Say which idea you'll test.", { exact: true })).toBeVisible();
  await s.getByRole("button", { name: `Ask again: ${INITIAL}` }).click();
  await s.getByRole("button", { name: "Send" }).click();
  await expect(s.getByText(/^Waiting for your teacher/)).toBeVisible();
  await s.context().close();

  await signInTeacher(teacher);
  await teacher.goto(`${R.classPath}/progress`);
  await teacher.getByRole("link", { name: `Review ${INITIAL} for Aoife Byrne` }).first().click();
  await teacher.getByRole("button", { name: `Accept ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Aoife Byrne` })).toBeVisible();

  s = await signInStudent(browser);
  await openStage1(s);
  await expect(s.getByText(/^Your teacher signed this off on /)).toBeVisible();
  await expect(s.getByText("Earlier requests (2)")).toBeVisible();
  await s.context().close();
});
