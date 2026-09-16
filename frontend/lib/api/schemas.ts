import { z } from "zod";

// Mirrors identity/adapter/web/MeResponse.java.
export const roleSchema = z.enum(["STUDENT", "TEACHER", "SCHOOL_LEADER"]);
export const meSchema = z.object({
  userId: z.string(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  mustChangePassword: z.boolean(),
  roles: z.array(z.object({ schoolId: z.string(), schoolName: z.string(), role: roleSchema })),
});
export type Me = z.infer<typeof meSchema>;
export type Role = z.infer<typeof roleSchema>;

// Mirrors classes/application/ClassViews.java.
export const levelSchema = z.enum(["HIGHER", "ORDINARY", "MIXED"]);
export const enrolmentStatusSchema = z.enum(["PENDING", "APPROVED", "REMOVED"]);

export const joinCodeSchema = z.object({ code: z.string(), expiresAt: z.string() });

export const classSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  yearGroup: z.number(),
  academicYear: z.string(),
  level: levelSchema.nullable(),
  pendingCount: z.number(),
});
export type ClassSummary = z.infer<typeof classSummarySchema>;

export const memberSchema = z.object({
  enrolmentId: z.string(),
  studentId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  status: enrolmentStatusSchema,
  requestedAt: z.string(),
});
export type Member = z.infer<typeof memberSchema>;

export const classDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  yearGroup: z.number(),
  academicYear: z.string(),
  level: levelSchema.nullable(),
  joinCode: joinCodeSchema.nullable(),
  enrolments: z.array(memberSchema),
});
export type ClassDetail = z.infer<typeof classDetailSchema>;

export const joinPreviewSchema = z.object({ className: z.string(), subjectName: z.string(), schoolName: z.string() });
export type JoinPreview = z.infer<typeof joinPreviewSchema>;

export const enrolmentViewSchema = z.object({
  enrolmentId: z.string(),
  classId: z.string(),
  className: z.string(),
  subjectName: z.string(),
  schoolName: z.string(),
  status: enrolmentStatusSchema,
});
export type EnrolmentView = z.infer<typeof enrolmentViewSchema>;

export const resetCodeIssuedSchema = z.object({ code: z.string(), expiresAt: z.string() });

// Mirrors subjects' SubjectController response.
export const subjectSchema = z.object({ code: z.string(), name: z.string() });
export type Subject = z.infer<typeof subjectSchema>;
