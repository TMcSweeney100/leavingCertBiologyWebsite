import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Me } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn() } };
});

import { AppHeader } from "./app-header";

const school = { schoolId: "s1", schoolName: "School A", schoolShortName: null };
const base: Me = { userId: "u1", username: "k.hanlon", firstName: "Katelyn", lastName: "Hanlon", mustChangePassword: false, roles: [] };

describe("AppHeader", () => {
  it("shows no role switcher for a single role", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "TEACHER" }] }} />);
    expect(screen.queryByRole("navigation", { name: "Switch role" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute("href", "/teach");
  });

  it("shows a role switcher for a year head who teaches", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "TEACHER" }, { ...school, role: "SCHOOL_LEADER" }] }} />);
    const nav = screen.getByRole("navigation", { name: "Switch role" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "School overview" })).toHaveAttribute("href", "/school");
  });

  it("has the account menu with change password and sign out", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "STUDENT" }] }} />);
    expect(screen.getByRole("link", { name: "Change password" })).toHaveAttribute("href", "/account/password");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("Katelyn Hanlon")).toBeInTheDocument();
  });
});
