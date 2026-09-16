/**
 * Class strings shared by app pages (design packs D-1, D-2). Plain strings, not `cn()`, because they
 * pair `--text-app-*` sizes with colours and tailwind-merge would drop one (UI-STANDARDS §2).
 */
export const pageTitle =
  "font-heading text-app-h1 lg:text-app-h1-lg font-bold leading-[1.07] tracking-[-.03em] text-balance text-app-ink";
export const sectionTitle = "font-heading text-app-section font-bold tracking-[-.02em] text-balance text-app-ink";
export const lead = "text-app-base leading-normal text-app-copy text-pretty";
export const textLink =
  "text-app-accent underline underline-offset-3 hover:text-app-accent-hover touch-manipulation";
export const backLink = `text-app-meta ${textLink}`;
export const eyebrow = "font-mono text-app-label font-bold uppercase tracking-[.1em]";
export const card = "rounded-app-card border border-app-field-border bg-app-surface";
