import assert from "node:assert/strict";
import { test } from "node:test";

import type { SourceFields } from "@/lib/api/schemas";

import { citation, copyText, ddmmyyyy, missingLine, referenceList, shortLink, shortName, sourceFromForm } from "./citation.ts";

test("a date accessed reads day/month/year, never ambiguously (decision S-9)", () => {
  assert.equal(ddmmyyyy("2024-06-17"), "17/06/2024");
  assert.equal(ddmmyyyy("2023-11-10"), "10/11/2023");
});

test("an in-text citation names the author by surname, or whole when there's no comma", () => {
  assert.equal(shortName("McLeskey, J."), "McLeskey");
  assert.equal(shortName("Latin Library"), "Latin Library");
  assert.equal(shortName("  Hearne , J. "), "Hearne");
});

test("an online in-text citation is the link without its scheme, www., extension or trailing slash", () => {
  assert.equal(shortLink("http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf"), "thelatinlibrary.com/101/RhetoricalDevices");
  assert.equal(shortLink("http://youtu.be/yCv4iyPqZKQ"), "youtu.be/yCv4iyPqZKQ");
  assert.equal(shortLink("https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/"),
    "rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes");
  assert.equal(shortLink("https://example.ie/"), "example.ie");
  assert.equal(shortLink("not a link"), "not a link");
});

test("a link's query string stays, so two videos on one page never get the same citation", () => {
  assert.equal(shortLink("https://www.youtube.com/watch?v=yCv4iyPqZKQ"), "youtube.com/watch?v=yCv4iyPqZKQ");
  assert.equal(shortLink("https://www.bbc.com/news/article?id=123"), "bbc.com/news/article?id=123");
  assert.equal(shortLink("https://en.wikipedia.org/wiki/Cell_(biology)#History"), "en.wikipedia.org/wiki/Cell_(biology)");
});

const blank: SourceFields = { type: "BOOK", title: "", author: null, publication: null, datePublished: null, url: null,
  dateAccessed: null, locator: null, keyInformation: null, relevance: null, reflections: null };
const source = (f: Partial<SourceFields>): SourceFields => ({ ...blank, ...f });

/** S-4's gate: each detail is found, each after the one before. */
function inOrder(text: string, details: string[]) {
  let from = 0;
  for (const d of details) {
    const at = text.indexOf(d, from);
    assert.ok(at >= 0, `"${d}" missing (or out of order) in: ${text}`);
    from = at + d.length;
  }
}

// NCCA-BIO pp. 15-16 and NCCA-BUS pp. 22-23, quoted. Same literals as CitationExamplesSourcesTest: change both or neither.
const NCCA = {
  book: {
    fields: source({ type: "BOOK", author: "McLeskey, J.", datePublished: "2013", title: "Inclusion: effective practice for all students? 2nd edn.", locator: "p. 57" }),
    inText: "(p. 57, McLeskey, 2013)",
    reference: "McLeskey, J. (2013) Inclusion: effective practice for all students? 2nd edn.",
  },
  newspaper: {
    fields: source({ type: "NEWSPAPER_OR_MAGAZINE", author: "Hearne, J.", datePublished: "30/08/2024", title: "How bad driving habits cost Irish motorists hundreds every year", publication: "Irish Examiner" }),
    inText: "(Hearne, J., 30/08/2024)",
    reference: "Hearne, J. (30/08/2024) ‘How bad driving habits cost Irish motorists hundreds every year’, Irish Examiner",
  },
  text: {
    fields: source({ type: "ONLINE_TEXT_OR_IMAGE", author: "Latin Library", title: "Principal Rhetorical and Literary Devices", url: "http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf", dateAccessed: "2024-06-17" }),
    inText: "(thelatinlibrary.com/101/RhetoricalDevices)",
    reference: "Latin Library, Principal Rhetorical and Literary Devices, (date written not available), http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf, Date accessed: 17/6/24",
  },
  audio: {
    fields: source({ type: "ONLINE_AUDIO", author: "Philip Boucher Hayes", publication: "RTE", title: "Hot Mess – Megawatts and Megabytes", datePublished: "30/5/24", url: "https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/", dateAccessed: "2023-11-10", locator: "Ep. 10" }),
    inText: "(Ep. 10, rte.ie/radio/podcasts/22093250)",
    reference: "Philip Boucher Hayes, RTE, Hot Mess – Megawatts and Megabytes, Podcast, date created: 30/5/24, https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/, Date accessed: 10/11/23",
  },
  video: {
    fields: source({ type: "ONLINE_VIDEO", author: "ApintTurtle", title: "Zig & Zag – Christmas crises", datePublished: "20/12/2008", url: "http://youtu.be/yCv4iyPqZKQ", dateAccessed: "2014-12-12", locator: "3:20 to 5:45" }),
    inText: "(3:20 to 5:45, youtu.be/yCv4iyPqZKQ)",
    reference: "ApintTurtle, Zig & Zag – Christmas crises, Film, date created 20/12/2008, http://youtu.be/yCv4iyPqZKQ, 12/12/14, from 3 minutes 20 seconds to 5 minutes 45 seconds.",
  },
};

