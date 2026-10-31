import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import type { DateRequest } from "@/lib/app/stage-sheet";

import { StageItems } from "./stage-items";

const stages = [
  { id: "s1", ordinal: 1, label: "Stage 1", name: "One", dueDate: null, items: [{ id: "i1", text: "Read the brief", dueDate: "2026-09-18" }] },
  { id: "s2", ordinal: 2, label: "Stage 2", name: "Two", dueDate: null, items: [{ id: "i2", text: "Bring three questions", dueDate: "2026-10-06" }] },
];

// The sheet answers a date request by showing its calendar; here the "calendar" picks 8 Oct at once.
const chooseDate = vi.fn((request: DateRequest) => request.onPick("2026-10-08"));

const renderItems = () => render(<StageItems componentId="k1" stage={stages[1]} stages={stages} chooseDate={chooseDate} />);

beforeEach(() => {
  refresh.mockReset();
  chooseDate.mockClear();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("StageItems", () => {
  it("lists only this stage's items, keeping their letters from the whole component", () => {
    renderItems();
    expect(screen.getByRole("button", { name: /^B Bring three questions/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Read the brief")).not.toBeInTheDocument();
  });

  it("adds an item to this stage, its date chosen through the sheet's calendar", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i3", text: "Draft question", dueDate: "2026-10-08" });
    renderItems();
    await userEvent.click(screen.getByRole("button", { name: "Add an item to Stage 2" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Draft question");
    await userEvent.click(screen.getByLabelText("Date (optional)"));
    expect(chooseDate).toHaveBeenCalledWith(expect.objectContaining({ title: "Choose the date for “Draft question”", picking: { kind: "item" } }));
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/teacher-items",
      { stageId: "s2", text: "Draft question", dueDate: "2026-10-08" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("opens an item in place to edit it, and retires it only after confirming", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    renderItems();
    await userEvent.click(screen.getByRole("button", { name: /^B Bring three questions/ }));
    expect(screen.getByRole("textbox", { name: "Item" })).toHaveValue("Bring three questions");

    await userEvent.click(screen.getByRole("button", { name: "Retire Bring three questions" }));
    const confirm = screen.getByText("Retire this item? Students won't see it any more.").parentElement!;
    await userEvent.click(within(confirm).getByRole("button", { name: "Retire item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i2");
  });
});
