import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StageItems } from "./stage-items";

const stages = [
  { id: "s1", ordinal: 1, label: "Stage 1", name: "One", dueDate: null, items: [{ id: "i1", text: "Read the brief", dueDate: "2026-09-18" }] },
  { id: "s2", ordinal: 2, label: "Stage 2", name: "Two", dueDate: null, items: [{ id: "i2", text: "Bring three questions", dueDate: "2026-10-06" }] },
];

// No students, so every item has 0 ticked.
const emptyGrid = { componentId: "k1", classId: "c1", className: "6A", today: "2026-10-01", stages: [], students: [], waiting: [], itemTicks: [] };
const onOpen = vi.fn();

const renderItems = () => render(<StageItems stage={stages[1]} stages={stages} progress={{ ok: true, data: emptyGrid }} onOpen={onOpen} />);

beforeEach(() => onOpen.mockReset());

describe("StageItems", () => {
  it("lists only this stage's items, keeping their letters from the whole component", () => {
    renderItems();
    expect(screen.getByRole("button", { name: "B Bring three questions 0 ticked 6 Oct 2026" })).toBeInTheDocument();
    expect(screen.queryByText("Read the brief")).not.toBeInTheDocument();
  });

  it("a row opens its item, and Add an item opens a new one", async () => {
    renderItems();
    await userEvent.click(screen.getByRole("button", { name: /^B Bring three questions/ }));
    expect(onOpen).toHaveBeenCalledWith("i2");
    await userEvent.click(screen.getByRole("button", { name: "Add an item to Stage 2" }));
    expect(onOpen).toHaveBeenCalledWith("new");
  });
});
