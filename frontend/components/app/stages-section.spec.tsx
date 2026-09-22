import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { StagesSection } from "./stages-section";

const stage = (n: number, dueDate: string | null) => ({
  id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Stage name ${n}`, description: `What stage ${n} is.`,
  hoursMin: 1, hoursMax: 2, hoursGroup: null, supervised: false, dueDate, checkpoint: null, items: [], prompts: [],
});

const stages = [stage(1, "2026-05-29"), stage(2, "2026-10-16"), stage(3, null)];
const states = { s1: "done", s2: "current", s3: "undated" } as const;

describe("StagesSection", () => {
  it("opens only the current stage to start with", () => {
    render(<StagesSection componentId="k1" stages={stages} states={states} initialOpenId="s2" />);
    expect(document.getElementById("stage-s1-panel")).toHaveAttribute("aria-hidden", "true");
    expect(document.getElementById("stage-s2-panel")).toHaveAttribute("aria-hidden", "false");
  });

  it("opening a different stage closes the one that was open", async () => {
    render(<StagesSection componentId="k1" stages={stages} states={states} initialOpenId="s2" />);
    const rows = within(screen.getByTestId("stage-list"));
    await userEvent.click(rows.getByRole("button", { name: /Stage 1 · Stage name 1/ }));
    expect(document.getElementById("stage-s1-panel")).toHaveAttribute("aria-hidden", "false");
    expect(document.getElementById("stage-s2-panel")).toHaveAttribute("aria-hidden", "true");
  });

  it("closing the open stage by tapping it again leaves nothing open", async () => {
    render(<StagesSection componentId="k1" stages={stages} states={states} initialOpenId="s2" />);
    const rows = within(screen.getByTestId("stage-list"));
    await userEvent.click(rows.getByRole("button", { name: /Stage 2 · Stage name 2/ }));
    expect(document.getElementById("stage-s2-panel")).toHaveAttribute("aria-hidden", "true");
  });

  it("the strip navigator opens the tapped stage", async () => {
    render(<StagesSection componentId="k1" stages={stages} states={states} initialOpenId="s2" />);
    await userEvent.click(screen.getByRole("button", { name: /Stage 1, Done/ }));
    expect(document.getElementById("stage-s1-panel")).toHaveAttribute("aria-hidden", "false");
  });
});
