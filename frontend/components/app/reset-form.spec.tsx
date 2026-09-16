import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { ResetForm } from "./reset-form";

async function fill(code = "abcd-efgh") {
  await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "aoife.b");
  await userEvent.type(screen.getByRole("textbox", { name: "Reset code" }), code);
  await userEvent.type(screen.getByLabelText("New password"), "a-fresh-start-2026");
  await userEvent.click(screen.getByRole("button", { name: "Set new password" }));
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("ResetForm", () => {
  it("sends the code as typed, then goes to sign in", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<ResetForm />);

    await fill();

    expect(api.sendNoContent).toHaveBeenCalledWith("POST", "/auth/password-reset", { username: "aoife.b", code: "abcd-efgh", newPassword: "a-fresh-start-2026" });
    expect(screen.getByRole("status")).toHaveTextContent("Password set");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows one message for a wrong or expired code", async () => {
    vi.mocked(api.sendNoContent).mockRejectedValue(new ApiError({ code: "RESET_CODE_INVALID", status: 400, detail: "That code isn't right, or it has expired. Ask your teacher for a new one." }));
    render(<ResetForm />);

    await fill();

    expect(screen.getByRole("alert")).toHaveTextContent("isn't right, or it has expired");
  });

  it("shows the throttle message", async () => {
    vi.mocked(api.sendNoContent).mockRejectedValue(new ApiError({ code: "TOO_MANY_ATTEMPTS", status: 429, detail: "Too many attempts. Try again in 15 minutes." }));
    render(<ResetForm />);

    await fill();

    expect(screen.getByRole("alert")).toHaveTextContent("15 minutes");
  });
});
