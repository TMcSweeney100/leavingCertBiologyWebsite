/**
 * Class strings shared by app pages (design packs D-1, D-2). Plain strings, not `cn()`, because they
 * pair `--text-app-*` sizes with colours and tailwind-merge would drop one (UI-STANDARDS §2).
 */
export const pageTitle =
  "font-heading text-app-h1 lg:text-app-h1-lg font-bold leading-[1.07] tracking-[-.03em] text-balance text-app-ink";
export const sectionTitle = "font-heading text-app-section font-bold tracking-[-.02em] text-balance text-app-ink";
export const lead = "text-app-base leading-normal text-app-copy text-pretty";
export const textLink =
  "text-app-accent underline decoration-app-accent/35 decoration-1 underline-offset-[3px] transition-colors hover:text-app-accent-hover hover:decoration-current touch-manipulation";
/** Used by `BackLink`, which adds the chevron. No underline: the chevron and its place above the title mark it. */
export const backLink =
  "group -ml-1.5 inline-flex min-h-6 items-center gap-1 rounded-app-control px-1.5 py-1 text-app-meta font-medium text-app-grey transition-colors hover:bg-app-inset hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent touch-manipulation";
export const eyebrow = "font-mono text-app-label font-bold uppercase tracking-[.1em]";
export const card = "rounded-app-card border border-app-field-border bg-app-surface";
