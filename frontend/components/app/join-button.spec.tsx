import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { JoinButton } from "./join-button";

const view = (status: "PENDING" | "APPROVED") => ({ enrolmentId: "e1", classId: "c1", className: "6A Biology", subjectName: "Biology", schoolName: "School A", status });

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("JoinButton", () => {
  it("asks to join and shows the resulting status", async () => {
    vi.mocked(api.send).mockResolvedValue(view("PENDING"));
    render(<JoinButton code="ABCDEFGH" />);

    await userEvent.click(screen.getByRole("button", { name: "Join this class" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/join/ABCDEFGH/enrolments", undefined, expect.anything());
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for your teacher to approve");
    expect(screen.getByRole("link", { name: "Go to your classes" })).toHaveAttribute("href", "/home");
  });

  it("says so when already approved", async () => {
    vi.mocked(api.send).mockResolvedValue(view("APPROVED"));
    render(<JoinButton code="ABCDEFGH" />);

    await userEvent.click(screen.getByRole("button", { name: "Join this class" }));

    expect(screen.getByRole("status")).toHaveTextContent("already in this class");
  });

  it("reports a code that expired between steps", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "JOIN_CODE_INVALID", status: 404, detail: "That join code isn't right, or it has expired." }));
    render(<JoinButton code="ABCDEFGH" />);

    await userEvent.click(screen.getByRole("button", { name: "Join this class" }));

    expect(screen.getByRole("alert")).toHaveTextContent("expired");
    expect(screen.getByRole("link", { name: "Enter a different join code" })).toHaveAttribute("href", "/join");
    expect(screen.queryByRole("button", { name: "Join this class" })).not.toBeInTheDocument();
  });
});
