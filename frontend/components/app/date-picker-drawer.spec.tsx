import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DateMark } from "@/lib/app/date-marks";

import { DatePickerDrawer } from "./date-picker-drawer";

const marks: DateMark[] = [
  { iso: "2026-10-16", kind: "stage", short: "S4", name: "Stage 4", saved: true },
  { iso: "2026-11-27", kind: "completion", short: "End", name: "the completion date", saved: true },
];

const draw = (value: string, onPick = vi.fn()) =>
  render(
    <DatePickerDrawer
      title="Choose the Stage 4 date"
      value={value}
      marks={marks}
      completionDate="2026-11-27"
      today="2026-10-14"
      onPick={onPick}
    >
      {(opener) => (
        <>
          <label htmlFor="d">Stage 4 date</label>
          <input id="d" type="date" value={value} onChange={() => {}} {...opener} />
        </>
      )}
    </DatePickerDrawer>,
  );

const box = () => screen.getByLabelText("Stage 4 date");

describe("DatePickerDrawer", () => {
  it("opens from a click on the date box: a dialog named by its title, with the key, focused on the chosen day", async () => {
    draw("2026-10-16");
    expect(box()).toHaveAttribute("aria-haspopup", "dialog");
    await userEvent.click(box());
    const dialog = await screen.findByRole("dialog", { name: "Choose the Stage 4 date" });
    expect(within(dialog).getByRole("list", { name: "What the marks mean" })).toHaveTextContent("not saved yet");
    expect(within(dialog).getByRole("button", { name: "Friday 16 October 2026: Stage 4" })).toHaveFocus();
  });

  it("focuses today when there's no date yet", async () => {
    draw("");
    await userEvent.click(box());
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Wednesday 14 October 2026: today" })).toHaveFocus();
  });

  it("hands back the picked day, closes, and puts focus back on the date box", async () => {
    const onPick = vi.fn();
    draw("2026-10-16", onPick);
    await userEvent.click(box());
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Friday 30 October 2026" }));
    expect(onPick).toHaveBeenCalledWith("2026-10-30");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(box()).toHaveFocus();
  });

  it("closes on Escape and on Close without picking", async () => {
    const onPick = vi.fn();
    draw("2026-10-16", onPick);
    await userEvent.click(box());
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await userEvent.click(box());
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onPick).not.toHaveBeenCalled();
  });

  it("lets a keyboard user type into the box without opening the drawer, and open it with Alt+Down", async () => {
    draw("");
    act(() => box().focus());
    await userEvent.keyboard("2026");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(await screen.findByRole("dialog", { name: "Choose the Stage 4 date" })).toBeInTheDocument();
  });
});
