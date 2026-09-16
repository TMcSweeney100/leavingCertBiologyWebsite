import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { JoinCodeForm } from "./join-code-form";

describe("JoinCodeForm", () => {
  it("goes to the code's page, normalised", async () => {
    render(<JoinCodeForm />);

    await userEvent.type(screen.getByRole("textbox", { name: "Join code" }), " abcd-efgh ");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(push).toHaveBeenCalledWith("/join/ABCDEFGH");
  });

  it("shows the invalid-code message passed in", () => {
    render(<JoinCodeForm invalid />);
    expect(screen.getByRole("alert")).toHaveTextContent("isn't right, or it has expired");
  });
});
