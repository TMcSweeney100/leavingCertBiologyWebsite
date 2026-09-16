import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Me } from "@/lib/api/schemas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/teach/classes/c1",
}));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { sendNoContent: vi.fn() } };
});

import { AppHeader } from "./app-header";

const school = { schoolId: "s1", schoolName: "School A", schoolShortName: null };
const base: Me = { userId: "u1", username: "k.hanlon", firstName: "Katelyn", lastName: "Hanlon", mustChangePassword: false, roles: [] };

describe("AppHeader", () => {
  // Design pack D-1: with one role there is no switcher and no role link; the app name goes home.
  it("shows no role switcher for a single role, and the app name links to the landing page", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "TEACHER" }] }} />);
    expect(screen.queryByRole("navigation", { name: "Switch role" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leaving Cert Practical" })).toHaveAttribute("href", "/teach");
  });

  it("shows a role switcher for a year head who teaches", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "TEACHER" }, { ...school, role: "SCHOOL_LEADER" }] }} />);
    const nav = screen.getByRole("navigation", { name: "Switch role" });
    expect(within(nav).getByRole("link", { name: "Classes" })).toHaveAttribute("href", "/teach");
    expect(within(nav).getByRole("link", { name: "School overview" })).toHaveAttribute("href", "/school");
  });

  it("marks the role whose pages you're on", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "TEACHER" }, { ...school, role: "SCHOOL_LEADER" }] }} />);
    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "School overview" })).not.toHaveAttribute("aria-current");
  });

  it("names the school by its short name when it has one", () => {
    render(
      <AppHeader
        me={{
          ...base,
          roles: [{ schoolId: "s1", schoolName: "North Wicklow Educate Together Secondary School", schoolShortName: "North Wicklow ETSS", role: "TEACHER" }],
        }}
      />,
    );
    expect(screen.getByText("North Wicklow ETSS")).toBeInTheDocument();
  });

  it("has the account menu with change password and sign out", () => {
    render(<AppHeader me={{ ...base, roles: [{ ...school, role: "STUDENT" }] }} />);
    expect(screen.getByRole("link", { name: "Change password" })).toHaveAttribute("href", "/account/password");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("Katelyn Hanlon")).toBeInTheDocument();
  });
});
