import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api, ApiError } from "@/lib/api/client";

import { StudentCheckpoints } from "./student-checkpoints";

const INITIAL = "Initial ideas discussed with the teacher";
const READY_TEXT = "Analysis shared with the teacher";
const LOG = "Investigative log shared with the teacher";
const data = {
  studentId: "s1", firstName: "Cian", lastName: "Murphy", today: "2026-12-14", behindBy: 1,
  lastLogActivityOn: "2026-11-30", daysSinceLastLogActivity: 14, documentLink: { url: "https://docs.google.com/d/a", setOn: "2026-10-01" },
  stages: [
    { stageId: "a", ordinal: 1, label: "Stage 1", name: "Initial Response", dueDate: "2026-10-02", checkpoint: { id: "c1", text: INITIAL },
      state: "SIGNED_OFF" as const, signedOffOn: "2026-10-06", request: null, answers: [],
      history: [{ signedOffOn: "2026-10-03", revokedOn: "2026-10-04", revokedBy: "Katelyn Hanlon" }] },
    { stageId: "b", ordinal: 2, label: "Stage 2", name: "Background Research", dueDate: "2026-11-06", checkpoint: { id: "c2", text: LOG },
      state: "DUE" as const, signedOffOn: null, history: [], request: null, answers: [] },
    { stageId: "c", ordinal: 3, label: "Stage 3", name: "Analysis", dueDate: "2026-12-01", checkpoint: { id: "cp1", text: READY_TEXT },
      state: "READY" as const, signedOffOn: null, history: [], request: { askedOn: "2026-12-10", note: "see page 2" },
      answers: [{ askedOn: "2026-11-01", note: null, outcome: "NOT_YET" as const, answeredOn: "2026-11-03", teacherNote: "Aim missing" }] },
  ],
};

beforeEach(() => { refresh.mockReset(); vi.mocked(api.send).mockReset(); });

