import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import { type DateRequest, stageItems } from "@/lib/app/stage-sheet";

import { StageItemView } from "./stage-item-view";

const stages = [
  { id: "s1", ordinal: 1, label: "Stage 1", name: "One", dueDate: null, items: [{ id: "i1", text: "Read the brief", dueDate: "2026-09-18" }] },
  { id: "s2", ordinal: 2, label: "Stage 2", name: "Two", dueDate: null, items: [{ id: "i2", text: "Bring three questions", dueDate: "2026-10-06" }] },
];
const item = stageItems(stages, "s2")[0]; // letter B

const emptyGrid = { componentId: "k1", classId: "c1", className: "6A", today: "2026-10-01", stages: [], students: [], waiting: [], itemTicks: [] };
// The sheet answers a date request by showing its calendar; here the "calendar" picks 8 Oct at once.
const chooseDate = vi.fn((request: DateRequest) => request.onPick("2026-10-08"));
const onBack = vi.fn();

const renderView = (shown: typeof item | null) =>
  render(<StageItemView componentId="k1" stage={stages[1]} item={shown} progress={{ ok: true, data: emptyGrid }} chooseDate={chooseDate} heading={createRef()} onBack={onBack} />);

beforeEach(() => {
  refresh.mockReset();
  chooseDate.mockClear();
  onBack.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("StageItemView", () => {
  it("a new item opens on the form; Save item adds it to this stage and goes back to Add an item", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i3", text: "Draft question", dueDate: "2026-10-08" });
    renderView(null);
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Draft question");
    await userEvent.click(screen.getByLabelText("Date (optional)"));
    expect(chooseDate).toHaveBeenCalledWith(expect.objectContaining({ title: "Choose the date for “Draft question”", picking: { kind: "item" } }));
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/teacher-items",
      { stageId: "s2", text: "Draft question", dueDate: "2026-10-08" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledWith("add");
  });

  it("an item opens on who has ticked it; Edit and Save item saves through its own endpoint and stays on the item", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i2", text: "Bring four questions", dueDate: "2026-10-06" });
    renderView(item);
    expect(screen.getByRole("heading", { name: "Who has ticked it" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit this item" }));
    const text = screen.getByRole("textbox", { name: "Item" });
    expect(text).toHaveFocus();
    await userEvent.clear(text);
    await userEvent.type(text, "Bring four questions");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("PATCH", "/components/k1/teacher-items/i2",
      { text: "Bring four questions", dueDate: "2026-10-06" }, expect.anything());
    expect(await screen.findByRole("button", { name: "Edit this item" })).toHaveFocus();
    expect(onBack).not.toHaveBeenCalled();
  });

  it("retires an item only after confirming, then goes back to Add an item", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    renderView(item);
    await userEvent.click(screen.getByRole("button", { name: "Edit this item" }));
    await userEvent.click(screen.getByRole("button", { name: "Retire Bring three questions" }));
    const confirm = screen.getByText("Retire this item? Students won't see it any more.").parentElement!;
    await userEvent.click(within(confirm).getByRole("button", { name: "Retire item" }));

    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i2");
    expect(onBack).toHaveBeenCalledWith("add");
  });

  it("Back returns to the stage, naming the item's row for focus", async () => {
    renderView(item);
    await userEvent.click(screen.getByRole("button", { name: "Back to Stage 2" }));
    expect(onBack).toHaveBeenCalledWith("i2");
  });
});
