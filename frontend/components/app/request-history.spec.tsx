import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnswerList, LastAnswerLine, RequestHistory } from "./request-history";

const answers = [
  { askedOn: "2027-11-05", note: "added it", outcome: "ACCEPTED" as const, answeredOn: "2027-11-06", teacherNote: null },
  { askedOn: "2027-11-03", note: "page 2", outcome: "NOT_YET" as const, answeredOn: "2027-11-04", teacherNote: "Say what you'll measure." },
];

describe("LastAnswerLine", () => {
  it("says the newest answer, and the teacher's note on it", () => {
    render(<LastAnswerLine firstName="Aoife" answers={[answers[1]]} />);
    expect(document.body).toHaveTextContent("Not yet on 4 Nov 2027. Your note: “Say what you'll measure.”");
  });

  it("says No note when the answer had none", () => {
    render(<LastAnswerLine firstName="Aoife" answers={[answers[0]]} />);
    expect(screen.getByText(/Accepted on 6 Nov 2027\. No note\./)).toBeInTheDocument();
  });

  it("says it's the first request when there are no answers", () => {
    render(<LastAnswerLine firstName="Aoife" answers={[]} />);
    expect(document.body).toHaveTextContent("No earlier answers. This is Aoife’s first request for this checkpoint.");
  });

  it("puts the action beside the line", () => {
    render(<LastAnswerLine firstName="Aoife" answers={answers} action={<button>Full history</button>} />);
    expect(screen.getByRole("button", { name: "Full history" })).toBeInTheDocument();
  });
});

describe("AnswerList", () => {
  it("lists answered rounds in the order given with both notes", () => {
    render(<AnswerList firstName="Aoife" answers={answers} />);
    expect(screen.getByRole("heading", { name: "Answered, newest first", level: 3 })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/Accepted/);
    expect(items[1]).toHaveTextContent(/Aoife asked\. “page 2”/);
    expect(items[1]).toHaveTextContent(/Not yet\. Your note: “Say what you'll measure\.”/);
  });
});

describe("RequestHistory (student side)", () => {
  it("folds the answered requests, newest first, under a count", () => {
    render(<RequestHistory answers={answers} />);
    expect(screen.getByText("Earlier requests (2)")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem", { hidden: true })[0]).toHaveTextContent(/Accepted/);
  });

  it("renders nothing when there are no answers", () => {
    const { container } = render(<RequestHistory answers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
