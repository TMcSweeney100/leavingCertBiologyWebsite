import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { teacherStudentLogSchema, type TeacherStudentLog } from "@/lib/api/schemas";

import { TeacherLog } from "./teacher-log";

const log: TeacherStudentLog = {
  studentId: "s1", firstName: "Cian", lastName: "Murphy", componentId: "k1",
  entries: [
    { visibility: "HIDDEN", id: "e3", kind: "NOTE", createdAt: "2027-03-03T10:00:00Z", editedAt: null, revisionCount: 1, hiddenAt: "2027-03-04T10:00:00Z" },
    { visibility: "HIDDEN", id: "e2", kind: "AI_USE", createdAt: "2027-03-02T10:00:00Z", editedAt: null, revisionCount: 1, hiddenAt: null },
    { visibility: "VISIBLE", id: "e1", kind: "NOTE", createdAt: "2027-03-01T10:00:00Z", editedAt: "2027-03-02T10:00:00Z", revisionCount: 2,
      body: "Pilot run went well", fields: null,
      history: [
        { number: 2, body: "Pilot run went well", fields: null, createdAt: "2027-03-02T10:00:00Z" },
        { number: 1, body: "Pilot run", fields: null, createdAt: "2027-03-01T10:00:00Z" },
      ] },
  ],
};

describe("TeacherLog", () => {
  it("shows a hidden entry exists, when, and that it was hidden — never what it said", () => {
    render(<TeacherLog log={log} />);
    const rows = within(screen.getByRole("list", { name: "Log entries" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Note");
    expect(rows[0]).toHaveTextContent("3 Mar 2027");
    expect(rows[0]).toHaveTextContent("Made private by Cian on 4 Mar 2027");
    expect(rows[1]).toHaveTextContent("AI use");
    expect(rows[1]).toHaveTextContent("Private entry");
    expect(rows[1]).toHaveTextContent("2 Mar 2027");
    expect(rows[1]).not.toHaveTextContent("Made private");
  });

  it("renders a hidden entry as one meta line with no content, even if content is smuggled into props", () => {
    const smuggled = {
      ...log.entries[0], body: "SECRET BODY", history: [{ number: 1, body: "SECRET HISTORY", fields: null, createdAt: "2027-03-03T10:00:00Z" }],
      fields: { toolNameAndVersion: "SECRET TOOL", developer: "d", dateGenerated: "2027-03-03", howUsed: "SECRET HOW", prompts: null, shareUrl: null },
    } as unknown as TeacherStudentLog["entries"][number];
    render(<TeacherLog log={{ ...log, entries: [smuggled] }} />);
    const row = within(screen.getByRole("list", { name: "Log entries" })).getByRole("listitem");
    expect(row).toHaveTextContent("Made private by Cian on 4 Mar 2027");
    expect(row.querySelector("details")).toBeNull();
    expect(document.body.textContent).not.toContain("SECRET");
    expect(screen.queryByText(/History/)).not.toBeInTheDocument();
  });

  it("opens a visible entry in place: what they wrote, that it was edited, and its history one tap away", async () => {
    render(<TeacherLog log={log} />);
    const row = screen.getByRole("button", { name: /Pilot run went well/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/^Edited/)).not.toBeInTheDocument();
    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Edited · 2 revisions, last on 2 Mar 2027")).toBeInTheDocument();
    expect(screen.getByText("History (2 revisions)")).toBeInTheDocument();
  });

  it("counts what the student has shared, framed as their choice", () => {
    render(<TeacherLog log={log} />);
    expect(screen.getByText("3 entries. Cian has shared 1 with you.")).toBeInTheDocument();
  });

  it("shows the latest three until Show all, then filters by kind and says what's showing", async () => {
    const book = { visibility: "VISIBLE" as const, id: "e0", kind: "SOURCE" as const, createdAt: "2027-02-28T10:00:00Z", editedAt: null, revisionCount: 1, body: null,
      fields: { type: "BOOK" as const, title: "Campbell Biology", author: "Urry", publication: "Pearson", datePublished: "2020", url: null,
        dateAccessed: "2027-02-28", locator: null, keyInformation: null, relevance: null, reflections: null },
      history: [] };
    render(<TeacherLog log={{ ...log, entries: [...log.entries, book] }} />);
    const list = screen.getByRole("list", { name: "Log entries" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Campbell Biology")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show all 4 entries" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    await userEvent.click(screen.getByRole("button", { name: "Sources 1" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Sources 1" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Showing 1 source.")).toBeInTheDocument();
  });

  it("says when the student hasn't written anything", () => {
    render(<TeacherLog log={{ ...log, entries: [] }} />);
    expect(screen.getByText("Cian hasn't written any log entries yet.")).toBeInTheDocument();
    expect(screen.getByText(/see only the kind and date of any they keep private/)).toBeInTheDocument();
  });

  it("refuses a hidden entry that carries content", () => {
    const leaked = { ...log, entries: [{ ...log.entries[0], body: "leak" }] };
    expect(teacherStudentLogSchema.safeParse(leaked).success).toBe(false);
  });

  it("accepts the shapes the API sends", () => {
    expect(teacherStudentLogSchema.safeParse(log).success).toBe(true);
  });
});
