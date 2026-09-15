import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without globals, RTL doesn't unmount between tests, and a left-over tree makes the next
// test's queries ambiguous.
afterEach(() => {
  cleanup();
});
