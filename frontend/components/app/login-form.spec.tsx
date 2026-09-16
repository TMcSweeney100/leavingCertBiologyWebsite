import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";
import type { Me } from "@/lib/api/schemas";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { LoginForm } from "./login-form";

const teacher: Me = {
  userId: "u1", username: "k.hanlon", firstName: "K", lastName: "H", mustChangePassword: false,
  roles: [{ schoolId: "s1", schoolName: "School A", role: "TEACHER" }],
};

async function fillAndSubmit(username = "k.hanlon", password = "correct-horse-battery") {
  await userEvent.type(screen.getByRole("textbox", { name: "Username" }), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("LoginForm", () => {
  it("signs in and goes to the role's landing page", async () => {
    vi.mocked(api.send).mockResolvedValue(teacher);
    render(<LoginForm />);

    await fillAndSubmit();

    expect(api.send).toHaveBeenCalledWith("POST", "/auth/login", { username: "k.hanlon", password: "correct-horse-battery" }, expect.anything());
    expect(push).toHaveBeenCalledWith("/teach");
  });

  it("honours a safe next and ignores an unsafe one", async () => {
    vi.mocked(api.send).mockResolvedValue(teacher);
    const { unmount } = render(<LoginForm next="/join/ABCDEFGH" />);
    await fillAndSubmit();
    expect(push).toHaveBeenCalledWith("/join/ABCDEFGH");
    unmount();

    push.mockReset();
    render(<LoginForm next="//evil.example" />);
    await fillAndSubmit();
    expect(push).toHaveBeenCalledWith("/teach");
  });

  it("sends a temporary password holder to change it", async () => {
    vi.mocked(api.send).mockResolvedValue({ ...teacher, mustChangePassword: true });
    render(<LoginForm next="/teach" />);

    await fillAndSubmit();

    expect(push).toHaveBeenCalledWith("/account/password");
  });

  it("shows one message for wrong credentials and keeps the username", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "INVALID_CREDENTIALS", status: 401, detail: "Wrong username or password." }));
    render(<LoginForm />);

    await fillAndSubmit("k.hanlon", "nope-nope-nope");

    expect(screen.getByRole("alert")).toHaveTextContent("Wrong username or password.");
    expect(screen.getByRole("textbox", { name: "Username" })).toHaveValue("k.hanlon");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the retry time when throttled", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "TOO_MANY_ATTEMPTS", status: 429, detail: "Too many attempts. Try again in 12 minutes." }));
    render(<LoginForm />);

    await fillAndSubmit();

    expect(screen.getByRole("alert")).toHaveTextContent("Try again in 12 minutes.");
  });

  it("reports an unreachable service", async () => {
    vi.mocked(api.send).mockRejectedValue(ApiError.unreachable(new Error("x")));
    render(<LoginForm />);

    await fillAndSubmit();

    expect(screen.getByRole("alert")).toHaveTextContent("Can't reach the service");
  });
});
