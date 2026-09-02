import Link from "next/link";

/**
 * The real 404 (Step 4): an unknown `/[class]` slug hits `notFound()` in
 * `app/[class]/page.tsx`, which renders this. No data imports — a class
 * that doesn't resolve is exactly the case this page has to handle without
 * one.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-background px-4.5 py-16 text-center">
      <p className="font-mono text-eyebrow font-bold tracking-[.14em] text-muted-foreground uppercase">
        404
      </p>
      <h1 className="font-heading text-panel-title-lg font-bold tracking-[-.02em] text-foreground">
        No class schedule here
      </h1>
      <p className="max-w-[420px] font-sans text-body leading-[1.5] text-muted-foreground">
        That link doesn&rsquo;t match a class this site knows about.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center rounded-full bg-(--bipi-now) px-4 py-2 font-mono text-pill font-bold tracking-[.06em] text-white uppercase"
      >
        Go to the schedule
      </Link>
    </main>
  );
}
