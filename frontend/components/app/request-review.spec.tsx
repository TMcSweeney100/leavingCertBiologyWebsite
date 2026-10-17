import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/problem";

import { RequestReview } from "./request-review";

const send = vi.mocked(api.send);
const props = { componentId: "c1", studentId: "s1", name: "Aoife Byrne", text: "Initial ideas discussed with the teacher",
  checkpointId: "cp1", request: { askedOn: "2027-03-01", note: "plan's on page 2" }, link: { url: "https://docs.google.com/d/a", setOn: "2027-02-20" } };

beforeEach(() => { refresh.mockReset(); send.mockReset(); });

describe("RequestReview", () => {
  it("shows the student's note and their work, and accepts with a note", async () => {
    send.mockResolvedValue({ checkpointId: "cp1", state: "SIGNED_OFF", signedOffOn: "2027-03-03" });
    render(<RequestReview {...props} />);
    expect(screen.getByText("plan's on page 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Aoife Byrne's work (opens in a new tab)" })).toBeInTheDocument();
    expect(screen.getByText(/Keep it general/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Note to Aoife Byrne (optional)" }), "Clear aim.");
    await userEvent.click(screen.getByRole("button", { name: "Accept Initial ideas discussed with the teacher for Aoife Byrne" }));
    expect(send).toHaveBeenCalledWith("POST", "/components/c1/students/s1/checkpoints/cp1/request/answer",
      { outcome: "ACCEPTED", note: "Clear aim." }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("says Not yet", async () => {
    send.mockResolvedValue({ checkpointId: "cp1", state: "DUE", signedOffOn: null });
    render(<RequestReview {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Not yet: Initial ideas discussed with the teacher for Aoife Byrne" }));
    expect(send).toHaveBeenCalledWith("POST", expect.stringContaining("/request/answer"), { outcome: "NOT_YET", note: "" }, expect.anything());
  });

  it("says No link yet when there isn't one", () => {
    render(<RequestReview {...props} link={null} />);
    expect(screen.getByText("No link yet")).toBeInTheDocument();
  });

  it("explains a 409: the student withdrew, or another tab answered, and moves focus to the message", async () => {
    send.mockRejectedValue(new ApiError({ code: "SIGNOFF_REQUEST_NOT_OPEN", status: 409 }));
    render(<RequestReview {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /^Accept/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This request was withdrawn or already answered. The page has been refreshed.");
    expect(alert).toHaveFocus();
    expect(refresh).toHaveBeenCalled();
  });

  it("says nothing changed on any other failure", async () => {
    send.mockRejectedValue(new Error("offline"));
    render(<RequestReview {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /^Not yet/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your answer. Nothing changed.");
    expect(refresh).not.toHaveBeenCalled();
  });
});
