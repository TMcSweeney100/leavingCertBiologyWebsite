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

const stage = { id: "s6", label: "Stage 6", name: "Finalising the Report", items: [{ id: "i1", text: "Full draft in for feedback", dueDate: "2026-12-04" }] };

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("TeacherItems", () => {
  it("lists items with their dates", () => {
    render(<TeacherItems componentId="k1" stage={stage} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Full draft in for feedback");
    expect(screen.getByRole("listitem")).toHaveTextContent("4 Dec 2026");
  });

  it("adds an item with an optional date", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i2", text: "Catch-up window closes", dueDate: null });
    render(<TeacherItems componentId="k1" stage={stage} />);
    await userEvent.click(screen.getByRole("button", { name: "Add item to Stage 6" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Item" }), "Catch-up window closes");
    await userEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/teacher-items",
      { stageId: "s6", text: "Catch-up window closes", dueDate: null }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("edits an item in place", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i1", text: "Draft in", dueDate: "2026-12-04" });
    render(<TeacherItems componentId="k1" stage={stage} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Full draft in for feedback" }));
    const text = screen.getByRole("textbox", { name: "Item" });
    await userEvent.clear(text);
    await userEvent.type(text, "Draft in");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("PATCH", "/components/k1/teacher-items/i1",
      { text: "Draft in", dueDate: "2026-12-04" }, expect.anything());
  });

  it("retires an item only after confirming in its row, and Keep backs out", async () => {
    render(<TeacherItems componentId="k1" stage={stage} />);
    const row = screen.getByRole("listitem");
    await userEvent.click(within(row).getByRole("button", { name: "Retire Full draft in for feedback" }));
    expect(within(row).getByText(/students won't see it/i)).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Keep" }));
    expect(api.sendNoContent).not.toHaveBeenCalled();

    await userEvent.click(within(row).getByRole("button", { name: "Retire Full draft in for feedback" }));
    await userEvent.click(within(row).getByRole("button", { name: "Retire item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/components/k1/teacher-items/i1");
    expect(refresh).toHaveBeenCalled();
  });
});
