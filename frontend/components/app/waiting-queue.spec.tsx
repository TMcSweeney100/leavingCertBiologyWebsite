import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WaitingQueue } from "./waiting-queue";

const w = (first: string, askedOn: string, note: string | null = null) => ({ studentId: first, firstName: first, lastName: "Byrne",
  checkpointId: "cp1", checkpointText: "Initial ideas discussed with the teacher", askedOn, note });

describe("WaitingQueue", () => {
  it("lists who's waiting, oldest first, each opening the student page at that checkpoint", () => {
    render(<WaitingQueue classId="k1" today="2027-03-03" waiting={[w("Aoife", "2027-03-01", "page 2"), w("Cian", "2027-03-03")]} />);
    expect(screen.getByRole("heading", { name: "2 students waiting for you" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAccessibleName("Review Initial ideas discussed with the teacher for Aoife Byrne");
    expect(links[0]).toHaveAttribute("href", "/teach/classes/k1/students/Aoife#checkpoint-cp1");
    expect(screen.getByText(/asked 2 days ago/)).toBeInTheDocument();
    expect(screen.getByText("page 2")).toBeInTheDocument();
  });

  it("counts a student once however many checkpoints they are waiting on", () => {
    render(<WaitingQueue classId="k1" today="2027-03-03" waiting={[w("Aoife", "2027-03-01"), { ...w("Aoife", "2027-03-02"), checkpointId: "cp2" }]} />);
    expect(screen.getByRole("heading", { name: "1 student waiting for you" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders nothing when no one is waiting", () => {
    const { container } = render(<WaitingQueue classId="k1" today="2027-03-03" waiting={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
