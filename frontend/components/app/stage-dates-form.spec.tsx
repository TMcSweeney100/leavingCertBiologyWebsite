import { render, screen, waitFor, within } from "@testing-library/react";
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

const TODAY = "2026-09-14";

const stage = (n: number, dueDate: string | null, extra = {}) => ({
  id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Name ${n}`, hoursMin: 1, hoursMax: 2, hoursGroup: null,
  supervised: n === 4, checkpoint: n === 3 ? "Plan discussed with the teacher (feasibility and safety)" : null,
  dueDate, items: [] as { id: string; text: string; dueDate: string | null }[], ...extra,
});

const component = (overrides: Partial<TeacherComponent> = {}): TeacherComponent => ({
  view: "TEACHER", id: "k1", classId: "c1", className: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology",
  brief: { id: "b1", subjectCode: "BIOLOGY", examYear: 2027, secCode: "2027L025C2EL", title: "Biology in Practice Investigation", topicTitle: null, completionDate: "2027-02-26" },
  stages: [stage(3, "2026-09-25"), stage(4, null), stage(5, null), stage(6, null)],
  warnings: [],
  requireLink: false,
  ...overrides,
});

const allSix = () => component({
  stages: [
    stage(1, "2026-05-29"), stage(2, "2026-06-05"), stage(3, "2026-09-25"),
    stage(4, "2026-10-16"), stage(5, "2026-11-20"), stage(6, "2027-01-22"),
  ],
});

const render5 = (c: TeacherComponent = component()) => render(<StageDatesForm component={c} today={TODAY} />);

// A date is set in the drawer (plan date-picker-drawer C-35, C-41): open the box, type it day first, press Enter.
async function setDate(label: string, iso: string) {
  await userEvent.click(screen.getByLabelText(label));
  const dialog = await screen.findByRole("dialog");
  const [year, month, day] = iso.split("-");
  const field = within(dialog).getByRole("textbox", { name: "Type a date" });
  await userEvent.clear(field);
  await userEvent.type(field, `${day}${month}${year}`);
  await userEvent.keyboard("{Enter}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("StageDatesForm", () => {
  it("says these are the class's dates and the SEC's only date is the completion date", () => {
    render5();
    expect(screen.getByText(/your class's own dates, not SEC deadlines/i)).toHaveTextContent("26 Feb 2027");
  });

  // D-5 makes the visible stage name the row's content, not the field's label: every input gets its
  // own visually-hidden label naming the stage, so a screen reader hears "Stage 3 date".
  it("labels each date box by its stage, and shows hours, supervision and the checkpoint", () => {
    render5();
    expect(screen.getByLabelText("Stage 3 date")).toHaveTextContent("25/09/2026");
    expect(screen.getByLabelText("Stage 4 date")).toHaveTextContent("Choose a date");
    expect(screen.getByText(/supervised/i)).toBeInTheDocument();
    expect(screen.getAllByText("1–2 hours").length).toBeGreaterThan(0);
    expect(screen.getByText(/Checkpoint: Plan discussed with the teacher/)).toBeInTheDocument();
  });

  it("resolves the weekday under a set date, and says so when there is none", () => {
    render5();
    expect(screen.getByText("Fri 25 Sept 2026")).toBeInTheDocument();
    expect(screen.getAllByText("No date yet").length).toBe(3);
  });

  it("saves every stage's date in one request, with empty as no date", async () => {
    vi.mocked(api.send).mockResolvedValue(component());
    render5();
    await setDate("Stage 4 date", "2026-10-16");
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

  it("always says where the dates stand, beside the button", async () => {
    render5(allSix());
    expect(screen.getByText("All 6 dates saved")).toBeInTheDocument();
    await setDate("Stage 4 date", "2026-10-23");
    expect(screen.getByText("1 date changed, not saved yet")).toBeInTheDocument();
  });

  it("invites the teacher to start when no dates are set", () => {
    render5(component({ stages: [stage(1, null), stage(2, null)] }));
    expect(screen.getByText(/Dates coming from your teacher/)).toBeInTheDocument();
    expect(screen.getByText("No dates saved yet")).toBeInTheDocument();
  });

  it("refuses a whole save in the panel, on the row, and beside the button", async () => {
    const message = "Stage 6 is after the completion date, Fri 26 Feb 2027. Choose a date on or before it.";
    vi.mocked(api.send).mockRejectedValue(new ApiError({ status: 400, code: "COMPLETION_DATE_EXCEEDED", title: "t", detail: message, fieldErrors: [{ field: "s6", message }] }));
    render5(allSix());
    // A date after the completion date can't be set from the page; the server's refusal is mocked.
    await setDate("Stage 6 date", "2027-02-05");
    await userEvent.click(screen.getByRole("button", { name: "Save dates" }));

    const panel = await screen.findByRole("alert");
    expect(panel).toHaveTextContent("Your dates weren't saved");
    expect(panel).toHaveTextContent("One date needs another look. Nothing was changed.");
    expect(within(panel).getByRole("listitem")).toHaveTextContent("Stage 6");
    expect(panel).toHaveFocus();

    expect(screen.getByLabelText("Stage 6 date")).toHaveAccessibleDescription(expect.stringContaining(message));
    expect(screen.getByText("Nothing was saved — your other five dates are unchanged.")).toBeInTheDocument();
  });

  // Rule 2: red refuses, amber asks. Out of order saved, so it is a status, not an alert.
  it("puts one amber message between the pair of stages that are out of order", () => {
    const c = allSix();
    c.stages[4].dueDate = "2026-10-09";
    c.warnings = [{ code: "OUT_OF_ORDER", stageIds: ["s4", "s5"], itemIds: [] }];
    render5(c);
    const statuses = screen.getAllByRole("status");
    const warning = statuses.find((s) => s.textContent?.includes("is before"));
    expect(warning).toHaveTextContent(
      "Stage 5 (Fri 9 Oct) is before stage 4 (Fri 16 Oct). That's allowed — students move between stages — but check it's what you meant.",
    );
    expect(screen.getByRole("button", { name: "Save dates" })).toBeEnabled();
    expect(screen.getByText("Saved. Two dates are out of order.")).toBeInTheDocument();
  });

  it("explains a completion date that moved, and marks the row amber not red", () => {
    const c = allSix();
    c.warnings = [{ code: "AFTER_COMPLETION_DATE", stageIds: ["s6"], itemIds: [] }];
    c.brief.completionDate = "2027-01-15";
    render5(c);
    const banner = screen.getAllByRole("status").find((s) => s.textContent?.includes("completion date moved"));
    expect(banner).toHaveTextContent("The completion date moved");
    expect(banner).toHaveTextContent("Fri 15 Jan 2027");
    expect(screen.getByText("Stage 6 is after the new completion date, Fri 15 Jan 2027. Choose a date on or before it.")).toBeInTheDocument();
    expect(screen.getByLabelText("Stage 6 date")).toHaveAccessibleDescription(expect.stringContaining("Stage 6 is after the new completion date"));
    expect(screen.getByText("Saved. One date needs fixing.")).toBeInTheDocument();
  });

  it("offers the year view, and a summary of the year for when it is closed", () => {
    render5(allSix());
    expect(screen.getByRole("button", { name: "Hide the year view" })).toBeInTheDocument();
    expect(screen.getByText("Your dates run 29 May 2026 to 22 Jan 2027, inside the completion date of 26 Feb 2027.")).toBeInTheDocument();
  });

  it("says it's saving the dates while the request is in flight", async () => {
    vi.mocked(api.send).mockReturnValue(new Promise(() => {}));
    render5();
    await setDate("Stage 4 date", "2026-10-16");
    await userEvent.click(screen.getByRole("button", { name: "Save dates" }));

    expect(screen.getByRole("button", { name: "Saving dates…" })).toBeDisabled();
  });
  it("opens the calendar from a click on a date box, shows another stage's unsaved date, and a pick fills the box without saving", async () => {
    render5();
    await setDate("Stage 4 date", "2026-10-16");
    await userEvent.click(screen.getByLabelText("Stage 5 date"));
    const dialog = await screen.findByRole("dialog", { name: "Choose the Stage 5 date" });
    // No date yet, so it opens on today's month, September; the arrow goes on to October.
    expect(within(dialog).getByRole("button", { name: "Friday 25 September 2026: Stage 3" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "October 2026" }));
    expect(within(dialog).getByRole("button", { name: "Friday 16 October 2026: Stage 4 (not saved)" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Friday 23 October 2026" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Use this date" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Stage 5 date")).toHaveTextContent("23/10/2026");
    expect(api.send).not.toHaveBeenCalled();
  });

  it("says on the row that a chosen date isn't saved yet, and reads every date after the box's name", async () => {
    render5();
    await setDate("Stage 4 date", "2026-10-16");
    expect(screen.getByLabelText("Stage 4 date")).toHaveAccessibleDescription("Fri 16 Oct 2026 · not saved");
    expect(screen.getByLabelText("Stage 3 date")).toHaveAccessibleDescription("Fri 25 Sept 2026");
  });

  it("puts a date that isn't saved yet on the year view, dashed", async () => {
    render5();
    await setDate("Stage 4 date", "2026-10-16");
    const line = screen.getByRole("img", { name: /Your dates across the year/ });
    expect(within(line).getByText("S4")).toHaveAttribute("data-saved", "false");
  });
});
