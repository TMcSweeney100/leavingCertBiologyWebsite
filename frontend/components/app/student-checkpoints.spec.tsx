import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { StudentCheckpoints } from "./student-checkpoints";

const INITIAL = "Initial ideas discussed with the teacher";
const LOG = "Investigative log shared with the teacher";
const data = {
  studentId: "s1", firstName: "Cian", lastName: "Murphy", today: "2026-12-14", behindBy: 1,
  lastLogActivityOn: "2026-11-30", daysSinceLastLogActivity: 14,
  stages: [
    { stageId: "a", ordinal: 1, label: "Stage 1", name: "Initial Response", dueDate: "2026-10-02", checkpoint: { id: "c1", text: INITIAL },
      state: "SIGNED_OFF" as const, signedOffOn: "2026-10-06",
      history: [{ signedOffOn: "2026-10-03", revokedOn: "2026-10-04", revokedBy: "Katelyn Hanlon" }] },
    { stageId: "b", ordinal: 2, label: "Stage 2", name: "Background Research", dueDate: "2026-11-06", checkpoint: { id: "c2", text: LOG },
      state: "DUE" as const, signedOffOn: null, history: [] },
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
});
