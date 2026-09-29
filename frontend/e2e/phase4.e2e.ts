import { expect, type Page, test } from "@playwright/test";

import { TEACHER, expectAccessible, phone, signInTeacher } from "./helpers";

/**
 * Gate P4 (roadmap §8.4): the teacher signs off a checkpoint and, after Re-sort, that student moves down the grid
 * (less behind; furthest behind is first); revoking puts them back; the student's page shows the sign-off; Hide
 * names survives a reload. Runs on laptop (table) and phone (list): the role queries find whichever is visible.
 */
const P4 = { className: "", progress: "", aoife: "", cian: "", password: "e2e-student-password" };
const INITIAL = "Initial ideas discussed with the teacher";

test.describe.configure({ mode: "serial" });

async function join(browser: import("@playwright/test").Browser, code: string, first: string, last: string, username: string) {
  const student = await phone(browser);
  await student.goto(`/join/${code}`);
  await student.getByRole("textbox", { name: "First name" }).fill(first);
  await student.getByRole("textbox", { name: "Surname" }).fill(last);
  await student.getByRole("textbox", { name: "Username" }).fill(username);
  await student.getByLabel("Password").fill(P4.password);
  await student.getByRole("button", { name: "Create account and join" }).click();
  await expect(student).toHaveURL(/\/home$/);
  await student.context().close();
}

async function students(page: Page) {
  return page.getByRole("link", { name: /^(Aoife Byrne|Cian Murphy)$/ }).allTextContents();
}

async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test("a class with Stage 1 due and two approved students", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  const tag = `${test.info().project.name}.${Date.now().toString(36)}`;
  P4.className = `6P Biology ${tag}`;
  P4.aoife = `e2e.p4.aoife.${tag}`;
  P4.cian = `e2e.p4.cian.${tag}`;
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: "Create class" }).click();
  await teacher.getByRole("textbox", { name: "Class name" }).fill(P4.className);
  await teacher.getByRole("button", { name: "Create" }).click();
  await teacher.getByRole("link", { name: "Component" }).click();
  await teacher.getByRole("button", { name: "Create component" }).click();
  await teacher.getByLabel("Stage 1 date").fill("2026-09-01");
  await Promise.all([
    teacher.waitForResponse((r) => r.url().includes("/stage-dates") && r.request().method() === "PUT"),
    teacher.getByRole("button", { name: "Save dates" }).click(),
  ]);
  await teacher.getByRole("link", { name: "Students" }).click();
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";
  await join(browser, code, "Aoife", "Byrne", P4.aoife);
  await join(browser, code, "Cian", "Murphy", P4.cian);
  await teacher.reload();
  await teacher.getByRole("button", { name: "Approve Aoife Byrne" }).click();
  await teacher.getByRole("button", { name: "Approve Cian Murphy" }).click();
  await expect(teacher.getByRole("link", { name: "Cian Murphy" })).toBeVisible();
  await teacher.getByRole("link", { name: "Progress" }).click();
  await expect(teacher).toHaveURL(/\/progress/); // url() right after a click can still be the old page
  P4.progress = new URL(teacher.url()).pathname;
});

test("signing off moves a student down the grid after Re-sort, and revoking puts them back", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.goto(`${P4.progress}?stage=1`);
  await expect(teacher.getByRole("heading", { level: 2 })).toHaveText("2 of 2 students are behind");
  await expectAccessible(teacher);
  await noSidewaysScroll(teacher);
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]); // both behind by 1, no entries: surname

  await teacher.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeVisible();
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]); // nothing moves under the pointer
  await teacher.getByRole("button", { name: "Re-sort (1 change)" }).click();
  expect(await students(teacher)).toEqual(["Cian Murphy", "Aoife Byrne"]);

  await teacher.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByText(/It stays in the record as revoked by you/).filter({ visible: true })).toBeVisible(); // both layouts are in the DOM; one is display:none
  await expectAccessible(teacher);
  await teacher.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` })).toBeVisible();
  await teacher.reload();
  expect(await students(teacher)).toEqual(["Aoife Byrne", "Cian Murphy"]);

  await teacher.goto(P4.progress);
  await expectAccessible(teacher);
  await noSidewaysScroll(teacher);
});

test("the student sees the sign-off, and the teacher's student page shows its history", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.goto(`${P4.progress}?stage=1`);
  await teacher.getByRole("button", { name: `Sign off ${INITIAL} for Aoife Byrne` }).click();
  await expect(teacher.getByRole("button", { name: `Undo sign-off of ${INITIAL} for Aoife Byrne` })).toBeVisible();

  await teacher.getByRole("link", { name: "Aoife Byrne" }).click();
  await expect(teacher.getByRole("heading", { level: 2, name: "Checkpoints" })).toBeVisible();
  await expect(teacher.getByText(/revoked on .* by E2E Teacher\./)).toBeVisible();
  await expectAccessible(teacher);

  const student = await phone(browser);
  await student.goto("/login");
  await student.getByRole("textbox", { name: "Username" }).fill(P4.aoife);
  await student.getByLabel("Password").fill(P4.password);
  await student.getByRole("button", { name: "Sign in" }).click();
  await student.getByRole("link", { name: /Biology/ }).click();
  const stage1 = student.getByTestId("stage-list").getByRole("button", { name: /Initial Response/ }); // the stage strip has a same-named button
  if ((await stage1.getAttribute("aria-expanded")) !== "true") await stage1.click(); // StagesSection opens the current stage itself
  await expect(student.getByText(/^Your teacher signed this off on /)).toBeVisible();
});

test("Hide names blurs the page and survives a reload", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.goto(P4.progress);
  await teacher.getByRole("switch", { name: "Hide names" }).click();
  await teacher.reload();
  await expect(teacher.getByRole("switch", { name: "Hide names" })).toHaveAttribute("aria-checked", "true");
  await expect(teacher.getByRole("link", { name: "Aoife Byrne" })).toHaveCSS("filter", /blur/);
  await teacher.getByRole("switch", { name: "Hide names" }).click(); // leave the shared e2e browser state as found
});
