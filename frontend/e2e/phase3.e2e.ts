import { expect, type Page, test } from "@playwright/test";

import { TEACHER, expectAccessible, phone, signInTeacher } from "./helpers";

/**
 * Gate P3's journey (roadmap §8.3): a student logs a note, a source and an AI use and hides the note; the
 * teacher sees that the note exists but not its text; the student edits the source; the teacher sees
 * "Edited" and its history.
 */
const P3 = { className: "", student: "", password: "e2e-student-password" };
const NOTE = "Pilot run went well, retest Tuesday";

test.describe.configure({ mode: "serial" });

test("a class with a component and an approved student", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  P3.className = `6L Biology ${test.info().project.name} ${Date.now().toString(36)}`;
  P3.student = `e2e.p3.${test.info().project.name}.${Date.now().toString(36)}`;
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: "Create class" }).click();
  await teacher.getByRole("textbox", { name: "Class name" }).fill(P3.className);
  await teacher.getByRole("button", { name: "Create" }).click();
  await teacher.getByRole("link", { name: "Component" }).click();
  await teacher.getByRole("button", { name: "Create component" }).click();
  await expect(teacher.getByRole("button", { name: "Save dates" })).toBeVisible();
  await teacher.getByRole("link", { name: "Students" }).click();
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";

  const student = await phone(browser);
  await student.goto(`/join/${code}`);
  await student.getByRole("textbox", { name: "First name" }).fill("Aoife");
  await student.getByRole("textbox", { name: "Surname" }).fill("Byrne");
  await student.getByRole("textbox", { name: "Username" }).fill(P3.student);
  await student.getByLabel("Password").fill(P3.password);
  await student.getByRole("button", { name: "Create account and join" }).click();
  await expect(student).toHaveURL(/\/home$/);

  await teacher.reload();
  await teacher.getByRole("button", { name: "Approve Aoife Byrne" }).click();
  await expect(teacher.getByRole("link", { name: "Aoife Byrne" })).toBeVisible();
});

async function signInStudent(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Username" }).fill(P3.student);
  await page.getByLabel("Password").fill(P3.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home/);
}

async function newEntry(student: Page) {
  await student.getByRole("link", { name: "New entry" }).click();
  await expect(student.getByRole("heading", { level: 1, name: "New entry" })).toBeVisible();
}

async function save(student: Page) {
  await Promise.all([
    student.waitForResponse((r) => r.url().endsWith("/log") && r.request().method() === "POST"),
    student.getByRole("button", { name: "Save entry" }).click(),
  ]);
  await expect(student).toHaveURL(/\/log$/);
}

test("the student logs a note, a source and an AI use, hides the note and edits the source", async ({ browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  const student = await phone(browser);
  await signInStudent(student);
  await student.getByRole("link", { name: /Biology/ }).click();
  await student.getByRole("navigation", { name: "Component sections" }).getByRole("link", { name: "Log" }).click();
  await expect(student.getByText("Nothing in your log yet")).toBeVisible();
  await expectAccessible(student);

  await newEntry(student);
  await expect(student.getByText("Your teacher can read this.")).toBeVisible();
  await expectAccessible(student);
  await student.getByRole("textbox", { name: "Note" }).fill(NOTE);
  await save(student);

  await newEntry(student);
  await student.locator("label").filter({ hasText: /^Source$/ }).click(); // the radio itself is visually hidden; its label is the target
  await student.getByRole("combobox", { name: "Type of source" }).selectOption("ONLINE_VIDEO");
  await student.getByRole("textbox", { name: "Title" }).fill("Titration technique demo");
  await student.getByRole("textbox", { name: "Link" }).fill("https://youtu.be/yCv4iyPqZKQ");
  await student.getByLabel("Date accessed").fill("2026-10-01");
  await expectAccessible(student);
  await save(student);

  await newEntry(student);
  await student.locator("label").filter({ hasText: /^AI use$/ }).click(); // the radio itself is visually hidden; its label is the target
  await student.getByRole("textbox", { name: "AI tool and version" }).fill("ChatGPT-4");
  await student.getByRole("textbox", { name: "Developer or publisher" }).fill("OpenAI");
  await student.getByLabel("Date the output was generated").fill("2026-10-01");
  await student.getByRole("textbox", { name: "How you used it" }).fill("Suggested possible project themes.");
  await save(student);

  const noteRow = student.getByRole("listitem").filter({ hasText: NOTE });
  await noteRow.getByRole("button", { name: /^Hide / }).click();
  await expect(noteRow.getByRole("button", { name: /^Show / })).toBeVisible();
  await expectAccessible(student);

  await student.getByRole("link", { name: "Titration technique demo" }).click();
  await student.getByRole("link", { name: "Revise entry" }).click();
  await student.getByRole("textbox", { name: "Title" }).fill("Titration technique demo (RTÉ)");
  await Promise.all([
    student.waitForResponse((r) => r.url().includes("/revisions") && r.request().method() === "POST"),
    student.getByRole("button", { name: "Save new revision" }).click(),
  ]);
  await expect(student.getByRole("list", { name: "Revisions" }).getByRole("listitem")).toHaveCount(2);
  await expectAccessible(student);
});

test("the teacher sees the hidden note exists but not its text, and the edited source's history", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: P3.className }).click();
  await teacher.getByRole("link", { name: "Aoife Byrne" }).click();
  await expect(teacher.getByRole("heading", { level: 1, name: "Aoife Byrne" })).toBeVisible();

  const rows = teacher.getByRole("list", { name: "Log entries" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(teacher.getByText(/Made private by Aoife on /)).toBeVisible();
  await expect(teacher.getByText(NOTE)).toHaveCount(0);
  const source = rows.filter({ hasText: "Titration technique demo (RTÉ)" });
  await expect(source).toContainText("Edited");
  await source.getByText("History (2 revisions)").click();
  await expect(source.getByRole("list", { name: "Revisions" }).getByRole("listitem")).toHaveCount(2);
  await expect(rows.filter({ hasText: "ChatGPT-4" })).toContainText("AI use");
  await expectAccessible(teacher);
});
