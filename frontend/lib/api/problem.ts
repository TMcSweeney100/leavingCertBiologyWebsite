import { z } from "zod";

/** One invalid field, matching the backend's `fieldErrors` entries. */
export interface FieldProblem {
  field: string;
  message: string;
}

/**
 * The RFC 9457 body Spring returns. Strict about `code` only: rejecting a response over an extra
 * member would turn a readable error into an unreadable one at the worst moment.
 */
const problemSchema = z.object({
  code: z.string(),
  title: z.string().optional(),
  detail: z.string().optional(),
  status: z.number().optional(),
  fieldErrors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});

/**
 * Codes the frontend branches on. Only codes that change behaviour belong here; the full list is
 * the backend's `ErrorCode` enum, and anything unlisted still arrives on `ApiError.code`.
 */
export const ApiErrorCode = {
  RESPONSE_SHAPE_UNEXPECTED: "RESPONSE_SHAPE_UNEXPECTED",
  BACKEND_UNREACHABLE: "BACKEND_UNREACHABLE",
  UNEXPECTED_RESPONSE: "UNEXPECTED_RESPONSE",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  CSRF_TOKEN_INVALID: "CSRF_TOKEN_INVALID",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
} as const;

/** Every failure the API client raises, whatever caused it. Components catch one type. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly fieldErrors: FieldProblem[];

  constructor(init: {
    code: string;
    status: number;
    title?: string;
    detail?: string;
    fieldErrors?: FieldProblem[];
    cause?: unknown;
  }) {
    super(init.detail ?? init.title ?? init.code, { cause: init.cause });
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.title = init.title ?? init.code;
    this.detail = init.detail ?? "";
    this.fieldErrors = init.fieldErrors ?? [];
  }

  static fromResponseBody(status: number, body: unknown): ApiError {
    const parsed = problemSchema.safeParse(body);
    if (!parsed.success) {
      return new ApiError({
        code: ApiErrorCode.UNEXPECTED_RESPONSE,
        status,
        title: "Unexpected response",
        detail: "Something went wrong. Please try again.",
      });
    }
    return new ApiError({ ...parsed.data, status: parsed.data.status ?? status });
  }

  static unreachable(cause: unknown): ApiError {
    return new ApiError({
      code: ApiErrorCode.BACKEND_UNREACHABLE,
      status: 0,
      title: "Can't reach the service",
      detail: "Check your connection and try again.",
      cause,
    });
  }

  static badShape(path: string, cause: unknown): ApiError {
    return new ApiError({
      code: ApiErrorCode.RESPONSE_SHAPE_UNEXPECTED,
      status: 0,
      title: "Unexpected response",
      detail: `The response from ${path} wasn't what this version of the app expects.`,
      cause,
    });
  }
}
