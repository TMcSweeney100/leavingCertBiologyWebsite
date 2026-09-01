import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { countdownText, deriveSchedule, formatTodayLabel } from "@/lib/schedule";
import { HEADER, SEC_DEADLINE, POST_TERM } from "@/lib/schedule.data";

/**
 * The link-preview card (plan §5, Phase 9) — what WhatsApp, Teams, Slack and
 * iMessage show when someone pastes the link, which for this audience is how
 * most people will meet the site.
 *
 * It states the same thing the page's top does: what this is, where the class
 * is now, and how long is left. Rendered per request (`force-dynamic`) so the
 * stage line is true when the card is generated.
 *
 * **Known and accepted** (the plan flags it): WhatsApp and Teams cache link
 * previews hard, so a card someone sees may have been generated days ago and
 * name a stage the class has since moved past. The title and the SEC deadline
 * are always right; only the stage line can lag. If that ever becomes a real
 * complaint, delete the stage line and the card becomes fully static — no
 * other change needed.
 *
 * Colours are hex, not the `--bipi-*` tokens: this renders through Satori,
 * which has no CSS custom properties and no `oklch()`. Each value below is
 * the exact hex the corresponding token documents in `globals.css` — if the
 * palette moves, these move with it by hand.
 *
 * Type comes from the two `.ttf` files in `assets/fonts/` (see the README
 * there): Satori needs a font buffer and does not read `next/font`, which is
 * how every other piece of type on the site is loaded.
 */
export const alt = "BiPi Schedule Hub — the class schedule for the Biology in Practice Investigation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The card reads the clock (through `deriveSchedule`), so it must not be
// baked at build time — a statically generated card would name whichever
// stage was current on the day of the deploy, forever.
export const dynamic = "force-dynamic";

const INK = "#141A23"; // --bipi-ink
const INK_2 = "#333842"; // --bipi-ink-2
const MUTED = "#656B74"; // --bipi-muted
const BORDER = "#DDE0E5"; // --bipi-border
const NOW = "#4662B9"; // --bipi-now
const BG = "#F4F6FA"; // --bipi-bg

const font = (file: string) => readFile(join(process.cwd(), "assets", "fonts", file));

export default async function OpengraphImage() {
  const schedule = deriveSchedule();
  const [grotesk, mono] = await Promise.all([
    font("SpaceGrotesk-Bold.ttf"),
    font("SpaceMono-Bold.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "64px 72px",
          fontFamily: "Space Grotesk",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Space Mono",
              fontSize: 24,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {HEADER.eyebrow}
          </div>
          <div style={{ marginTop: 22, fontSize: 64, lineHeight: 1.06, color: INK }}>
            {HEADER.title}
          </div>
          <div style={{ marginTop: 18, fontSize: 26, lineHeight: 1.35, color: INK_2 }}>
            {HEADER.standfirst}
          </div>
        </div>

        {/* The live half. A left rule in `--bipi-now` rather than a filled
            panel: the same restraint the page keeps, where indigo marks the
            current stage and nothing else. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderLeft: `8px solid ${NOW}`,
            paddingLeft: 26,
          }}
        >
          <div style={{ fontFamily: "Space Mono", fontSize: 22, letterSpacing: 3, color: MUTED }}>
            {`AS OF ${formatTodayLabel(schedule.today).toUpperCase()}`}
          </div>
          <div style={{ marginTop: 12, fontSize: 44, color: NOW }}>
            {schedule.currentStage
              ? `${schedule.currentStage.label} · ${schedule.currentStage.title}`
              : POST_TERM[schedule.phase === 'buffer' ? 'buffer' : 'closed'].headline}
          </div>
          <div style={{ marginTop: 10, fontFamily: "Space Mono", fontSize: 28, color: INK_2 }}>
            {schedule.currentStage
              ? `${countdownText(schedule.daysLeft, schedule.isDueToday)} · due ${schedule.currentStage.shortDate}`
              : `SEC deadline · ${SEC_DEADLINE.label}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: `2px solid ${BORDER}`,
            paddingTop: 24,
            fontFamily: "Space Mono",
            fontSize: 22,
            color: MUTED,
          }}
        >
          <div>{`SEC deadline — ${SEC_DEADLINE.label}`}</div>
          <div>{HEADER.gradeChip}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: grotesk, weight: 700, style: "normal" },
        { name: "Space Mono", data: mono, weight: 700, style: "normal" },
      ],
    },
  );
}
