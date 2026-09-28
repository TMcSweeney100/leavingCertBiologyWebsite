import { render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("checkbox", { name: "Let my teacher read this" })).toBeChecked();
    expect(screen.getByText("Your teacher can read this.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "Ran the pilot titration.");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/components/k1/log",
      { kind: "NOTE", body: "Ran the pilot titration.", fields: null, visibleToTeacher: true }, expect.anything());
    expect(push).toHaveBeenCalledWith("/components/k1/log");
  });

  it("changes the line when the student keeps the entry to themselves (FR-24e)", async () => {
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Let my teacher read this" }));
    expect(screen.getByText("Only you can read this. Your teacher sees that you made an entry on 3 March.")).toBeInTheDocument();
  });

  it("asks an online source for its link and the date accessed", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="create" componentId="k1" today="2027-03-03" />);
    await userEvent.click(screen.getByRole("radio", { name: "Source" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Type of source" }), "ONLINE_VIDEO");
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Zig & Zag");
    await userEvent.type(screen.getByRole("textbox", { name: "Link" }), "https://youtu.be/yCv4iyPqZKQ");
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
    await userEvent.type(screen.getByLabelText("Date accessed"), "2024-06-17");
    await userEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(await screen.findByRole("alert")).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Link" })).toHaveAttribute("aria-invalid", "true");
  });
  it("saves a new revision without changing the kind", async () => {
    vi.mocked(api.send).mockResolvedValue({ entry: { id: "e1" }, history: [] });
    render(<LogEntryForm mode="revise" entryId="e1" kind="NOTE" body="v1" fields={null} componentId="k1" today="2027-03-03" />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    const note = screen.getByRole("textbox", { name: "Note" });
    await userEvent.clear(note);
    await userEvent.type(note, "v2");
    await userEvent.click(screen.getByRole("button", { name: "Save new revision" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/log/e1/revisions", { body: "v2", fields: null }, expect.anything());
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Saved as a new revision.");
  });
});
