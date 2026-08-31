import { QrBlock } from "@/components/bipi/qr-block";
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
      {/* The disclaimer and the noticeboard QR share the footer's right-hand
          column. `QrBlock` renders nothing at all until NEXT_PUBLIC_SITE_URL
          is set (see lib/site.ts), so this column is just the disclaimer
          until the site has a real address. */}
      <div className="grid gap-3.5 lg:justify-items-end">
        <p className="font-mono text-label leading-[1.5] text-[var(--bipi-on-dark-meta)] lg:text-right">
          {SEC_DEADLINE.disclaimer}
        </p>
        <QrBlock />
      </div>
    </footer>
  );
}
