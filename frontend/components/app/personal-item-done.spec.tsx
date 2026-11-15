import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { DoneTick, MarkDoneButton } from "./personal-item-done";

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("DoneTick", () => {
  it("is a checkbox named for its item, and saves the tick", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<DoneTick id="p1" title="French vocab test" done={false} />);
    const box = screen.getByRole("checkbox", { name: "Done: French vocab test" });
    expect(box).not.toBeChecked();

    await userEvent.click(box);

    expect(box).toBeChecked();
    expect(api.send).toHaveBeenCalledWith("PUT", "/me/personal-items/p1/done", { done: true }, expect.anything());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("puts the tick back and says so when saving fails", async () => {
    vi.mocked(api.send).mockRejectedValue(new Error("offline"));
    render(<DoneTick id="p1" title="French vocab test" done={false} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Done: French vocab test" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't save. Try again.");
    expect(screen.getByRole("checkbox", { name: "Done: French vocab test" })).not.toBeChecked();
  });
});

describe("after a refresh brings new props", () => {
  it("DoneTick shows the item's new state, e.g. ticked from Next up", () => {
    const { rerender } = render(<DoneTick id="p1" title="French vocab test" done={false} />);
    rerender(<DoneTick id="p1" title="French vocab test" done={true} />);
    expect(screen.getByRole("checkbox", { name: "Done: French vocab test" })).toBeChecked();
  });

  it("MarkDoneButton starts fresh when Next up moves on to the next item", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    const { rerender } = render(<MarkDoneButton id="p1" title="Maths Assignment" />);
    await userEvent.click(screen.getByRole("button", { name: "Mark Maths Assignment done" }));
    rerender(<MarkDoneButton id="p2" title="Bio Assignment" />);
    expect(screen.getByRole("button", { name: "Mark Bio Assignment done" })).toBeEnabled();
  });
});

describe("MarkDoneButton", () => {
  it("ticks the item from the Next up card", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<MarkDoneButton id="p1" title="Maths Assignment" />);
    await userEvent.click(screen.getByRole("button", { name: "Mark Maths Assignment done" }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/me/personal-items/p1/done", { done: true }, expect.anything());
  });
});
