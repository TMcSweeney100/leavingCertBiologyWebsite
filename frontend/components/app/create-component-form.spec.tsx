import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api, ApiError } from "@/lib/api/client";

import { CreateComponentForm } from "./create-component-form";

const brief = {
  id: "b1", subjectCode: "BIOLOGY", examYear: 2027, secCode: "2027L025C2EL",
  title: "Biology in Practice Investigation", topicTitle: "Membranes, Osmosis, Food Preservation", completionDate: "2027-02-26",
};

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("CreateComponentForm", () => {
  it("shows the brief's code, topic and completion date before creating", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<CreateComponentForm classId="c1" briefs={[brief]} />);

    expect(screen.getByRole("radio", { name: /Biology in Practice Investigation, 2027/ })).toBeChecked();
    expect(screen.getByText(/2027L025C2EL/)).toBeInTheDocument();
    expect(screen.getByText(/26 Feb 2027/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create component" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/components", { briefId: "b1" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("says so when there's no brief for the subject yet", () => {
    render(<CreateComponentForm classId="c1" briefs={[]} />);
    expect(screen.getByText(/no brief for this subject yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create component" })).not.toBeInTheDocument();
  });

  it("shows a refusal in the error panel", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ status: 409, code: "COMPONENT_ALREADY_EXISTS", title: "t", detail: "This class already has a component.", fieldErrors: [] }));
    render(<CreateComponentForm classId="c1" briefs={[brief]} />);
    await userEvent.click(screen.getByRole("button", { name: "Create component" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This class already has a component.");
  });
});
