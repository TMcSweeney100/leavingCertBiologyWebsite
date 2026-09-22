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
  title: "Biology in Practice Investigation", topicTitle: "Membranes, Osmosis & Food Preservation", completionDate: "2027-02-26",
};
const later = { ...brief, id: "b2", examYear: 2028, secCode: "2028L025C2EL", topicTitle: null, completionDate: "2028-02-25" };

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("CreateComponentForm", () => {
  // D-5 state 1 renames the brief radios to one select, because the subject is fixed by the class
  // and the only choice is the year's brief.
  it("shows what's being set up, from the chosen brief, before the action", async () => {
    vi.mocked(api.send).mockResolvedValue({});
    render(<CreateComponentForm classId="c1" briefs={[brief]} />);

    expect(screen.getByRole("combobox", { name: "Brief" })).toHaveValue("b1");
    const summary = screen.getByRole("group", { name: "What you're setting up" });
    expect(summary).toHaveTextContent("Biology in Practice Investigation, 2027");
    expect(summary).toHaveTextContent("Membranes, Osmosis & Food Preservation");
    expect(summary).toHaveTextContent("2027L025C2EL");
    expect(summary).toHaveTextContent("Fri 26 Feb 2027");
    expect(summary).toHaveTextContent("6, set by the SEC — you choose a date for each");

    await userEvent.click(screen.getByRole("button", { name: "Create component" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/components", { briefId: "b1" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("drives the summary from the brief that is selected, not from the first one", async () => {
    render(<CreateComponentForm classId="c1" briefs={[brief, later]} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Brief" }), "b2");
    const summary = screen.getByRole("group", { name: "What you're setting up" });
    expect(summary).toHaveTextContent("2028L025C2EL");
    expect(summary).toHaveTextContent("Fri 25 Feb 2028");
    // A brief with no topic drops the row rather than printing an empty value.
    expect(summary).not.toHaveTextContent("Topic");
  });

  it("says when the next year's briefs will appear", () => {
    render(<CreateComponentForm classId="c1" briefs={[brief]} />);
    expect(screen.getByText("The 2028 briefs appear here when the SEC publishes them.")).toBeInTheDocument();
  });

  it("says students see the component as soon as it exists", () => {
    render(<CreateComponentForm classId="c1" briefs={[brief]} />);
    expect(screen.getByText(/Students see the component as soon as it exists/)).toBeInTheDocument();
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