test("a book comes out exactly as the NCCA's example", () => {
  const c = citation(NCCA.book.fields);
  assert.equal(c.inText, NCCA.book.inText);
  assert.equal(c.reference, NCCA.book.reference);
  assert.deepEqual(c.missing, []);
});

test("a newspaper article: the NCCA's reference exactly; the in-text uses the surname, as the book does", () => {
  const c = citation(NCCA.newspaper.fields);
  assert.equal(c.reference, NCCA.newspaper.reference);
  assert.equal(c.inText, "(Hearne, 30/08/2024)");
  inOrder(c.inText, ["Hearne", "30/08/2024"]);
});

test("text online: the NCCA's in-text exactly; the reference keeps every detail in order", () => {
  const c = citation(NCCA.text.fields);
  assert.equal(c.inText, NCCA.text.inText);
  assert.equal(c.reference, "Latin Library, Principal Rhetorical and Literary Devices, date not available, http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf, Date accessed: 17/06/2024");
  inOrder(c.reference, ["Latin Library", "Principal Rhetorical and Literary Devices", "http://www.thelatinlibrary.com/101/RhetoricalDevices.pdf", "17/06/2024"]);
});

test("audio online keeps every detail of the NCCA's example in order", () => {
  const c = citation(NCCA.audio.fields);
  assert.equal(c.inText, "(Ep. 10, rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes)");
  inOrder(c.inText, ["Ep. 10", "rte.ie/radio/podcasts/22093250"]);
  assert.equal(c.reference, "Philip Boucher Hayes, RTE, Hot Mess – Megawatts and Megabytes, date created: 30/5/24, https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/, Date accessed: 10/11/2023, Ep. 10");
  inOrder(c.reference, ["Philip Boucher Hayes", "RTE", "Hot Mess – Megawatts and Megabytes", "30/5/24", "https://www.rte.ie/radio/podcasts/22093250-ep-10-megawatts-and-megabytes/", "10/11/2023"]);
});

test("video online: the NCCA's in-text exactly; the reference keeps every detail in order", () => {
  const c = citation(NCCA.video.fields);
  assert.equal(c.inText, NCCA.video.inText);
  assert.equal(c.reference, "ApintTurtle, Zig & Zag – Christmas crises, date created: 20/12/2008, http://youtu.be/yCv4iyPqZKQ, Date accessed: 12/12/2014, 3:20 to 5:45");
  inOrder(c.reference, ["ApintTurtle", "Zig & Zag – Christmas crises", "20/12/2008", "http://youtu.be/yCv4iyPqZKQ", "12/12/2014", "3:20 to 5:45"]);
});