describe("StudentCheckpoints", () => {
  it("says how far behind, lists each checkpoint in full, and keeps revoked sign-offs visible", () => {
    render(<StudentCheckpoints componentId="k1" data={data} />);
    expect(screen.getByRole("heading", { level: 2, name: "Checkpoints" })).toBeInTheDocument();
    expect(screen.getByText("checkpoint behind")).toBeInTheDocument();
    expect(screen.getByText(LOG)).toBeInTheDocument();
    expect(screen.getByText("Signed off on 3 Oct 2026, revoked on 4 Oct 2026 by Katelyn Hanlon.")).toBeInTheDocument();
  });

  it("signs off a due checkpoint and revokes a signed-off one after asking", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "c2", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.click(screen.getByRole("button", { name: `Sign off ${LOG} for Cian Murphy` }));
    expect(api.send).toHaveBeenCalledWith("PUT", "/components/k1/students/s1/checkpoints/c2/signoff", { signedOff: true }, expect.anything());

    await userEvent.click(screen.getByRole("button", { name: `Revoke sign-off of ${INITIAL} for Cian Murphy` }));
    expect(screen.getByText(/^Revoke this sign-off for/)).toHaveTextContent("Revoke this sign-off for Cian Murphy? It stays in the record as revoked by you.");
    await userEvent.click(screen.getByRole("button", { name: `Keep sign-off of ${INITIAL} for Cian Murphy` }));
    expect(screen.queryByText(/Revoke this sign-off/)).not.toBeInTheDocument();
  });

  it("anchors each row and opens the one with a request into the two-part panel, with the last answer beneath", () => {
    const { container } = render(<StudentCheckpoints componentId="k1" data={data} />);
    const row = container.querySelector("#checkpoint-cp1") as HTMLElement;
    expect(row).not.toBeNull();
    expect(within(row).getByText(/see page 2/)).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: `Accept ${READY_TEXT} for Cian Murphy` })).toHaveTextContent("Accept and sign off Stage 3");
    expect(row).toHaveTextContent("Cian asked again 4 days ago");
    expect(row).toHaveTextContent("Not yet on 3 Nov 2026. Your note: “Aim missing”");
    expect(within(row).getByRole("button", { name: "Full history (1 answer)" })).toBeInTheDocument();
    expect(container.querySelector("#checkpoint-c2")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: /^Accept/ })).toHaveLength(1);
  });

  it("accepts: the panel goes, the row says Signed off today with Undo, and the live region says so", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "cp1", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    const { container, rerender } = render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Note to Cian (optional)" }), "Clear aim.");
    await userEvent.click(screen.getByRole("button", { name: `Accept ${READY_TEXT} for Cian Murphy` }));
    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/students/s1/checkpoints/cp1/request/answer",
      { outcome: "ACCEPTED", note: "Clear aim." }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    // What router.refresh() brings back: the checkpoint signed off, the request closed, the answer on top.
    const after = { ...data, stages: data.stages.map((st) => st.checkpoint.id !== "cp1" ? st : { ...st, state: "SIGNED_OFF" as const, signedOffOn: "2026-12-14", request: null,
      answers: [{ askedOn: "2026-12-10", note: "see page 2", outcome: "ACCEPTED" as const, answeredOn: "2026-12-14", teacherNote: "Clear aim." }, ...st.answers] }) };
    rerender(<StudentCheckpoints componentId="k1" data={after} />);
    const row = container.querySelector("#checkpoint-cp1") as HTMLElement;
    expect(screen.queryByRole("textbox", { name: /Note to Cian/ })).not.toBeInTheDocument();
    expect(within(row).getByText("Signed off today")).toBeInTheDocument();
    expect(row).toHaveTextContent("Accepted on 14 Dec 2026. Your note: “Clear aim.”");
    expect(screen.getByText(`Accepted and signed off: ${READY_TEXT}, for Cian Murphy.`)).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: `Undo sign-off of ${READY_TEXT} for Cian Murphy` })).toBeInTheDocument();
  });

  it("says Not yet: a banner under the row and no Undo, because the API can't take a Not yet back", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "cp1", state: "DUE", signedOffOn: null });
    const { container } = render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.click(screen.getByRole("button", { name: `Not yet: ${READY_TEXT} for Cian Murphy` }));
    const row = container.querySelector("#checkpoint-cp1") as HTMLElement;
    expect(row).toHaveTextContent("You answered Not yet today.");
    expect(within(row).queryByRole("button", { name: /^Undo/ })).not.toBeInTheDocument();
    expect(screen.getByText(`Not yet sent: ${READY_TEXT}, for Cian Murphy.`)).toBeInTheDocument();
  });

  it("keeps the note and offers Try again when the answer fails", async () => {
    vi.mocked(api.send).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ checkpointId: "cp1", state: "DUE", signedOffOn: null });
    render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Note to Cian (optional)" }), "Not there yet");
    await userEvent.click(screen.getByRole("button", { name: `Not yet: ${READY_TEXT} for Cian Murphy` }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t send Not yet for");
    expect(screen.getByRole("textbox", { name: "Note to Cian (optional)" })).toHaveValue("Not there yet");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(api.send).toHaveBeenLastCalledWith("POST", expect.stringContaining("/request/answer"), { outcome: "NOT_YET", note: "Not there yet" }, expect.anything());
  });

  it("opens the full history in a drawer: focus on its heading, one shared note, focus back on close", async () => {
    render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Note to Cian (optional)" }), "Half a thought");
    const trigger = screen.getByRole("button", { name: "Full history (1 answer)" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { level: 2, name: READY_TEXT })).toHaveFocus();
    expect(within(dialog).getByRole("heading", { level: 3, name: "Answered, newest first" })).toBeInTheDocument();
    const box = within(dialog).getByRole("textbox", { name: "Note to Cian (optional)" });
    expect(box).toHaveValue("Half a thought");
    await userEvent.type(box, " more");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "Note to Cian (optional)" })).toHaveValue("Half a thought more");
    expect(screen.getByRole("button", { name: "Full history (1 answer)" })).toHaveFocus();
  });

  it("answers inside the drawer and keeps it open on the answered strip", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "cp1", state: "SIGNED_OFF", signedOffOn: "2026-12-14" });
    render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.click(screen.getByRole("button", { name: "Full history (1 answer)" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: `Accept ${READY_TEXT} for Cian Murphy` }));
    expect(await within(dialog).findByText("Accepted and signed off today")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: `Undo sign-off of ${READY_TEXT} for Cian Murphy` })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows a new request's form again after a Not yet, once the page has shown the old one closed", async () => {
    vi.mocked(api.send).mockResolvedValue({ checkpointId: "cp1", state: "DUE", signedOffOn: null });
    const withRequest = (request: { askedOn: string; note: string } | null) =>
      ({ ...data, stages: data.stages.map((st) => st.checkpoint.id !== "cp1" ? st : { ...st, request }) });
    const { rerender } = render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.click(screen.getByRole("button", { name: `Not yet: ${READY_TEXT} for Cian Murphy` }));
    expect(screen.queryByRole("textbox", { name: /Note to Cian/ })).not.toBeInTheDocument();
    rerender(<StudentCheckpoints componentId="k1" data={withRequest(null)} />);
    rerender(<StudentCheckpoints componentId="k1" data={withRequest({ askedOn: "2026-12-14", note: "fixed it" })} />);
    expect(await screen.findByRole("textbox", { name: "Note to Cian (optional)" })).toBeInTheDocument();
  });

  it("keeps the Accepted strip when Undo fails, and drops it when Undo lands", async () => {
    vi.mocked(api.send).mockResolvedValueOnce({ checkpointId: "cp1", state: "SIGNED_OFF", signedOffOn: "2026-12-14" })
      .mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ checkpointId: "cp1", state: "DUE", signedOffOn: null });
    render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.click(screen.getByRole("button", { name: "Full history (1 answer)" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: `Accept ${READY_TEXT} for Cian Murphy` }));
    const undo = await within(dialog).findByRole("button", { name: `Undo sign-off of ${READY_TEXT} for Cian Murphy` });
    await userEvent.click(undo);
    await waitFor(() => expect(api.send).toHaveBeenCalledTimes(2));
    expect(within(dialog).getByText("Accepted and signed off today")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: `Undo sign-off of ${READY_TEXT} for Cian Murphy` }));
    await waitFor(() => expect(within(dialog).queryByText("Accepted and signed off today")).not.toBeInTheDocument());
  });

  it("shows the server's message when the note is rejected, and keeps what was typed while sending", async () => {
    vi.mocked(api.send).mockRejectedValueOnce(new ApiError({ code: "VALIDATION_FAILED", status: 400, detail: "Note is too long." }));
    render(<StudentCheckpoints componentId="k1" data={data} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Note to Cian (optional)" }), "abc");
    await userEvent.click(screen.getByRole("button", { name: `Not yet: ${READY_TEXT} for Cian Murphy` }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Note is too long.");
  });
});
