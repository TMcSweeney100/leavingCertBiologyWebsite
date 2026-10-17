import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const sendNoContent = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/api/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/client")>()),
  api: { send: (...a: unknown[]) => send(...a), sendNoContent: (...a: unknown[]) => sendNoContent(...a) },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { ReadyControl } from "./ready-control";

const cp = (over: object = {}) => ({ id: "cp1", text: "Initial ideas discussed with the teacher", state: "DUE" as const,
  signedOffOn: null, request: null, answers: [], ...over });

describe("ReadyControl", () => {
  beforeEach(() => { send.mockReset(); sendNoContent.mockReset(); refresh.mockReset(); });

  it("sends a request with a note and announces it", async () => {
    send.mockResolvedValue({ askedOn: "2027-03-03", note: "page 2" });
    render(<ReadyControl componentId="c1" checkpoint={cp()} link={{ url: "https://docs.google.com/d/a", setOn: "2027-03-01" }} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Ready for sign-off: Initial ideas discussed with the teacher" }));
    expect(screen.getByText("Your teacher will see: docs.google.com")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Note for your teacher (optional)" }), "page 2");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(send).toHaveBeenCalledWith("POST", "/components/c1/checkpoints/cp1/request", { note: "page 2" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText("Sent to your teacher.")).toBeInTheDocument();
  });

  it("moves focus to the note box when the form opens", async () => {
    render(<ReadyControl componentId="c1" checkpoint={cp()} link={null} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: /^Ready for sign-off/ }));
    expect(screen.getByRole("textbox", { name: "Note for your teacher (optional)" })).toHaveFocus();
  });

  it("keeps focus inside the control after Send and after Withdraw", async () => {
    send.mockResolvedValue({ askedOn: "2027-03-03", note: "" });
    const { container, unmount } = render(<ReadyControl componentId="c1" checkpoint={cp()} link={null} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: /^Ready for sign-off/ }));
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(container.firstElementChild).toHaveFocus();
    unmount();
    sendNoContent.mockResolvedValue(undefined);
    const second = render(<ReadyControl componentId="c1" checkpoint={cp({ state: "READY", request: { askedOn: "2027-11-03", note: "" } })} link={null} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: /^Withdraw request/ }));
    expect(second.container.firstElementChild).toHaveFocus();
  });

  it("won't send without a link when the class requires one", async () => {
    render(<ReadyControl componentId="c1" checkpoint={cp()} link={null} requireLink />);
    await userEvent.click(screen.getByRole("button", { name: /^Ready for sign-off/ }));
    expect(screen.getByText("Add the link to your work above first.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("nudges, but lets the student send, when a link isn't required", async () => {
    render(<ReadyControl componentId="c1" checkpoint={cp()} link={null} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: /^Ready for sign-off/ }));
    expect(screen.getByText(/Add the link to your work above so your teacher can open it\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("waiting shows the note and Withdraw", async () => {
    sendNoContent.mockResolvedValue(undefined);
    render(<ReadyControl componentId="c1" checkpoint={cp({ state: "READY", request: { askedOn: "2027-11-03", note: "page 2" } })} link={null} requireLink={false} />);
    expect(screen.getByText(/Waiting for your teacher · asked 3 Nov 2027/)).toBeInTheDocument();
    expect(screen.getByText("Your note: page 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Withdraw request: Initial ideas discussed with the teacher" }));
    expect(sendNoContent).toHaveBeenCalledWith("DELETE", "/components/c1/checkpoints/cp1/request");
    expect(refresh).toHaveBeenCalled();
  });

  it("after Not yet, shows the teacher's note and Ask again, which opens the form", async () => {
    render(<ReadyControl componentId="c1" link={null} requireLink={false} checkpoint={cp({ answers: [
      { askedOn: "2027-11-03", note: null, outcome: "NOT_YET", answeredOn: "2027-11-04", teacherNote: "Say what you'll measure." }] })} />);
    expect(screen.getByText("Not yet · 4 Nov 2027")).toBeInTheDocument();
    expect(screen.getByText("Say what you'll measure.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ask again: Initial ideas discussed with the teacher" }));
    expect(screen.getByRole("textbox", { name: "Note for your teacher (optional)" })).toBeInTheDocument();
  });

  it("when signed off after an Accept, shows the teacher's note and no control", () => {
    render(<ReadyControl componentId="c1" link={null} requireLink={false} checkpoint={cp({ state: "SIGNED_OFF", signedOffOn: "2027-11-06", answers: [
      { askedOn: "2027-11-05", note: null, outcome: "ACCEPTED", answeredOn: "2027-11-06", teacherNote: "Good." }] })} />);
    expect(screen.getByText("Your teacher: Good.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ready for sign-off|Ask again|Withdraw/ })).not.toBeInTheDocument();
  });

  it("a failed send says so in a focused alert and keeps the note", async () => {
    send.mockRejectedValue(new Error("offline"));
    render(<ReadyControl componentId="c1" checkpoint={cp()} link={null} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: /^Ready for sign-off/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Note for your teacher (optional)" }), "page 2");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't send it. Check your connection and try again.");
    expect(alert).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Note for your teacher (optional)" })).toHaveValue("page 2");
  });

  it("a failed withdraw says so in a focused alert", async () => {
    sendNoContent.mockRejectedValue(new Error("offline"));
    render(<ReadyControl componentId="c1" checkpoint={cp({ state: "READY", request: { askedOn: "2027-11-03", note: null } })} link={null} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: /^Withdraw request/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't withdraw it.");
    expect(alert).toHaveFocus();
  });
});
