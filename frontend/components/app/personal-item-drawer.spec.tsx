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

import { AddPersonalItem, EditPersonalItem } from "./personal-item-drawer";

const classes = [{ classId: "c1", className: "6A Biology", subjectName: "Biology" }];
const TODAY = "2026-11-12"; // a Thursday

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("AddPersonalItem", () => {
  it("opens a drawer that says only the student can see it, and adds the item with two taps for kind and date", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<AddPersonalItem classes={classes} today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item" }));

    const dialog = await screen.findByRole("dialog", { name: "Add my own item" });
    expect(within(dialog).getByText("Only you can see this. Your teachers can't.")).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Title" }), "French vocab test");
    await userEvent.click(within(dialog).getByRole("button", { name: "Test" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Tomorrow" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/me/personal-items",
      { title: "French vocab test", dueDate: "2026-11-13", kind: "TEST", classId: null }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("from a day's Add button, starts on that day", async () => {
    render(<AddPersonalItem classes={classes} today={TODAY} date="2026-11-14" compact />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item on Sat 14 Nov" }));
    const dialog = await screen.findByRole("dialog", { name: "Add my own item" });
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-11-14");
  });
});

describe("EditPersonalItem", () => {
  const item = { id: "p1", title: "History Test", dueDate: "2026-11-21", kind: "TEST" as const, classId: null };

  it("edits with the item's values filled in", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<EditPersonalItem item={item} classes={classes} today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit History Test" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit my own item" });
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toHaveValue("History Test");
    expect(within(dialog).getByRole("button", { name: "Test" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(dialog).getByRole("button", { name: "Essay" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("PATCH", "/me/personal-items/p1",
      { title: "History Test", dueDate: "2026-11-21", kind: "ESSAY", classId: null }, expect.anything());
  });

  it("deletes only after confirming, and Keep backs out", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue();
    render(<EditPersonalItem item={item} classes={classes} today={TODAY} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit History Test" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit my own item" });

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete this item" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep" }));
    expect(api.sendNoContent).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete this item" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/me/personal-items/p1");
    expect(refresh).toHaveBeenCalled();
  });
});
