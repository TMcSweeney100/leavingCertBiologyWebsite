import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/problem";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const problem = await import("@/lib/api/problem");
  return { ...problem, api: { send: vi.fn() } };
});

import { api } from "@/lib/api/client";

import { CreateClassForm } from "./create-class-form";

const subjects = [{ code: "BIOLOGY", name: "Biology" }, { code: "CHEMISTRY", name: "Chemistry" }];
const detail = { id: "c9", name: "5th Chem", subjectCode: "CHEMISTRY", subjectName: "Chemistry", yearGroup: 5, academicYear: "2026/27", level: null, joinCode: { code: "ABCDEFGH", expiresAt: "2026-10-15T09:00:00Z" }, enrolments: [] };

beforeEach(() => {
  push.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("CreateClassForm", () => {
  it("creates the class and opens it", async () => {
    vi.mocked(api.send).mockResolvedValue(detail);
    render(<CreateClassForm schoolId="s1" subjects={subjects} defaultAcademicYear="2026/27" />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Subject" }), "CHEMISTRY");
    await userEvent.type(screen.getByRole("textbox", { name: "Class name" }), "5th Chem");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Year group" }), "5");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/classes",
      { schoolId: "s1", subjectCode: "CHEMISTRY", name: "5th Chem", yearGroup: 5, academicYear: "2026/27", level: null }, expect.anything());
    expect(push).toHaveBeenCalledWith("/teach/classes/c9");
  });

  it("lists the field errors the API returns", async () => {
    vi.mocked(api.send).mockRejectedValue(new ApiError({
      code: "VALIDATION_FAILED", status: 400, detail: "One or more fields are invalid.",
      fieldErrors: [{ field: "academicYear", message: "must look like 2026/27" }],
    }));
    render(<CreateClassForm schoolId="s1" subjects={subjects} defaultAcademicYear="2026/27" />);

    await userEvent.type(screen.getByRole("textbox", { name: "Class name" }), "6A");
    await userEvent.clear(screen.getByRole("textbox", { name: "Academic year" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Academic year" }), "2026-27");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("alert")).toHaveTextContent("academicYear: must look like 2026/27");
  });
});
