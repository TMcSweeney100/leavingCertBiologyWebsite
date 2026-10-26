import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DateMark } from "@/lib/app/date-marks";

import { DateCalendar } from "./date-calendar";

const marks: DateMark[] = [
  { iso: "2026-10-16", kind: "stage", short: "S4", name: "Stage 4", saved: true },
  { iso: "2026-10-23", kind: "stage", short: "S5", name: "Stage 5 (not saved)", saved: false },
  { iso: "2026-10-23", kind: "item", short: "B", name: "item B", saved: true },
  { iso: "2026-11-27", kind: "completion", short: "End", name: "the completion date", saved: true },
];

const draw = (value = "2026-10-16", onPick = vi.fn()) =>
  render(<DateCalendar value={value} marks={marks} completionDate="2026-11-27" today="2026-10-14" onPick={onPick} />);

describe("DateCalendar", () => {
  it("names every day by its date and what's on it", () => {
    draw();
    expect(screen.getByRole("button", { name: "Friday 23 October 2026: Stage 5 (not saved), item B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wednesday 14 October 2026: today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Friday 27 November 2026: the completion date" })).toBeInTheDocument();
  });

  it("draws a short tag per mark, dashed when not saved", () => {
    draw();
    const day = screen.getByRole("button", { name: /^Friday 23 October 2026/ });
    expect(day).toHaveTextContent("23S5B");
    expect(day.querySelector('[data-saved="false"]')).toHaveTextContent("S5");
  });

  it("shows the months from today's to the completion date's, and no others", () => {
    draw();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "December 2026" })).not.toBeInTheDocument();
  });

  it("greys out every day after the completion date", () => {
    draw();
    expect(screen.getByRole("button", { name: "Saturday 28 November 2026, after the completion date" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Friday 27 November 2026: the completion date" })).toBeEnabled();
  });

  it("marks the chosen day as selected", () => {
    draw();
    expect(screen.getByRole("button", { name: "Friday 16 October 2026: Stage 4" })).toHaveAttribute("data-selected-single", "true");
  });

  it("hands back the picked day as a calendar date", async () => {
    const onPick = vi.fn();
    draw("", onPick);
    await userEvent.click(screen.getByRole("button", { name: "Friday 30 October 2026" }));
    expect(onPick).toHaveBeenCalledWith("2026-10-30");
  });
});
