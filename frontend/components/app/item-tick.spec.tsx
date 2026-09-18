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

import { ItemTick } from "./item-tick";

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("ItemTick", () => {
  it("ticks straight away, says who ticked it, and saves", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "i1", text: "Full draft in", dueDate: null, done: true });
    render(<ItemTick componentId="k1" item={{ id: "i1", text: "Full draft in", dueDate: "2026-12-04", done: false }} />);
    const box = screen.getByRole("checkbox", { name: /Full draft in/ });

    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(screen.getByText("Ticked by you")).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/teacher-items/i1/tick", { done: true }, expect.anything());
  });

  it("puts the box back and shows the error when saving fails", async () => {
    vi.mocked(api.send).mockRejectedValue(new Error("offline"));
    render(<ItemTick componentId="k1" item={{ id: "i1", text: "Full draft in", dueDate: null, done: true }} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Full draft in/ }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Full draft in/ })).toBeChecked();
  });
});
