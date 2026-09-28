import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LogHistory } from "./log-history";

describe("LogHistory", () => {
  it("lists every revision newest first with its date, and renders a link safely", () => {
    render(<LogHistory history={[
      { number: 2, body: null, createdAt: "2026-10-13T08:00:00Z",
        fields: { type: "ONLINE_VIDEO", title: "Zig & Zag", author: null, publication: null, datePublished: null, url: "https://youtu.be/yCv4iyPqZKQ", dateAccessed: "2024-12-12", locator: "3:20 to 5:45", keyInformation: null, relevance: null, reflections: null } },
      { number: 1, body: "first go", createdAt: "2026-10-12T08:00:00Z", fields: null },
    ]} />);
    const rows = within(screen.getByRole("list", { name: "Revisions" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Revision 2");
    expect(rows[0]).toHaveTextContent("13 Oct 2026");
    expect(rows[0]).toHaveTextContent("Current");
    expect(rows[0]).toHaveTextContent("Shown above");
    expect(rows[1]).toHaveTextContent("Revision 1");
    expect(rows[1]).toHaveTextContent("12 Oct 2026");
    expect(rows[1]).toHaveTextContent("Created");
    expect(within(rows[1]).getByText("Show revision 1")).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("first go");
    expect(within(rows[0]).queryByText(/Show revision/)).not.toBeInTheDocument();
  });

  it("shows a link as its host with the full address under it, opened safely", () => {
    render(<LogHistory history={[
      { number: 2, body: null, createdAt: "2026-10-13T08:00:00Z", fields: null },
      { number: 1, body: null, createdAt: "2026-10-12T08:00:00Z",
        fields: { type: "ONLINE_VIDEO", title: "Zig & Zag", author: null, publication: null, datePublished: null, url: "https://www.youtu.be/yCv4iyPqZKQ", dateAccessed: "2024-12-12", locator: null, keyInformation: null, relevance: null, reflections: null } },
    ]} />);
    const link = screen.getByRole("link", { name: /youtu\.be/ });
    expect(link).toHaveTextContent("https://www.youtu.be/yCv4iyPqZKQ");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).not.toHaveAttribute("target");
  });
});
