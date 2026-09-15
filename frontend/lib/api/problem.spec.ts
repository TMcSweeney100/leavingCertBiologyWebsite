import { describe, expect, it } from "vitest";

import { ApiError, ApiErrorCode } from "./problem";

describe("ApiError.fromResponseBody", () => {
  it("reads a problem body", () => {
    const error = ApiError.fromResponseBody(400, {
      code: "VALIDATION_FAILED",
      title: "Validation failed",
      detail: "One or more fields are invalid.",
      status: 400,
      fieldErrors: [{ field: "username", message: "is taken" }],
    });

    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.status).toBe(400);
    expect(error.detail).toBe("One or more fields are invalid.");
    expect(error.fieldErrors).toEqual([{ field: "username", message: "is taken" }]);
  });

  it("tolerates members it doesn't know", () => {
    expect(ApiError.fromResponseBody(409, { code: "X", extra: 1 }).code).toBe("X");
  });

  it("falls back when the body isn't a problem", () => {
    const error = ApiError.fromResponseBody(502, "<html>Bad gateway</html>");
    expect(error.code).toBe(ApiErrorCode.UNEXPECTED_RESPONSE);
    expect(error.status).toBe(502);
    expect(error.fieldErrors).toEqual([]);
  });
});
