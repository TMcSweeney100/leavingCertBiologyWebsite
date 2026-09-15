import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import AuthLayout from "./layout";

describe("auth pages behind the app flag", () => {
  it("are a 404 while the app is switched off", () => {
    vi.stubEnv("APP_ENABLED", "");
    expect(() => AuthLayout({ children: <p>Sign in form</p> })).toThrow("NEXT_NOT_FOUND");
  });

  it("render their page once it's on", () => {
    vi.stubEnv("APP_ENABLED", "true");
    render(AuthLayout({ children: <p>Sign in form</p> }));
    expect(screen.getByText("Sign in form")).toBeInTheDocument();
  });
});
