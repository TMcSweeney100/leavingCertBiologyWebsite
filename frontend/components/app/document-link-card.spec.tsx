import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/api/client", async (orig) => ({ ...(await orig<typeof import("@/lib/api/client")>()), api: { send: (...a: unknown[]) => send(...a) } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { DocumentLinkCard } from "./document-link-card";

describe("DocumentLinkCard (FR-38–40)", () => {
  beforeEach(() => { send.mockReset(); refresh.mockReset(); });

  it("asks for a link when there is none, and says when the class requires it", () => {
    render(<DocumentLinkCard componentId="c1" link={null} requireLink />);
    expect(screen.getByRole("heading", { name: "Your work" })).toBeInTheDocument();
    expect(screen.getByText(/Your teacher asks for this link before you can ask for a sign-off/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Link to your work" })).toBeInTheDocument();
  });

  it("shows the current link, opening in a new tab, and quotes the brief on backups", () => {
    render(<DocumentLinkCard componentId="c1" link={{ url: "https://docs.google.com/d/a", setOn: "2027-03-03" }} requireLink={false} />);
    const a = screen.getByRole("link", { name: "Open your work (opens in a new tab)" });
    expect(a).toHaveAttribute("href", "https://docs.google.com/d/a");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/It is strongly recommended that you make and regularly update a backup copy/)).toBeInTheDocument();
  });

  it("saves a new link and refreshes", async () => {
    send.mockResolvedValue({ url: "https://docs.google.com/d/b", setOn: "2027-03-04" });
    render(<DocumentLinkCard componentId="c1" link={{ url: "https://docs.google.com/d/a", setOn: "2027-03-03" }} requireLink={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Change link" }));
    const box = screen.getByRole("textbox", { name: "Link to your work" });
    await userEvent.clear(box);
    await userEvent.type(box, "https://docs.google.com/d/b");
    await userEvent.click(screen.getByRole("button", { name: "Save link" }));
    expect(send).toHaveBeenCalledWith("PUT", "/components/c1/document-link", { url: "https://docs.google.com/d/b" }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the server's refusal at the field, and moves focus to it", async () => {
    const { ApiError } = await import("@/lib/api/problem");
    send.mockRejectedValue(new ApiError({ code: "VALIDATION_FAILED", status: 400, detail: "That isn't an https link.",
      fieldErrors: [{ field: "url", message: "must be a link starting https://" }] }));
    render(<DocumentLinkCard componentId="c1" link={null} requireLink={false} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Link to your work" }), "http://x.ie");
    await userEvent.click(screen.getByRole("button", { name: "Save link" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/https/);
    expect(alert).toHaveFocus();
  });
});
