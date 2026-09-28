import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api, ApiError } from "@/lib/api/client";

import { LogVisibilityToggle } from "./log-visibility-toggle";

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("LogVisibilityToggle", () => {
  it("hides a visible entry in one tap", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<LogVisibilityToggle entryId="e1" title="Pilot run" visible />);
    await userEvent.click(screen.getByRole("button", { name: "Hide Pilot run from your teacher" }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/log/e1/visibility", { visible: false }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a hidden entry in one tap", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<LogVisibilityToggle entryId="e1" title="Pilot run" visible={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Show Pilot run to your teacher" }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/log/e1/visibility", { visible: true }, expect.anything());
  });

  it("puts a failure in an alert and focuses it", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "NOT_FOUND", status: 404, detail: "No such log entry." }));
    render(<LogVisibilityToggle entryId="e1" title="Pilot run" visible />);
    await userEvent.click(screen.getByRole("button", { name: "Hide Pilot run from your teacher" }));
    expect(await screen.findByRole("alert")).toHaveFocus();
  });
});
