import assert from "node:assert/strict";
import { test } from "node:test";

import type { AiUseFields } from "@/lib/api/schemas";

import { APPENDIX_RULE, appendixHtml, appendixPairs, appendixRows, appendixText } from "./ai-appendix.ts";

const ai = (f: Partial<AiUseFields>): AiUseFields => ({ toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2025-02-14",
  howUsed: "Used to suggest possible project themes.", prompts: null, shareUrl: null, ...f });

test("the SEC's sentence, quoted exactly (A-16; AppCopySourcesTest)", () => {
  assert.equal(APPENDIX_RULE, "The use of all AI tools must be documented in a dedicated section of the coursework, such as an appendix section.");
});

test("rows run oldest first, trimmed, with the date as dd/mm/yyyy (A-13)", () => {
  const rows = appendixRows([
    { id: "late", fields: ai({ dateGenerated: "2025-02-25", toolNameAndVersion: " ChatGPT-3.5 " }) },
    { id: "early", fields: ai({}) },
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["early", "late"]);
  assert.equal(rows[1].tool, "ChatGPT-3.5");
  assert.equal(rows[0].date, "14/02/2025");
});

test("each row's pairs are the four SEC columns, then the prompt and link when there are any (A-5, A-6)", () => {
  const [plain] = appendixRows([{ id: "a", fields: ai({ prompts: " ", shareUrl: null }) }]);
  assert.deepEqual(appendixPairs(plain), [
    ["AI tool", "ChatGPT-4"], ["Developer", "OpenAI"], ["Date of use", "14/02/2025"], ["Purpose", "Used to suggest possible project themes."],
  ]);
  const [full] = appendixRows([{ id: "b", fields: ai({ prompts: "Suggest themes", shareUrl: "https://chatgpt.com/share/x" }) }]);
  assert.deepEqual(appendixPairs(full).slice(4), [["Prompt(s)", "Suggest themes"], ["Share link", "https://chatgpt.com/share/x"]]);
});

test("the plain text is one labelled block per use, a blank line between", () => {
  const rows = appendixRows([{ id: "a", fields: ai({}) }, { id: "b", fields: ai({ dateGenerated: "2025-02-20", developer: "Microsoft", toolNameAndVersion: "Microsoft Copilot (GPT-4)", howUsed: "Clarified fiscal policy.", prompts: "What is fiscal policy?" }) }]);
  assert.equal(appendixText(rows), [
    "AI tool: ChatGPT-4\nDeveloper: OpenAI\nDate of use: 14/02/2025\nPurpose: Used to suggest possible project themes.",
    "AI tool: Microsoft Copilot (GPT-4)\nDeveloper: Microsoft\nDate of use: 20/02/2025\nPurpose: Clarified fiscal policy.\nPrompt(s): What is fiscal policy?",
  ].join("\n\n"));
});

test("the HTML is a four-column table, a full-width row for the prompt and link, and the student's text escaped (A-14)", () => {
  const rows = appendixRows([{ id: "a", fields: ai({ howUsed: "Compared <b>enzymes</b> & \"rates\"", prompts: "Line one\nLine two", shareUrl: "https://chatgpt.com/share/x" }) }]);
  assert.equal(appendixHtml(rows),
    "<table border=\"1\"><thead><tr><th>AI tool</th><th>Developer</th><th>Date of use</th><th>Purpose</th></tr></thead><tbody>"
    + "<tr><td>ChatGPT-4</td><td>OpenAI</td><td>14/02/2025</td><td>Compared &lt;b&gt;enzymes&lt;/b&gt; &amp; &quot;rates&quot;</td></tr>"
    + "<tr><td colspan=\"4\">Prompt(s): Line one<br>Line two<br>Share link: https://chatgpt.com/share/x</td></tr>"
    + "</tbody></table>");
});

test("a use with no prompt or link has no extra row", () => {
  assert.ok(!appendixHtml(appendixRows([{ id: "a", fields: ai({}) }])).includes("colspan"));
});
