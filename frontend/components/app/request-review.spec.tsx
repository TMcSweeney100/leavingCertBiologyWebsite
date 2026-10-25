import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { RequestReview } from "./request-review";

const base = {
  firstName: "Aoife", name: "Aoife Byrne", text: "Initial ideas discussed with the teacher", stage: "Stage 3", checkpointId: "cp1",
  request: { askedOn: "2027-03-01", note: "plan's on page 2" }, again: false, today: "2027-03-05",
  link: { url: "https://docs.google.com/d/a", setOn: "2027-02-20" }, note: "", busy: null, error: null,
};

function Harness(props: Partial<React.ComponentProps<typeof RequestReview>> & { onAnswer?: (o: "ACCEPTED" | "NOT_YET") => void }) {
  const [note, setNote] = useState(props.note ?? "");
  return <RequestReview {...base} onAnswer={vi.fn()} onRetry={vi.fn()} {...props} note={note} onNote={setNote} />;
}

describe("RequestReview", () => {
  it("shows when they asked, the student's note and their work", () => {
    render(<Harness />);
    expect(screen.getByText("Aoife asked 4 days ago, for the first time")).toBeInTheDocument();
    expect(screen.getByText(/plan's on page 2/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" });
    expect(link).toHaveTextContent("Open Aoife's work");
    expect(link).toHaveTextContent("docs.google.com");
  });

  it("says asked again, with the date", () => {
    render(<Harness again />);
    expect(screen.getByText("Aoife asked again 4 days ago")).toBeInTheDocument();
    expect(screen.getByText(/\(1 Mar 2027\)/)).toBeInTheDocument();
  });

  it("says so when there's no note or no link", () => {
    render(<Harness link={null} request={{ askedOn: "2027-03-01", note: null }} />);
    expect(document.body).toHaveTextContent("No note from Aoife.");
    expect(document.body).toHaveTextContent("No link to Aoife’s work. Aoife can add one on their Your work card.");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("accepts and says Not yet under their long names, with the visible words from the design", async () => {
    const onAnswer = vi.fn();
    render(<Harness onAnswer={onAnswer} />);
    const accept = screen.getByRole("button", { name: "Accept Initial ideas discussed with the teacher for Aoife Byrne" });
    expect(accept).toHaveTextContent("Accept and sign off Stage 3");
    await userEvent.click(accept);
    await userEvent.click(screen.getByRole("button", { name: "Not yet: Initial ideas discussed with the teacher for Aoife Byrne" }));
    expect(onAnswer.mock.calls).toEqual([["ACCEPTED"], ["NOT_YET"]]);
  });

  it("counts the note against 500 and describes the field with the help line", async () => {
    render(<Harness />);
    const box = screen.getByRole("textbox", { name: "Note to Aoife (optional)" });
    await userEvent.type(box, "Clear aim.");
    expect(screen.getByText("10 / 500")).toBeInTheDocument();
    expect(box).toHaveAttribute("maxlength", "500");
    expect(box).toHaveAccessibleDescription(/Keep it general/);
  });

  it("disables both buttons and changes the label while one saves", () => {
    render(<Harness busy="ACCEPTED" />);
    expect(screen.getByRole("button", { name: /^Accept/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Accept/ })).toHaveTextContent("Accepting…");
    expect(screen.getByRole("button", { name: /^Not yet/ })).toBeDisabled();
  });

  it("shows the failure as an alert under the buttons and re-sends the same outcome on Try again", async () => {
    const onRetry = vi.fn();
    render(<Harness error={{ outcome: "NOT_YET", gone: false }} onRetry={onRetry} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn’t send Not yet for “Initial ideas discussed with the teacher” for Aoife Byrne. Nothing changed.");
    expect(alert).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("explains a request that is no longer open, without Try again", () => {
    render(<Harness error={{ outcome: "ACCEPTED", gone: true }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("This request was withdrawn or already answered. The page has been refreshed.");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
