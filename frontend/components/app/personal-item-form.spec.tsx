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

import { AddPersonalItem } from "./personal-item-form";

const classes = [{ classId: "c1", className: "6A Biology", subjectName: "Biology" }];

beforeEach(() => {
  refresh.mockReset();
  vi.mocked(api.send).mockReset();
});

describe("AddPersonalItem", () => {
  it("opens a form that says only the student can see it, and adds the item", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "p1", title: "Irish oral mock", dueDate: "2026-10-14", kind: "TEST", classId: null, subjectName: null });
    render(<AddPersonalItem classes={classes} />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item" }));

    expect(screen.getByText("Only you can see this. Your teachers can't.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Irish oral mock");
    await userEvent.type(screen.getByLabelText("Date"), "2026-10-14");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Kind" }), "TEST");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(api.send).toHaveBeenCalledWith("POST", "/me/personal-items",
      { title: "Irish oral mock", dueDate: "2026-10-14", kind: "TEST", classId: null }, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it("can label the item with one of the student's classes", async () => {
    vi.mocked(api.send).mockResolvedValue({ id: "p1", title: "x", dueDate: "2026-10-23", kind: "TEST", classId: "c1", subjectName: "Biology" });
    render(<AddPersonalItem classes={classes} />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), "Biology class test");
    await userEvent.type(screen.getByLabelText("Date"), "2026-10-23");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Class (optional)" }), "c1");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));

    expect(vi.mocked(api.send).mock.calls[0][2]).toMatchObject({ classId: "c1" });
  });

  it("Cancel closes the form without saving", async () => {
    render(<AddPersonalItem classes={classes} />);
    await userEvent.click(screen.getByRole("button", { name: "Add my own item" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox", { name: "Title" })).not.toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
  });
});
