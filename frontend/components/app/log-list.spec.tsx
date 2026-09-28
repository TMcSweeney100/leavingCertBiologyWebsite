import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import type { LogEntry } from "@/lib/api/schemas";

import { LogList } from "./log-list";

const base = { componentId: "k1", createdAt: "2026-10-12T08:00:00Z", editedAt: null, revisionCount: 1, visibleToTeacher: true, body: null };
const entries: LogEntry[] = [
  { ...base, id: "e2", kind: "NOTE", body: "Private thought", visibleToTeacher: false, fields: null },
  { ...base, id: "e1", kind: "AI_USE", editedAt: "2026-10-13T08:00:00Z", revisionCount: 2,
    fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2026-10-12", howUsed: "Brainstorming", prompts: null, shareUrl: null } },
];

describe("LogList", () => {
  it("shows each entry's kind, date, edited mark and who can read it, newest first", () => {
    render(<LogList componentId="k1" entries={entries} />);
    const rows = within(screen.getByRole("list", { name: "Log entries" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Note");
    expect(rows[0]).toHaveTextContent("12 Oct 2026");
    expect(rows[0]).toHaveTextContent("Only you");
    expect(within(rows[0]).getByRole("button", { name: "Show Private thought to your teacher" })).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("AI use");
    expect(rows[1]).toHaveTextContent("Edited");
    expect(rows[1]).toHaveTextContent("Teacher can read");
    expect(rows[1]).toHaveTextContent("How you used it");
    expect(within(rows[1]).getByRole("button", { name: "Hide ChatGPT-4 from your teacher" })).toBeInTheDocument();
    expect(within(rows[1]).getByRole("link", { name: "ChatGPT-4" })).toHaveAttribute("href", "/components/k1/log/e1");
  });

  it("states the rule once, above the list", () => {
    render(<LogList componentId="k1" entries={entries} />);
    expect(screen.getByText(/Each entry is dated when you save it/)).toBeInTheDocument();
  });

  it("says so when the log is empty, and offers a first entry", () => {
    render(<LogList componentId="k1" entries={[]} />);
    expect(screen.getByText("Nothing in your log yet")).toBeInTheDocument();
    for (const rule of ["Dated for you.", "Edits are kept.", "Nothing is deleted."]) expect(screen.getByText(rule)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New entry" })).toHaveAttribute("href", "/components/k1/log/new");
  });
});
