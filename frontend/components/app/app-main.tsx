import type { ReactNode } from "react";

// Content column widths from pack D-2, plus the side gutters (16px phone, 28px laptop).
const WIDTHS = {
  form: "max-w-[616px]",
  list: "max-w-[916px]",
  class: "max-w-[936px]",
} as const;

/** The `<main>` of every signed-in page; the layout's skip link targets it. */
export function AppMain({ width = "list", children }: { width?: keyof typeof WIDTHS; children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className={`mx-auto w-full ${WIDTHS[width]} px-4 pt-6 pb-14 outline-none lg:px-7 lg:pt-9`}>
      {children}
    </main>
  );
}
