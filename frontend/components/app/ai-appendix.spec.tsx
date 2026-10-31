import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiUseFields } from "@/lib/api/schemas";

import { AiAppendix } from "./ai-appendix";

const ai = (id: string, f: Partial<AiUseFields>) => ({ id, fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2025-02-14",
  howUsed: "Used to suggest possible project themes.", prompts: null, shareUrl: null, ...f } });
const early = ai("e", {});
const late = ai("l", { dateGenerated: "2025-02-25", toolNameAndVersion: "ChatGPT-3.5", prompts: "Find climate data sources" });

const writeText = vi.fn();
const write = vi.fn();
class FakeClipboardItem { constructor(public parts: Record<string, Blob>) {} }

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  write.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText, write }, configurable: true });
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
});
afterEach(() => vi.unstubAllGlobals());

describe("AiAppendix", () => {
  it("is a section named by its heading, quoting the SEC", () => {
    render(<AiAppendix componentId="k1" uses={[early]} />);
    expect(screen.getByRole("region", { name: "AI use appendix" })).toBeInTheDocument();
    expect(screen.getByText(/The use of all AI tools must be documented in a dedicated section of the coursework, such as an appendix section\./)).toBeInTheDocument();
  });

  it("shows one row per use, oldest first, with the four columns and any prompt", () => {
    render(<AiAppendix componentId="k1" uses={[late, early]} />);
    const rows = within(screen.getByRole("list", { name: "AI uses" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("AI toolChatGPT-4DeveloperOpenAIDate of use14/02/2025PurposeUsed to suggest possible project themes.");
    expect(rows[1]).toHaveTextContent("Prompt(s)Find climate data sources");
    expect(within(rows[0]).queryByText("Prompt(s)")).not.toBeInTheDocument();
  });

  it("copies the appendix as a table and as text in one write, and says so (A-14)", async () => {
    render(<AiAppendix componentId="k1" uses={[early, late]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy appendix" }));
    expect(await screen.findByText("Copied 2 AI uses.")).toBeInTheDocument();
    const [items] = write.mock.calls[0];
    expect(Object.keys(items[0].parts)).toEqual(["text/html", "text/plain"]);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to plain text where the browser has no ClipboardItem", async () => {
    vi.stubGlobal("ClipboardItem", undefined);
    render(<AiAppendix componentId="k1" uses={[early]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy appendix" }));
    expect(await screen.findByText("Copied 1 AI use.")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("AI tool: ChatGPT-4\nDeveloper: OpenAI\nDate of use: 14/02/2025\nPurpose: Used to suggest possible project themes.");
  });

  it("says what to do when the browser refuses to copy", async () => {
    write.mockRejectedValue(new Error("denied"));
    render(<AiAppendix componentId="k1" uses={[early]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy appendix" }));
    expect(await screen.findByText("Couldn't copy. Select the text and copy it yourself.")).toBeInTheDocument();
  });

  it("offers to log an AI use when there are none (A-17)", () => {
    render(<AiAppendix componentId="k1" uses={[]} />);
    expect(screen.getByRole("link", { name: "Log an AI use" })).toHaveAttribute("href", "/components/k1/log/new?kind=AI_USE");
    expect(screen.queryByRole("button", { name: "Copy appendix" })).not.toBeInTheDocument();
  });
});
