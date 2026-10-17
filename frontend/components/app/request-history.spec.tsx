import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RequestHistory } from "./request-history";

describe("RequestHistory", () => {
  it("lists answered requests newest first with both notes", () => {
    render(<RequestHistory answers={[
      { askedOn: "2027-11-05", note: "added it", outcome: "ACCEPTED", answeredOn: "2027-11-06", teacherNote: null },
      { askedOn: "2027-11-03", note: "page 2", outcome: "NOT_YET", answeredOn: "2027-11-04", teacherNote: "Say what you'll measure." },
    ]} />);
    expect(screen.getByText("Earlier requests (2)")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem", { hidden: true });
    expect(items[0]).toHaveTextContent(/Accepted/);
    expect(items[1]).toHaveTextContent(/Not yet.*Say what you'll measure\./);
  });

  it("renders nothing when there are no answers", () => {
    const { container } = render(<RequestHistory answers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