test("without an author, a source leads with its title; without a date, it says so", () => {
  assert.equal(citation(source({ title: "Junior Cycle Science", locator: "ch. 3" })).reference, "Junior Cycle Science (date not available)");
  assert.equal(citation(source({ title: "Junior Cycle Science", locator: "ch. 3" })).inText, "(ch. 3, Junior Cycle Science)");
  assert.equal(citation(source({ type: "ONLINE_VIDEO", title: "Titration demo", url: "https://youtu.be/x1", dateAccessed: "2026-10-01" })).reference,
    "Titration demo, date not available, https://youtu.be/x1, Date accessed: 01/10/2026");
});

test("a print source only shows a date accessed when it has a link", () => {
  // The form sends today's date accessed for every source, so a book would otherwise always carry one.
  assert.equal(citation(source({ title: "Inclusion", author: "McLeskey, J.", datePublished: "2013", dateAccessed: "2026-10-01" })).reference,
    "McLeskey, J. (2013) Inclusion");
  assert.equal(citation(source({ type: "OTHER", title: "Annual report", author: "EPA", datePublished: "2025", url: "https://epa.ie/r.pdf", dateAccessed: "2026-10-01" })).reference,
    "EPA (2025) Annual report, https://epa.ie/r.pdf, Date accessed: 01/10/2026");
});

test("blank text counts as missing, and each type flags what the NCCA asks it for (decision S-10)", () => {
  assert.deepEqual(citation(source({ title: "Inclusion", author: "  " })).missing, ["author", "datePublished", "locator"]);
  assert.deepEqual(citation(source({ type: "NEWSPAPER_OR_MAGAZINE", title: "x" })).missing, ["author", "datePublished", "publication"]);
  assert.deepEqual(citation(source({ type: "ONLINE_TEXT_OR_IMAGE", title: "x" })).missing, ["url", "dateAccessed"]);
  assert.deepEqual(citation(source({ type: "ONLINE_AUDIO", title: "x", url: "https://a.ie", dateAccessed: "2026-10-01" })).missing, ["locator"]);
  assert.deepEqual(citation(source({ type: "ONLINE_VIDEO", title: "x" })).missing, ["url", "dateAccessed", "locator"]);
  assert.deepEqual(citation(source({ type: "OTHER", title: "x" })).missing, ["author", "datePublished"]);
});

test("the missing line names each detail in plain words", () => {
  assert.equal(missingLine([]), null);
  assert.equal(missingLine(["locator"]), "Add the page, chapter or timestamp you used so a reader can check this source.");
  assert.equal(missingLine(["author", "datePublished"]), "Add the author and the date published so a reader can check this source.");
  assert.equal(missingLine(["url", "dateAccessed", "locator"]), "Add the link, the date accessed and the page, chapter or timestamp you used so a reader can check this source.");
});

test("the list is alphabetical by reference, ignoring case and a leading quote mark (decision S-7)", () => {
  const list = referenceList([
    { id: "z", fields: source({ title: "Zebra", author: "zed, A." }) },
    { id: "q", fields: source({ type: "NEWSPAPER_OR_MAGAZINE", title: "Apples" }) },
    { id: "b", fields: source({ title: "Bees", author: "Byrne, A." }) },
  ]);
  assert.deepEqual(list.map((s) => s.id), ["q", "b", "z"]);
  assert.equal(copyText(list), "‘Apples’ (date not available)\nByrne, A. (date not available) Bees\nzed, A. (date not available) Zebra");
});

test("the form's values become fields for the preview; no title, no preview", () => {
  assert.equal(sourceFromForm({ type: "BOOK", title: "  " }), null);
  assert.deepEqual(sourceFromForm({ type: "ONLINE_VIDEO", title: " Demo ", url: "https://youtu.be/x", dateAccessed: "2026-10-01", author: "" }),
    source({ type: "ONLINE_VIDEO", title: "Demo", url: "https://youtu.be/x", dateAccessed: "2026-10-01" }));
});
