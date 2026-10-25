import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/api/client", async (orig) => ({ ...(await orig<typeof import("@/lib/api/client")>()), api: { send: (...a: unknown[]) => send(...a) } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { RequireLinkSwitch } from "./require-link-switch";

describe("RequireLinkSwitch (ready-for-signoff R-6, R-7)", () => {
  beforeEach(() => { send.mockReset(); refresh.mockReset(); });

  it("is a switch, off by default, that saves and refreshes", async () => {
    send.mockResolvedValue({});
    render(<RequireLinkSwitch componentId="c1" requireLink={false} />);
    const sw = screen.getByRole("switch", { name: "Require a link to their work before students ask for sign-off" });
    expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    expect(send).toHaveBeenCalledWith("PUT", "/components/c1/settings", { requireLink: true }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("puts the switch back and says so when saving fails", async () => {
    send.mockRejectedValue(new Error("offline"));
    render(<RequireLinkSwitch componentId="c1" requireLink={false} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the setting.");
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("stays focusable while saving and ignores a second click", async () => {
    let finish: (v: unknown) => void = () => {};
    send.mockReturnValue(new Promise((r) => { finish = r; }));
    render(<RequireLinkSwitch componentId="c1" requireLink={false} />);
    const sw = screen.getByRole("switch");
    await userEvent.click(sw);
    expect(sw).not.toBeDisabled();
    expect(sw).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(sw);
    expect(send).toHaveBeenCalledTimes(1);
    finish({});
  });
});
