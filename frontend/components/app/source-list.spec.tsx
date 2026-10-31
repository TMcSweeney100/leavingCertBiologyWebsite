import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AiUseFields, SourceFields } from "@/lib/api/schemas";

import { SourceList } from "./source-list";

const blank: SourceFields = { type: "BOOK", title: "", author: null, publication: null, datePublished: null, url: null,
  dateAccessed: null, locator: null, keyInformation: null, relevance: null, reflections: null };
const book = { id: "s1", kind: "SOURCE" as const, fields: { ...blank, title: "Inclusion: effective practice for all students? 2nd edn.", author: "McLeskey, J.", datePublished: "2013", locator: "p. 57" } };
const video = { id: "s2", kind: "SOURCE" as const, fields: { ...blank, type: "ONLINE_VIDEO" as const, title: "Zig & Zag – Christmas crises", url: "http://youtu.be/yCv4iyPqZKQ", dateAccessed: "2014-12-12" } };
const BOOK_REF = "McLeskey, J. (2013) Inclusion: effective practice for all students? 2nd edn.";
const VIDEO_REF = "Zig & Zag – Christmas crises, date not available, http://youtu.be/yCv4iyPqZKQ, Date accessed: 12/12/2014";

const aiUse = { id: "a1", kind: "AI_USE" as const, fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2026-10-01",
  howUsed: "Suggested possible project themes.", prompts: null, shareUrl: null } satisfies AiUseFields };
const AI_REF = "OpenAI (2026) ChatGPT-4, accessed 01/10/2026.";

const writeText = vi.fn();
beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

describe("SourceList", () => {
  it("lists each source's reference and in-text citation, alphabetically", () => {
    render(<SourceList componentId="k1" entries={[video, book]} />);
    const items = within(screen.getByRole("list", { name: "References" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(BOOK_REF);
    expect(items[0]).toHaveTextContent("(p. 57, McLeskey, 2013)");
    expect(items[1]).toHaveTextContent(VIDEO_REF);
    expect(screen.getByText(/No particular, formal style of referencing is required\./)).toBeInTheDocument();
  });

  it("copies the whole list, one reference per line, and says so", async () => {
    render(<SourceList componentId="k1" entries={[video, book]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy reference list" }));
    expect(writeText).toHaveBeenCalledWith(`${BOOK_REF}\n${VIDEO_REF}`);
    expect(await screen.findByText("Copied 2 references.")).toBeInTheDocument();
  });

  it("copies one in-text citation", async () => {
    render(<SourceList componentId="k1" entries={[video, book]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy citation for Zig & Zag – Christmas crises" }));
    expect(writeText).toHaveBeenCalledWith("(youtu.be/yCv4iyPqZKQ)");
    expect(await screen.findByText("Citation copied.")).toBeInTheDocument();
  });

  it("flags a source missing a detail, and still lets the list be copied", () => {
    render(<SourceList componentId="k1" entries={[video, book]} />);
    expect(screen.getByText("Add the page, chapter or timestamp you used so a reader can check this source.")).toBeInTheDocument();
    expect(screen.getByText("1 of your sources is missing a detail. You can still copy the list.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy reference list" })).toBeEnabled();
  });

  it("says what to do when the browser refuses to copy", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<SourceList componentId="k1" entries={[book]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy reference list" }));
    expect(await screen.findByText("Couldn't copy. Select the text and copy it yourself.")).toBeInTheDocument();
  });

  it("opens each source in the log", () => {
    render(<SourceList componentId="k1" entries={[book]} />);
    expect(screen.getByRole("link", { name: `Open in log, ${book.fields.title}` })).toHaveAttribute("href", "/components/k1/log/s1");
  });

  it("offers to add a source when there are none", () => {
    render(<SourceList componentId="k1" entries={[]} />);
    expect(screen.getByRole("heading", { name: "No sources yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a source" })).toHaveAttribute("href", "/components/k1/log/new?kind=SOURCE");
    expect(screen.queryByRole("button", { name: "Copy reference list" })).not.toBeInTheDocument();
  });

  it("lists an AI use in the same alphabetical list, marked as an AI use", () => {
    render(<SourceList componentId="k1" entries={[video, aiUse, book]} />);
    const items = within(screen.getByRole("list", { name: "References" })).getAllByRole("listitem");
    expect(items[1]).toHaveTextContent(AI_REF);
    expect(within(items[1]).getByText("AI use")).toBeInTheDocument();
    expect(within(items[0]).queryByText("AI use")).not.toBeInTheDocument();
    expect(items[1]).toHaveTextContent("(OpenAI (2026) ChatGPT-4, 01/10/2026)");
  });

  it("names an AI use by its tool, flags it without a link or prompt, and opens it in the log", () => {
    render(<SourceList componentId="k1" entries={[aiUse]} />);
    expect(screen.getByRole("button", { name: "Copy citation for ChatGPT-4" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in log, ChatGPT-4" })).toHaveAttribute("href", "/components/k1/log/a1");
    expect(screen.getByText("Add the share link or the prompt you used so a reader can check this source.")).toBeInTheDocument();
  });

  it("says the list holds sources and AI uses", () => {
    render(<SourceList componentId="k1" entries={[book]} />);
    expect(screen.getByText(/Built from the sources and AI uses in your log/)).toBeInTheDocument();
  });
});
