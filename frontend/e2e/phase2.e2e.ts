import { expect, test } from "@playwright/test";

import { TEACHER, expectAccessible, phone, signInTeacher } from "./helpers";

/**
 * Gate P2's journey (roadmap §8.2). 2D: the teacher creates a Biology component, sets dates, and a date after
 * the completion date is refused with the named message. 2E and 2F extend this file with the student's side.
 */
// Both Playwright projects (laptop, phone) run this file against one database, so names carry the project.
const P2 = { className: "" };
// Used by 2F, which extends this file with the student's remaining journey.
export const STUDENT = { username: "", password: "e2e-student-password" };
export let componentUrl = "";

test.describe.configure({ mode: "serial" });

test("teacher sets up a Biology component", async ({ page: teacher }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set; run through scripts/e2e.sh");
  P2.className = `6P Biology ${test.info().project.name} ${Date.now().toString(36)}`;
  await signInTeacher(teacher);

  await teacher.getByRole("link", { name: "Create class" }).click();
  await teacher.getByRole("textbox", { name: "Class name" }).fill(P2.className);
  await teacher.getByRole("button", { name: "Create" }).click();
  await expect(teacher).toHaveURL(/\/teach\/classes\//);

  await teacher.getByRole("link", { name: "Component" }).click();
  await expect(teacher).toHaveURL(/\/component$/);
  await expectAccessible(teacher);
  await expect(teacher.getByText(/2027L025C2EL/)).toBeVisible();
  await teacher.getByRole("button", { name: "Create component" }).click();

  await expect(teacher.getByRole("button", { name: "Save dates" })).toBeVisible();
  await expectAccessible(teacher);

  await teacher.getByLabel("Stage 6 Finalising the Biology in Practice Investigation Report").fill("2027-03-05");
  await teacher.getByRole("button", { name: "Save dates" }).click();
  await expect(teacher.getByRole("alert").filter({ hasText: "Stage 6 is after the completion date, 26 Feb 2027" })).toBeVisible();
  await expectAccessible(teacher);

  await teacher.getByLabel("Stage 6 Finalising the Biology in Practice Investigation Report").fill("2027-01-22");
  await teacher.getByLabel("Stage 4 Conducting the Experiment").fill("2026-10-16");
  await teacher.getByLabel("Stage 5 Data Analysis and Conclusions").fill("2026-12-09");
  // Wait for the PUT itself to settle before reloading: a reload while it's still in flight can
  // cancel the request, losing the save (seen flaky on the phone project without this).
  await Promise.all([
    teacher.waitForResponse((r) => r.url().includes("/stage-dates") && r.request().method() === "PUT"),
    teacher.getByRole("button", { name: "Save dates" }).click(),
  ]);
  await expect(teacher.getByRole("alert").filter({ hasText: "completion date" })).toHaveCount(0);
  await teacher.reload();
  await expect(teacher.getByLabel("Stage 4 Conducting the Experiment")).toHaveValue("2026-10-16");

  await teacher.getByRole("button", { name: "Add item to Stage 6" }).click();
  await teacher.getByRole("textbox", { name: "Item" }).fill("Full draft in for feedback");
  await teacher.getByLabel("Date (optional)").fill("2026-12-04");
  // exact: true — Playwright's accessible-name match is substring by default, and every other
  // stage still shows its own "Add item to Stage N" button while this one's form is open.
  await teacher.getByRole("button", { name: "Add item", exact: true }).click();
  await expect(teacher.getByRole("listitem").filter({ hasText: "Full draft in for feedback" })).toBeVisible();
  await expectAccessible(teacher);
});

test("a student sees the component and ticks a teacher item", async ({ page: teacher, browser }) => {
  test.skip(!TEACHER.temporary, "E2E_TEACHER_PASSWORD not set");
  STUDENT.username = `e2e.p2.${test.info().project.name}.${Date.now().toString(36)}`;
  await signInTeacher(teacher);
  await teacher.getByRole("link", { name: P2.className }).click();
  const code = (await teacher.getByRole("region", { name: "Join code" }).locator("strong").textContent())?.trim() ?? "";

  const student = await phone(browser);
  await student.goto(`/join/${code}`);
  await student.getByRole("textbox", { name: "First name" }).fill("Cian");
  await student.getByRole("textbox", { name: "Surname" }).fill("Murphy");
  await student.getByRole("textbox", { name: "Username" }).fill(STUDENT.username);
  await student.getByLabel("Password").fill(STUDENT.password);
  await student.getByRole("button", { name: "Create account and join" }).click();
  await expect(student).toHaveURL(/\/home$/);

  await teacher.reload();
  await teacher.getByRole("button", { name: "Approve Cian Murphy" }).click();
  await expect(teacher.getByRole("region", { name: "Students" })).toContainText("Cian Murphy");

  await student.reload();
  await student.getByRole("link", { name: /Biology/ }).click();
  await expect(student.getByRole("heading", { level: 1, name: "Biology" })).toBeVisible();
  componentUrl = student.url();
  await expect(student.getByRole("region", { name: "Stages" })).toContainText("Conducting the Experiment");
  await expectAccessible(student);

  await student.getByText("Finalising the Biology in Practice Investigation Report").click();
  await student.getByRole("checkbox", { name: /Full draft in for feedback/ }).check();
  await expect(student.getByText("Ticked by you")).toBeVisible();
  await student.reload();
  await student.getByText("Finalising the Biology in Practice Investigation Report").click();
  await expect(student.getByRole("checkbox", { name: /Full draft in for feedback/ })).toBeChecked();
  await expectAccessible(student);
});
