import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api, ApiError } from "@/lib/api/client";

import { LogEntryForm } from "./log-entry-form";

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("LogEntryForm", () => {
  it("writes a note, visible by default, and says so in words", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    expect(screen.getByRole("switch", { name: "Let my teacher read this" })).toBeChecked();
    expect(screen.getByText("Your teacher can read this.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "Ran the pilot titration.");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/log",
      { kind: "NOTE", body: "Ran the pilot titration.", fields: null, visibleToTeacher: true }, expect.anything());
    expect(push).toHaveBeenCalledWith("/components/k1/log");
  });

  it("changes the line when the student keeps the entry to themselves (FR-24e)", async () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("switch", { name: "Let my teacher read this" }));
    expect(screen.getByText("Only you can read this.")).toBeInTheDocument();
    expect(screen.getByText(/Your teacher sees that you made a note on 3 March, how many times you edit it and when, and the date you hid it, but never what it says\./)).toBeInTheDocument();
  });

  it("asks an online source for its link and the date accessed", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "Source" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Type of source" }), "ONLINE_VIDEO");
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Zig & Zag");
    await userEvent.type(screen.getByRole("textbox", { name: "Link" }), "https://youtu.be/yCv4iyPqZKQ");
    expect(screen.getByLabelText("Date accessed")).toHaveValue("2027-03-03");
    await userEvent.clear(screen.getByLabelText("Date accessed"));
    await userEvent.type(screen.getByLabelText("Date accessed"), "2024-12-12");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(vi.mocked(api.send).mock.calls[0][2]).toMatchObject({
      kind: "SOURCE", body: null,
      fields: { type: "ONLINE_VIDEO", title: "Zig & Zag", url: "https://youtu.be/yCv4iyPqZKQ", dateAccessed: "2024-12-12", author: null },
    });
  });

  it("doesn't ask a book for a link", async () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "Source" }));
    expect(screen.queryByRole("textbox", { name: "Link" })).not.toBeInTheDocument();
  });

  it("records an AI use with the SEC's four minimum details", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "AI use" }));
    await userEvent.type(screen.getByRole("textbox", { name: "AI tool and version" }), "ChatGPT-4");
    await userEvent.type(screen.getByRole("textbox", { name: "Developer or publisher" }), "OpenAI");
    await userEvent.clear(screen.getByLabelText("Date the output was generated"));
    await userEvent.type(screen.getByLabelText("Date the output was generated"), "2027-03-02");
    await userEvent.type(screen.getByRole("textbox", { name: "How you used it" }), "Suggested project themes.");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(vi.mocked(api.send).mock.calls[0][2]).toMatchObject({
      kind: "AI_USE",
      fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2027-03-02", howUsed: "Suggested project themes.", prompts: null, shareUrl: null },
    });
  });

  it("shows a refused link under its field and focuses the alert", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({ code: "VALIDATION_FAILED", status: 400, detail: "Check the highlighted details.",
      fieldErrors: [{ field: "fields.url", message: "must be a full https:// link" }] }));
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "Source" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Type of source" }), "ONLINE_TEXT_OR_IMAGE");
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Latin Library");
    await userEvent.type(screen.getByRole("textbox", { name: "Link" }), "http://x.ie");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(await screen.findByRole("alert")).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Link" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: "Link" })).toHaveAccessibleDescription(/starts with http:\/\/, which isn't secure/);
    expect(screen.getByRole("alert")).toHaveTextContent("That didn't save");
  });

  it("keeps Note preselected and keeps typed text when the kind changes", async () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    expect(screen.getByRole("radio", { name: "Note" })).toBeChecked();
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "kept");
    await userEvent.click(screen.getByRole("radio", { name: "AI use" }));
    expect(screen.getByRole("textbox", { name: "Notes (optional)" })).toHaveValue("kept");
  });

  it("shows the character counter only near the limit", async () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    const note = screen.getByRole("textbox", { name: "Note" });
    expect(screen.queryByText(/of 4,000/)).not.toBeInTheDocument();
    fireEvent.change(note, { target: { value: "x".repeat(3850) } });
    expect(screen.getByText("3,850 of 4,000")).toBeInTheDocument();
  });

  it("asks before leaving a form with unsaved text", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(push).toHaveBeenCalledWith("/components/k1/log");
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "half a thought");
    push.mockReset();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
  it("saves a new revision without changing the kind, then returns to the entry", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="revise" entryId="e1" kind="NOTE" body="v1" fields={null} componentId="k1" today="2027-03-03"
      revisionCount={3} lastRevisedOn="2026-10-15" visible />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText(/Saving adds/)).toHaveTextContent("Saving adds revision 4. Revision 3, from 15 Oct 2026, is kept in the history.");
    expect(screen.getByText("Your teacher can read this entry and will see the new revision.")).toBeInTheDocument();
    const note = screen.getByRole("textbox", { name: "Note" });
    await userEvent.clear(note);
    await userEvent.type(note, "v2");
    await userEvent.click(screen.getByRole("button", { name: "Save new revision" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/log/e1/revisions", { body: "v2", fields: null }, expect.anything());
    expect(push).toHaveBeenCalledWith("/components/k1/log/e1");
  });
});
