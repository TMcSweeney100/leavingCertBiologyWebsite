import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeacherComponent } from "@/lib/api/schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api, ApiError } from "@/lib/api/client";

import { StageDatesForm } from "./stage-dates-form";

const stage = (n: number, dueDate: string | null, extra = {}) => ({
  id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Name ${n}`, hoursMin: 1, hoursMax: 2, hoursGroup: null,
  supervised: n === 4, checkpoint: n === 3 ? "Plan discussed with the teacher (feasibility and safety)" : null,
  dueDate, items: [], ...extra,
});

const component = (overrides: Partial<TeacherComponent> = {}): TeacherComponent => ({
  view: "TEACHER", id: "k1", classId: "c1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology",
  brief: { id: "b1", subjectCode: "BIOLOGY", examYear: 2027, secCode: "2027L025C2EL", title: "Biology in Practice Investigation", topicTitle: null, completionDate: "2027-02-26" },
  stages: [stage(3, "2026-09-25"), stage(4, null), stage(5, null), stage(6, null)],
  warnings: [],
  ...overrides,
});

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("StageDatesForm", () => {
  it("says these are the class's dates and the SEC's only date is the completion date", () => {
    render(<StageDatesForm component={component()} />);
    expect(screen.getByText(/your class's own dates, not SEC deadlines/i)).toBeInTheDocument();
    expect(screen.getByText(/completion date/i)).toHaveTextContent("26 Feb 2027");
  });

  it("labels each date by stage and shows hours and supervision", () => {
    render(<StageDatesForm component={component()} />);
    expect(screen.getByLabelText("Stage 3 Name 3")).toHaveValue("2026-09-25");
    expect(screen.getByLabelText("Stage 4 Name 4")).toHaveValue("");
    expect(screen.getByText(/supervised/i)).toBeInTheDocument();
    expect(screen.getAllByText("1–2 hours").length).toBeGreaterThan(0);
  });

  it("saves every stage's date in one request, with empty as no date", async () => {
    vi.mocked(api.send).mockResolvedValue(component());
    render(<StageDatesForm component={component()} />);
    await userEvent.type(screen.getByLabelText("Stage 4 Name 4"), "2026-10-16");
    await userEvent.click(screen.getByRole("button", { name: "Save dates" }));

    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/stage-dates", {
      dates: [
        { stageId: "s3", dueDate: "2026-09-25" },
        { stageId: "s4", dueDate: "2026-10-16" },
        { stageId: "s5", dueDate: null },
        { stageId: "s6", dueDate: null },
      ],
    }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("marks a refused date on its own row and in the error panel", async () => {
    const message = "Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it.";
    vi.mocked(api.send).mockRejectedValue(new ApiError({ status: 400, code: "COMPLETION_DATE_EXCEEDED", title: "t", detail: message, fieldErrors: [{ field: "s6", message }] }));
    render(<StageDatesForm component={component()} />);
    await userEvent.type(screen.getByLabelText("Stage 6 Name 6"), "2027-03-05");
    await userEvent.click(screen.getByRole("button", { name: "Save dates" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Stage 6 Name 6")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Stage 3 Name 3")).not.toHaveAttribute("aria-invalid");
  });

  it("warns on out-of-order stages without blocking", () => {
    render(<StageDatesForm component={component({ warnings: [{ code: "OUT_OF_ORDER", stageIds: ["s4", "s5"], itemIds: [] }] })} />);
    const warning = screen.getByRole("status");
    expect(warning).toHaveTextContent("Stage 5 is due before Stage 4");
    expect(screen.getByRole("button", { name: "Save dates" })).toBeEnabled();
  });

  it("explains a completion date that moved", () => {
    render(<StageDatesForm component={component({ warnings: [{ code: "AFTER_COMPLETION_DATE", stageIds: ["s6"], itemIds: [] }], stages: [stage(6, "2027-02-20")] })} />);
    expect(screen.getByRole("status")).toHaveTextContent(/now after the completion date, 26 Feb 2027/);
  });

  it("invites the teacher to start when no dates are set", () => {
    render(<StageDatesForm component={component({ stages: [stage(1, null), stage(2, null)] })} />);
    expect(screen.getByText(/students see "dates coming from your teacher"/i)).toBeInTheDocument();
  });
});
