import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClassDetail } from "@/lib/api/schemas";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn(), sendNoContent: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { ClassStudents } from "./class-students";

const detail: ClassDetail = {
  id: "c1", name: "6A Biology", subjectCode: "BIOLOGY", subjectName: "Biology", yearGroup: 6, academicYear: "2026/27", level: "HIGHER",
  joinCode: { code: "ABCDEFGH", expiresAt: "2026-10-15T09:00:00.000Z" },
  enrolments: [
    { enrolmentId: "e1", studentId: "s1", firstName: "Cian", lastName: "Murphy", username: "cian.m", status: "PENDING", requestedAt: "2026-10-01T09:00:00Z" },
    { enrolmentId: "e2", studentId: "s2", firstName: "Aoife", lastName: "Byrne", username: "aoife.b", status: "APPROVED", requestedAt: "2026-09-30T09:00:00Z" },
  ],
};

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
  vi.mocked(api.sendNoContent).mockReset();
});

describe("ClassStudents", () => {
  it("shows the code with its expiry, and the two lists", () => {
    render(<ClassStudents detail={detail} />);
    expect(screen.getByRole("heading", { name: "6A Biology" })).toBeInTheDocument();
    expect(screen.getByText("ABCDEFGH")).toBeInTheDocument();
    expect(screen.getByText(/expires/i)).toHaveTextContent("15 Oct 2026");
    const pending = screen.getByRole("region", { name: "Pending requests" });
    expect(within(pending).getByText(/Cian Murphy/)).toBeInTheDocument();
    const approved = screen.getByRole("region", { name: "Students" });
    expect(within(approved).getByText(/Aoife Byrne/)).toBeInTheDocument();
  });

  it("approves and declines pending requests, then refreshes", async () => {
    vi.mocked(api.send).mockResolvedValue({ enrolmentId: "e1", classId: "c1", className: "6A", subjectName: "Biology", schoolName: "S", status: "APPROVED" });
    render(<ClassStudents detail={detail} />);
    const pending = screen.getByRole("region", { name: "Pending requests" });

    await userEvent.click(within(pending).getByRole("button", { name: "Approve Cian Murphy" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/enrolments/e1/approve", undefined, expect.anything());
    expect(refresh).toHaveBeenCalled();

    await userEvent.click(within(pending).getByRole("button", { name: "Decline Cian Murphy" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/enrolments/e1/remove", undefined, expect.anything());
  });

  it("removes an approved student after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.send).mockResolvedValue({ enrolmentId: "e2", classId: "c1", className: "6A", subjectName: "Biology", schoolName: "S", status: "REMOVED" });
    render(<ClassStudents detail={detail} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Aoife Byrne" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/enrolments/e2/remove", undefined, expect.anything());
  });

  it("issues a reset code and shows it once with its expiry", async () => {
    vi.mocked(api.send).mockResolvedValue({ code: "RSTCDEXY", expiresAt: "2026-10-02T09:00:00.000Z" });
    render(<ClassStudents detail={detail} />);

    await userEvent.click(screen.getByRole("button", { name: "Issue reset code for Aoife Byrne" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/students/s2/reset-codes", undefined, expect.anything());
    const shown = screen.getByRole("status");
    expect(shown).toHaveTextContent("RSTCDEXY");
    expect(shown).toHaveTextContent(/24 hours|2 Oct 2026/);
  });

  it("rotates the code and turns joining off", async () => {
    vi.mocked(api.send).mockResolvedValue({ code: "NEWCODE2", expiresAt: "2026-10-29T09:00:00.000Z" });
    vi.mocked(api.sendNoContent).mockResolvedValue(undefined);
    render(<ClassStudents detail={detail} />);

    await userEvent.click(screen.getByRole("button", { name: "New code" }));
    expect(api.send).toHaveBeenCalledWith("POST", "/classes/c1/join-code", undefined, expect.anything());
    expect(refresh).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Turn joining off" }));
    expect(api.sendNoContent).toHaveBeenCalledWith("DELETE", "/classes/c1/join-code");
  });

  it("explains a class with no code and no students", () => {
    render(<ClassStudents detail={{ ...detail, joinCode: null, enrolments: [] }} />);
    expect(screen.getByText(/joining is off/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turn joining off" })).not.toBeInTheDocument();
    expect(screen.getByText(/no students yet/i)).toBeInTheDocument();
  });
});
