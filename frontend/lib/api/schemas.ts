import { z } from "zod";

// Mirrors identity/adapter/web/MeResponse.java.
export const roleSchema = z.enum(["STUDENT", "TEACHER", "SCHOOL_LEADER"]);
export const meSchema = z.object({
  userId: z.string(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  mustChangePassword: z.boolean(),
  // schoolShortName is what the app header shows; null until the operator sets one.
  roles: z.array(
    z.object({ schoolId: z.string(), schoolName: z.string(), schoolShortName: z.string().nullable(), role: roleSchema }),
  ),
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
  componentId: z.string().nullable(),
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

// Mirrors components/application/ComponentViews.java.
export const briefSummarySchema = z.object({
  id: z.string(),
  subjectCode: z.string(),
  examYear: z.number(),
  secCode: z.string(),
  title: z.string(),
  topicTitle: z.string().nullable(),
  completionDate: z.string(),
});
export type BriefSummary = z.infer<typeof briefSummarySchema>;

export const teacherItemSchema = z.object({ id: z.string(), text: z.string(), dueDate: z.string().nullable() });
export type TeacherItem = z.infer<typeof teacherItemSchema>;

export const setupStageSchema = z.object({
  id: z.string(),
  ordinal: z.number(),
  label: z.string().nullable(),
  name: z.string(),
  hoursMin: z.number().nullable(),
  hoursMax: z.number().nullable(),
  hoursGroup: z.string().nullable(),
  supervised: z.boolean(),
  checkpoint: z.string().nullable(),
  dueDate: z.string().nullable(),
  items: z.array(teacherItemSchema),
});
export type SetupStage = z.infer<typeof setupStageSchema>;

export const dateWarningSchema = z.object({
  code: z.enum(["OUT_OF_ORDER", "AFTER_COMPLETION_DATE"]),
  stageIds: z.array(z.string()),
  itemIds: z.array(z.string()),
});
export type DateWarning = z.infer<typeof dateWarningSchema>;

export const teacherComponentSchema = z.object({
  view: z.literal("TEACHER"),
  id: z.string(),
  classId: z.string(),
  className: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  brief: briefSummarySchema,
  stages: z.array(setupStageSchema),
  warnings: z.array(dateWarningSchema),
});
export type TeacherComponent = z.infer<typeof teacherComponentSchema>;

// Mirrors ComponentViews.StudentComponent (plan 2E).
export const checkpointStateSchema = z.enum(["NOT_DUE", "DUE"]);
export const studentStageSchema = z.object({
  id: z.string(),
  ordinal: z.number(),
  label: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  hoursMin: z.number().nullable(),
  hoursMax: z.number().nullable(),
  hoursGroup: z.string().nullable(),
  supervised: z.boolean(),
  dueDate: z.string().nullable(),
  checkpoint: z.object({ text: z.string(), state: checkpointStateSchema }).nullable(),
  items: z.array(z.object({ id: z.string(), text: z.string(), dueDate: z.string().nullable(), done: z.boolean() })),
  prompts: z.array(z.object({ heading: z.string().nullable(), text: z.string() })),
});
export type StudentStage = z.infer<typeof studentStageSchema>;

export const studentComponentSchema = z.object({
  view: z.literal("STUDENT"),
  id: z.string(),
  className: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  weightingPercent: z.number(),
  marksTotal: z.number(),
  brief: z.object({
    examYear: z.number(),
    secCode: z.string(),
    title: z.string(),
    topicTitle: z.string().nullable(),
    topicBody: z.string(),
    completionDate: z.string(),
    wordLimit: z.number(),
    wordsNotCounted: z.string(),
    imageLimit: z.number(),
    imageNote: z.string().nullable(),
    rules: z.array(z.object({ key: z.string(), value: z.string() })),
  }),
  processNote: z.string(),
  today: z.string(),
  stages: z.array(studentStageSchema),
  sections: z.array(z.object({
    label: z.string(), name: z.string(), suggestedWords: z.number().nullable(),
    indicativeContent: z.array(z.string()), stageIds: z.array(z.string()),
  })),
  markBands: z.array(z.object({
    label: z.string().nullable(), name: z.string().nullable(), marks: z.number(), wholeReport: z.boolean(),
    criteria: z.array(z.string()), sectionLabels: z.array(z.string()),
  })),
});
export type StudentComponent = z.infer<typeof studentComponentSchema>;

export const componentViewSchema = z.discriminatedUnion("view", [teacherComponentSchema, studentComponentSchema]);

export const studentItemSchema = z.object({ id: z.string(), text: z.string(), dueDate: z.string().nullable(), done: z.boolean() });

export const myComponentSchema = z.object({
  componentId: z.string(),
  className: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  briefTitle: z.string(),
  completionDate: z.string(),
});
export type MyComponent = z.infer<typeof myComponentSchema>;
