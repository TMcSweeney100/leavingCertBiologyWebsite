import { SEC_DEADLINE } from "@/lib/schedule.data";

export function SiteFooter() {
  return (
    <footer className="grid gap-2 bg-[var(--bipi-ink)] p-[18px] lg:flex lg:flex-wrap lg:items-end lg:justify-between lg:gap-[30px] lg:px-10 lg:py-6">
      <div className="lg:max-w-[640px]">
        <h2 className="font-heading text-standfirst-lg font-bold leading-[1.35] text-white">
          {`SEC deadline — ${SEC_DEADLINE.label}`}
        </h2>
        <p className="mt-2 font-sans text-body leading-[1.55] text-[var(--bipi-on-dark-body)] lg:mt-[6px]">
          {SEC_DEADLINE.note}
        </p>
      </div>
      <p className="font-mono text-label leading-[1.5] text-[var(--bipi-on-dark-meta)] lg:text-right">
        {SEC_DEADLINE.disclaimer}
      </p>
    </footer>
  );
}
