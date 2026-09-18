import Link from "next/link";

const TAB = "-mb-px border-b-2 px-0.5 py-2.5 text-app-base font-semibold whitespace-nowrap";

/** Roadmap §6.1: inside a component, Overview · Log (P3) · Sources · AI use · Word checker (P6). */
export function ComponentTabs({ componentId }: { componentId: string }) {
  return (
    <nav aria-label="Component sections" className="mt-5 flex gap-6 overflow-x-auto border-b border-app-line">
      <Link href={`/components/${componentId}`} aria-current="page" className={`${TAB} border-app-accent text-app-accent`}>
        Overview
      </Link>
      {["Log", "Sources", "AI use", "Word checker"].map((tab) => (
        <span key={tab} aria-disabled="true" className={`${TAB} cursor-not-allowed border-transparent text-app-disabled`}>
          {tab}
        </span>
      ))}
    </nav>
  );
}
