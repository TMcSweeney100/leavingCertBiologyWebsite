"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { classDetailSchema, type Subject } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";

/** Roadmap §6.2 `/teach/classes/new`: subject, name, year group, academic year, level optional. */
export function CreateClassForm({
  schoolId,
  subjects,
  defaultAcademicYear,
}: {
  schoolId: string;
  subjects: Subject[];
  defaultAcademicYear: string;
}) {
  const router = useRouter();
  const [subjectCode, setSubjectCode] = useState(subjects[0]?.code ?? "");
  const [name, setName] = useState("");
  const [yearGroup, setYearGroup] = useState("6");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
  const [level, setLevel] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.send(
        "POST",
        "/classes",
        { schoolId, subjectCode, name, yearGroup: Number(yearGroup), academicYear, level: level || null },
        classDetailSchema,
      );
      router.push(`/teach/classes/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby="new-class-heading">
      <h1 id="new-class-heading">Create a class</h1>
      {error && <ErrorPanel error={error} />}
      <label>
        Subject
        <select value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} required>
          {subjects.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Class name
        <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Year group
        <select value={yearGroup} onChange={(e) => setYearGroup(e.target.value)}>
          <option value="5">5th year</option>
          <option value="6">6th year</option>
        </select>
      </label>
      <label>
        Academic year
        <input required value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
      </label>
      <label>
        Level (optional)
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Not set</option>
          <option value="HIGHER">Higher</option>
          <option value="ORDINARY">Ordinary</option>
          <option value="MIXED">Mixed</option>
        </select>
      </label>
      <Button type="submit" disabled={busy}>
        Create
      </Button>
    </form>
  );
}
