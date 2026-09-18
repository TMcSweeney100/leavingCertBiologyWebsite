import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { PersonalItemActions } from "./personal-item-actions";

const item = { id: "p1", title: "Driving test", dueDate: "2026-11-19", kind: "OTHER" as const, classId: null };

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("PersonalItemActions", () => {
  it("edits with the item's values filled in", async () => {
    vi.mocked(api.send).mockResolvedValue({ ...item, title: "Driving test (retake)", subjectName: null });
    render(<PersonalItemActions item={item} classes={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Driving test" }));
    const title = screen.getByRole("textbox", { name: "Title" });
    expect(title).toHaveValue("Driving test");
    await userEvent.type(title, " (retake)");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(api.send).toHaveBeenCalledWith("PATCH", "/me/personal-items/p1",
      { title: "Driving test (retake)", dueDate: "2026-11-19", kind: "OTHER", classId: null }, expect.anything());
  });

  it("deletes only after confirming, and Keep backs out", async () => {
    render(<PersonalItemActions item={item} classes={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Driving test" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(api.sendNoContent).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete Driving test" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete item" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/me/personal-items/p1");
    expect(refresh).toHaveBeenCalled();
  });
});
