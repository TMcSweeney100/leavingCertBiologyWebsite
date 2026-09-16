import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn(async () => undefined) } };
});

import { api } from "@/lib/api/client";

import { SignOutButton } from "./sign-out-button";

describe("SignOutButton", () => {
  it("posts to logout and goes to the login page", async () => {
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(api.sendNoContent).toHaveBeenCalledWith("POST", "/auth/logout");
    expect(push).toHaveBeenCalledWith("/login");
  });
});
