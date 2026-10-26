import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { DateMark } from "@/lib/app/date-marks";

import { DateCalendar } from "./date-calendar";

const marks: DateMark[] = [
  { iso: "2026-10-16", kind: "stage", short: "S4", name: "Stage 4", saved: true, ordinal: 4 },
  { iso: "2026-10-23", kind: "stage", short: "S5", name: "Stage 5 (not saved)", saved: false, ordinal: 5 },
  { iso: "2026-10-23", kind: "item", short: "B", name: "item B", saved: true },
  { iso: "2026-11-27", kind: "completion", short: "End", name: "the completion date", saved: true },
];

const draw = (props: Partial<ComponentProps<typeof DateCalendar>> = {}) => {
  const on = { onMonth: vi.fn(), onSelect: vi.fn(), onAfterCompletion: vi.fn() };
  render(
    <DateCalendar
      marks={marks} completionDate="2026-11-27" today="2026-10-14" selected="2026-10-16"
      month="2026-10-01" range={{ start: "2026-10-01", count: 2 }} runFrom={null} {...on} {...props}
    />,
  );
  return on;
};

describe("DateCalendar", () => {
  it("names every day by its date and what's on it, with a tag per mark, dashed when not saved", () => {
    draw();
    const day = screen.getByRole("button", { name: "Friday 23 October 2026: Stage 5 (not saved), item B" });
    expect(day.querySelector('[data-saved="false"]')).toHaveTextContent("S5");
    expect(screen.getByRole("button", { name: "Wednesday 14 October 2026: today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Friday 16 October 2026: Stage 4" })).toHaveAttribute("data-selected-single", "true");
  });

  it("shows one month, with arrows named for the month they go to", async () => {
    const { onMonth } = draw();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "November 2026" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No earlier month" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("button", { name: "November 2026" }));
    expect(onMonth).toHaveBeenCalledWith("2026-11-01");
  });

  it("hands back a tapped day, but only reports a day after the completion date, which stays focusable", async () => {
    const first = draw({ selected: "" });
    await userEvent.click(screen.getByRole("button", { name: "Friday 30 October 2026" }));
    expect(first.onSelect).toHaveBeenCalledWith("2026-10-30");

    const { onSelect, onAfterCompletion } = draw({ month: "2026-11-01" });
    const late = screen.getByRole("button", { name: "Saturday 28 November 2026, after the completion date" });
    expect(late).toBeEnabled();
    expect(late).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(late);
    expect(onAfterCompletion).toHaveBeenCalledWith("2026-11-28");
    expect(onSelect).not.toHaveBeenCalled();
  });
});
