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

import { TeacherItems } from "./teacher-items";

// D-5 rule 1: items are one flat, letter-ordered list for the whole component, not a list per stage.
const stages = () => [
  { id: "s4", ordinal: 4, label: "Stage 4", name: "Conducting the Experiment", dueDate: "2026-10-16", items: [{ id: "i3", text: "Book a re-run slot if your data needs it", dueDate: null }] },
  { id: "s6", ordinal: 6, label: "Stage 6", name: "Finalising the Report", dueDate: "2027-01-22", items: [
    { id: "i2", text: "Full draft in for feedback", dueDate: "2026-12-04" },
    { id: "i1", text: "Catch-up window closes", dueDate: "2026-11-13" },
  ] },
];

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("TeacherItems", () => {
  it("letters every item by date across the whole component, undated last", () => {
    render(<TeacherItems componentId="k1" stages={stages()} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Catch-up window closes");
    expect(rows[0]).toHaveTextContent("Stage 6 · 13 Nov 2026");
    expect(within(rows[0]).getByText("A")).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("Full draft in for feedback");
    expect(within(rows[1]).getByText("B")).toBeInTheDocument();
  });

  it("spells out why an undated item is missing from the line and the calendar", () => {
    render(<TeacherItems componentId="k1" stages={stages()} />);
    const undated = screen.getAllByRole("listitem")[2];
    expect(undated).toHaveTextContent("Stage 4 · no date, so not on the line or the calendar");
    expect(within(undated).getByText("C")).toBeInTheDocument();
  });

  it("says the letters follow the date", () => {
    render(<TeacherItems componentId="k1" stages={stages()} />);
    expect(screen.getByText(/Letters follow the date, so they change when a date does/)).toBeInTheDocument();
  });

  it("adds an item to a chosen stage, with an optional date", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i4", text: "Catch-up window closes", dueDate: null });
    render(<TeacherItems componentId="k1" stages={stages()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add item" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Lab notebooks in");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "s6");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/teacher-items",
      { stageId: "s6", text: "Lab notebooks in", dueDate: null }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("edits an item in place, keeping its stage", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i1", text: "Draft in", dueDate: "2026-12-04" });
    render(<TeacherItems componentId="k1" stages={stages()} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Full draft in for feedback" }));
    const text = screen.getByRole("textbox", { name: "Item" });
    await userEvent.clear(text);
    await userEvent.type(text, "Draft in");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("PATCH", "/components/k1/teacher-items/i2",
      { text: "Draft in", dueDate: "2026-12-04" }, expect.anything());
  });

  it("retires an item only after confirming in its row, and Keep backs out", async () => {
    render(<TeacherItems componentId="k1" stages={stages()} />);
    const row = screen.getAllByRole("listitem")[0];
    await userEvent.click(within(row).getByRole("button", { name: "Retire Catch-up window closes" }));
    expect(within(row).getByText(/students won't see it/i)).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Keep" }));
    expect(api.sendNoContent).not.toHaveBeenCalled();

    await userEvent.click(within(row).getByRole("button", { name: "Retire Catch-up window closes" }));
    await userEvent.click(within(row).getByRole("button", { name: "Retire item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i1");
    expect(refresh).toHaveBeenCalled();
  });

  it("retiring one item keeps an unsaved edit of another", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<TeacherItems componentId="k1" stages={stages()} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Full draft in for feedback" }));
    const box = screen.getByRole("textbox", { name: "Item" });
    await userEvent.clear(box);
    await userEvent.type(box, "Half-typed change");
    await userEvent.click(screen.getByRole("button", { name: "Retire Catch-up window closes" }));
    await userEvent.click(screen.getByRole("button", { name: "Retire item" }));

    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i1");
    expect(screen.getByRole("textbox", { name: "Item" })).toHaveValue("Half-typed change");
  });

  it("invites a first item when there are none", () => {
    render(<TeacherItems componentId="k1" stages={stages().map((s) => ({ ...s, items: [] }))} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("says it's saving while the item request is in flight", async () => {
    vi.mocked(api.send).mockReturnValue(new Promise(() => {}));
    render(<TeacherItems componentId="k1" stages={stages()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add item" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Lab notebooks in");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
