import Link from "next/link";

const TAB = "-mb-px border-b-2 px-0.5 py-2.5 text-app-base font-semibold whitespace-nowrap";
const ON = `${TAB} border-app-accent text-app-accent`;
const OFF = `${TAB} border-transparent text-app-grey hover:text-app-ink`;

/** Roadmap §6.1: inside a component, Overview · Log (P3) · Sources · AI use · Word checker (P6). */
export function ComponentTabs({ componentId, current }: { componentId: string; current: "overview" | "log" }) {
  const tabs = [
    { key: "overview", label: "Overview", href: `/components/${componentId}` },
    { key: "log", label: "Log", href: `/components/${componentId}/log` },
  ] as const;
  return (
    <nav aria-label="Component sections" className="mt-5 flex gap-6 overflow-x-auto border-b border-app-line">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={current === t.key ? "page" : undefined} className={current === t.key ? ON : OFF}>
          {t.label}
        </Link>
      ))}
      {["Sources", "AI use", "Word checker"].map((tab) => (
        <span key={tab} aria-disabled="true" className={`${TAB} cursor-not-allowed border-transparent text-app-disabled`}>
          {tab}
        </span>
      ))}
    </nav>
  );
}
