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

import { SignUpForm } from "./sign-up-form";

const enrolment = { enrolmentId: "e1", classId: "c1", className: "6A Biology", subjectName: "Biology", schoolName: "School A", status: "PENDING" as const };

async function fill() {
  await userEvent.type(screen.getByRole("textbox", { name: "First name" }), "Aoife");
  await userEvent.type(screen.getByRole("textbox", { name: "Surname" }), "Byrne");
  await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "aoife.b");
  await userEvent.type(screen.getByLabelText("Password"), "aoife-loves-cells");
  await userEvent.click(screen.getByRole("button", { name: "Create account and join" }));
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("SignUpForm", () => {
  it("creates the account, joins, and goes home", async () => {
    vi.mocked(api.send).mockResolvedValue(enrolment);
    render(<SignUpForm code="ABCDEFGH" />);

    await fill();

    expect(api.send).toHaveBeenCalledWith("POST", "/join/ABCDEFGH/accounts",
      { firstName: "Aoife", lastName: "Byrne", username: "aoife.b", password: "aoife-loves-cells" }, expect.anything());
    expect(push).toHaveBeenCalledWith("/home");
  });

  it("links to sign in instead, keeping the code as next", () => {
    render(<SignUpForm code="ABCDEFGH" />);
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/login?next=%2Fjoin%2FABCDEFGH");
  });

  it("shows a taken username, a short password, and an expired code", async () => {
    render(<SignUpForm code="ABCDEFGH" />);
    for (const [code, detail] of [
      ["USERNAME_TAKEN", "That username is taken."],
      ["PASSWORD_TOO_SHORT", "Passwords need at least 10 characters."],
      ["JOIN_CODE_INVALID", "That join code isn't right, or it has expired."],
    ] as const) {
      vi.mocked(api.send).mockRejectedValueOnce(new ApiError({ code, status: 400, detail }));
      await fill();
      expect(screen.getByRole("alert")).toHaveTextContent(detail);
      await userEvent.clear(screen.getByRole("textbox", { name: "First name" }));
      await userEvent.clear(screen.getByRole("textbox", { name: "Surname" }));
      await userEvent.clear(screen.getByRole("textbox", { name: "Username" }));
    }
    expect(push).not.toHaveBeenCalled();
  });
});
