"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { classDetailSchema, type Subject } from "@/lib/api/schemas";

import { ErrorPanel } from "./error-panel";
import { Field, FieldGroup } from "./field";
import { backLink, pageTitle, textLink } from "./styles";

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

  // Pack D-2: each field the API refused carries its own message in its row, as well as the panel.
  const fieldError = (field: string) => error?.fieldErrors.find((f) => f.field === field)?.message;

  return (
    <form onSubmit={submit} aria-labelledby="new-class-heading">
      <Link href="/teach" className={backLink}>
        My classes
      </Link>
      <h1 id="new-class-heading" className={`mt-2.5 ${pageTitle}`}>
        Create a class
      </h1>
      {error && (
        <div className="mt-[22px]">
          <ErrorPanel error={error} />
        </div>
      )}
      <div className="mt-[22px] flex flex-col gap-4">
        <FieldGroup>
          <Field id="class-subject" label="Subject" error={fieldError("subjectCode")}>
            {(control) => (
              <select {...control} value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} required>
                {subjects.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field id="class-name" label="Class name" error={fieldError("name")}>
            {(control) => (
              <input {...control} required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            )}
          </Field>
          <Field id="class-year-group" label="Year group" error={fieldError("yearGroup")}>
            {(control) => (
              <select {...control} value={yearGroup} onChange={(e) => setYearGroup(e.target.value)}>
                <option value="5">5th year</option>
                <option value="6">6th year</option>
              </select>
            )}
          </Field>
          <Field id="class-academic-year" label="Academic year" error={fieldError("academicYear")}>
            {(control) => (
              <input {...control} required value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
            )}
          </Field>
          <Field id="class-level" label="Level (optional)" error={fieldError("level")}>
            {(control) => (
              <select {...control} value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Not set</option>
                <option value="HIGHER">Higher</option>
                <option value="ORDINARY">Ordinary</option>
                <option value="MIXED">Mixed</option>
              </select>
            )}
          </Field>
        </FieldGroup>
        <div className="flex flex-wrap items-center gap-3.5">
          <Button type="submit" size="form" disabled={busy}>
            Create
          </Button>
          <Link href="/teach" className={`text-app-base ${textLink}`}>
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
