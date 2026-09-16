import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn(), send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { ChangePasswordForm } from "./change-password-form";

async function fill(current: string, next: string, confirm = next) {
  await userEvent.type(screen.getByLabelText("Current password"), current);
  await userEvent.type(screen.getByLabelText("New password"), next);
  await userEvent.type(screen.getByLabelText("Confirm new password"), confirm);
  await userEvent.click(screen.getByRole("button", { name: "Change password" }));
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("ChangePasswordForm", () => {
  it("changes the password and goes to the landing page", async () => {
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<ChangePasswordForm forced={false} landing="/teach" />);

    await fill("Temporary-Pass-1", "my-own-password-1");

    expect(api.sendNoContent).toHaveBeenCalledWith("POST", "/auth/password", { currentPassword: "Temporary-Pass-1", newPassword: "my-own-password-1" });
    expect(push).toHaveBeenCalledWith("/teach");
  });

  it("refuses a confirmation that doesn't match before calling the API", async () => {
    render(<ChangePasswordForm forced={false} landing="/home" />);

    await fill("Temporary-Pass-1", "my-own-password-1", "my-own-password-2");

    expect(screen.getByRole("alert")).toHaveTextContent("don't match");
    expect(api.sendNoContent).not.toHaveBeenCalled();
  });

  it("explains forced mode and offers only sign out", () => {
    render(<ChangePasswordForm forced landing="/home" />);

    expect(screen.getByText(/temporary password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("offers cancel when not forced", () => {
    render(<ChangePasswordForm forced={false} landing="/home" />);
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/home");
  });

  it("shows the API's reasons: too short, or current wrong", async () => {
    vi.mocked(api.sendNoContent).mockRejectedValueOnce(new ApiError({ code: "PASSWORD_TOO_SHORT", status: 400, detail: "Passwords need at least 10 characters." }));
    render(<ChangePasswordForm forced={false} landing="/home" />);
    await fill("Temporary-Pass-1", "short");
    expect(screen.getByRole("alert")).toHaveTextContent("at least 10 characters");

    vi.mocked(api.sendNoContent).mockRejectedValueOnce(new ApiError({ code: "INVALID_CREDENTIALS", status: 401, detail: "Your current password isn't right." }));
    // The form cleared the current password after the error; the other two fields are cleared here.
    await userEvent.clear(screen.getByLabelText("New password"));
    await userEvent.clear(screen.getByLabelText("Confirm new password"));
    await fill("Temporary-Pass-1", "my-own-password-1");
    expect(screen.getByRole("alert")).toHaveTextContent("current password isn't right");
  });
});
