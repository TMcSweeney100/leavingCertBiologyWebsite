import QRCode from "qrcode";

import { hasSiteUrl, SITE_URL, SITE_URL_LABEL } from "@/lib/site";

/**
 * A QR code pointing at this page, for the classroom noticeboard (spec §6
 * "shareable single URL… optionally generate a QR code pointing at it, for
 * printing on an actual noticeboard"; plan §5's Phase 9 notes).
 *
 * Generated **at build time, on the server**, as an inline SVG string. The
 * `qrcode` package runs during rendering and never reaches the browser: no
 * client-side generation, no image request, no third-party QR service —
 * which matters here, because a QR service would be exactly the kind of
 * third-party call spec §8 forbids on a site used by minors.
 *
 * Renders nothing until `NEXT_PUBLIC_SITE_URL` is set (see `lib/site.ts`).
 * A QR code is only as useful as the URL inside it, and one pointing at a
 * placeholder is actively harmful — so the block is absent rather than
 * wrong, and appears on its own once the site is deployed.
 *
 * On screen it is laptop-only: on a phone you are already on the page, and
 * the block would be pure decoration. In print it always shows — a printed
 * copy with a scannable link back to the live, dated page is the whole
 * point of the exercise.
 *
 * The printed URL under the code is not redundant: it is what someone types
 * when the scan fails, and it is the only part of a photocopied sheet that
 * still works when the QR is too faint to read.
 */
type QrBlockProps = {
  /** This class's page path (e.g. `/nwetss-hanlon`), appended to `SITE_URL`. */
  path: string;
};

export async function QrBlock({ path }: QrBlockProps) {
  if (!hasSiteUrl) return null;

  // `margin: 0` because the surrounding padding already provides the quiet
  // zone; `errorCorrectionLevel: 'M'` is the standard trade-off and keeps
  // the module count low enough to stay scannable at ~96px on a printout.
  // The light half is fully transparent so the footer's ink background
  // shows through as the quiet zone.
  const svg = await QRCode.toString(`${SITE_URL}${path}`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#ffffff", light: "#00000000" },
  });

  // The modules have to be white in the dark footer and black on paper,
  // and the print stylesheet drops the footer's background. `qrcode` only
  // accepts hex, so the emitted `stroke` is swapped for `currentColor` and
  // the colour then comes from the wrapper — one generated SVG, both
  // media. (Anchored to the exact string the generator writes; if a future
  // version of `qrcode` changes its output, the swap no-ops and the code
  // renders white — visible on screen, invisible on paper.)
  const themedSvg = svg.replaceAll('stroke="#ffffff"', 'stroke="currentColor"');

  return (
    <div className="hidden items-center gap-3.5 lg:flex print:flex">
      {/* The SVG is generated here, from our own constant, and contains no
          interpolated user input — there is nothing for `dangerouslySet…`
          to be dangerous with. Sized by the wrapper rather than by the SVG,
          which qrcode emits without width/height. */}
      <div
        aria-hidden="true"
        className="size-16 flex-none text-white [&>svg]:size-full print:size-20 print:text-black"
        dangerouslySetInnerHTML={{ __html: themedSvg }}
      />
      <p className="font-mono text-label leading-[1.5] text-(--bipi-on-dark-meta)">
        Scan to open on your phone
        <span className="mt-0.5 block text-white">{`${SITE_URL_LABEL}${path}`}</span>
      </p>
    </div>
  );
}
