import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { dateMarks } from "@/lib/app/date-marks";

import { YearLine } from "./year-line";

const stage = (n: number, dueDate: string | null, items: { id: string; text: string; dueDate: string | null }[] = []) =>
  ({ id: `s${n}`, ordinal: n, label: `Stage ${n}`, name: `Name ${n}`, dueDate, items });
// Stage 5 typed as 20 Nov but not saved.
const marks = dateMarks(
  [stage(3, "2026-09-25"), stage(4, "2026-10-16", [{ id: "i1", text: "Notebooks in", dueDate: "2026-10-23" }]), stage(5, null)],
  { s5: "2026-11-20" },
  "2027-02-26",
);
const line = (props: Partial<Parameters<typeof YearLine>[0]> = {}) =>
  render(<YearLine marks={marks} today="2026-10-14" completionDate="2027-02-26" month="2026-10-01" {...props} />);

describe("YearLine", () => {
  it("draws stages as numbered tags, dashed when not saved, items by letter, and the weeks between on the page", () => {
    line({ gaps: true });
    const img = screen.getByRole("img", { name: /Your dates across the year/ });
    expect(within(img).getByText("S4")).toHaveAttribute("data-saved", "true");
    expect(within(img).getByText("S5")).toHaveAttribute("data-saved", "false");
    expect(within(img).getByText("A")).toBeInTheDocument();
    expect(within(img).getByText("14 weeks")).toBeInTheDocument();
  });

  it("in the drawer: pins the pick in place of the stage it moves, and offers months as pointer shortcuts", async () => {
    const onMonth = vi.fn();
    line({ pick: { iso: "2026-10-30", label: "S4 30 Oct", runFrom: "2026-09-25", ordinal: 4 }, onMonth });
    const group = screen.getByRole("group", { name: /Your dates across the year/ });
    expect(within(group).getByText("S4 30 Oct")).toBeInTheDocument();
    expect(within(group).queryByText("S4")).not.toBeInTheDocument();
    const december = within(group).getByRole("button", { name: "Show December 2026" });
    expect(december).toHaveAttribute("tabindex", "-1");
    await userEvent.click(december);
    expect(onMonth).toHaveBeenCalledWith("2026-12-01");
  });
});
