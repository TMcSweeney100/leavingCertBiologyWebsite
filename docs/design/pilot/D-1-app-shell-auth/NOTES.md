# Pack D-1 — app shell, `/login`, `/account/password`, `/join`, `/join/[code]`, `/reset`

Frames: `D-1 App shell and auth.dc.html` (46 frames, every page at 390 and 1140, every state in the pack spec).
Tokens: `tokens.css` (shared with D-2).
Repo destination: `docs/design/pilot/D-1-app-shell-auth/`.

## Direction chosen

**2e "Navy"** — the layout and controls from direction 1c, the type from 1a. BiPi's own typefaces are kept (Space Grotesk display, Public Sans body, Space Mono for labels and codes); everything else is the app's own: cooler graphite neutrals, 10/8/6 radii, and one hairline-divided **field group** per form instead of separately boxed inputs. The memorable element on an auth page is that group: one white card, rows split by hairlines, and the row you are typing in tinted with a 2px navy edge — so the page has exactly one focus and no other decoration competes. Navy `#1F3A6E` sits at 11:1, close enough to ink that it reads as structure rather than noise, which is what lets a single amber message (rate limiting) or red panel (failure) be the only thing that interrupts.

Because navy is so dark, it cannot also mean "act on this". A second colour, attention amber `#A04806`, is reserved strictly for pending work — it never appears in D-1 except as the rate-limit message, and carries the pending count in D-2.

## Tokens added

| Token | Value | Measured contrast | Used for |
|---|---|---|---|
| `--app-accent` | `#1F3A6E` | 11.12:1 on white, 10.46:1 on `--app-ground` | primary buttons, links, focus ring, selected role |
| `--app-accent-hover` | `#16294E` | 14.37:1 | hover/active on the above |
| `--app-accent-tint` | `#F4F5F8` | accent on tint 10.20:1 | focused field row |
| `--app-attention` | `#A04806` | 6.13:1; white on it 6.13:1 | rate limiting, pending count (D-2) |
| `--app-attention-tint` | `#F6EDE6` | amber on tint 5.31:1 | attention message ground |
| `--app-approved` | `#0F5C3A` | 8.04:1 | "Approved", "Password set" |
| `--app-error` | `#B3251E` | 6.56:1 | error panel edge and icon, destructive |
| `--app-error-hover` | `#8E1D17` | 8.98:1 | error headings, destructive hover |
| `--app-error-tint` | `#FBF1F0` | error text on tint ≥ 7:1 | error ground |
| `--app-ink` | `#101419` | 18.48:1 | headings |
| `--app-body` | `#343A42` | 11.48:1 | body copy |
| `--app-grey` | `#4B535C` | 7.80:1 | secondary copy, unselected role |
| `--app-muted` | `#636B75` | 5.40:1 | field labels, metadata |
| `--app-line` | `#E3E6EA` | — | hairlines inside field groups, header rule |
| `--app-field-border` | `#DDE1E6` | — | field group and secondary button borders |
| `--app-inset` | `#EFF1F3` | — | role switcher track, disabled button |
| `--app-ground` | `#F7F8F9` | — | page ground behind white surfaces |
| `--app-radius-card` / `-control` / `-inner` | `10px` / `8px` / `6px` | — | cards, buttons and fields, switcher pills |

Amber was first drafted at `#B45309`; its own 10% tint measured **4.39:1**, under the floor, so it was darkened to `#A04806` (5.31:1 on the same tint).

## Per page

### App header
- **1140:** one row. Left: crest, "Leaving Cert Practical", hairline divider, "North Wicklow ETSS". Right: role switcher, divider, person's name, Change password, Sign out. **390:** two rows — crest and app name on row 1, person + Change password + Sign out on row 2; the school **name** drops (crest stays), and with more than one role the switcher becomes a third full-width segmented row with equal thirds.
- Copy: nav labels **Classes**, **School overview**, **Timeline** unchanged; switcher nav's accessible name "Switch role"; **Sign out** unchanged. On 390 the switcher's middle label is shortened to "School" to fit three equal thirds — the accessible name of the link is unchanged.
- Nothing is collapsed. The switcher is absent entirely at one role, per `APP_NAV`.
- Ordering follows the spec: mark, switcher, name, Change password, Sign out. The switcher moved to the right of the row so the identity lockup on the left stays a single unit.
- **Behaviour note:** `schoolName` on `Me.roles` is the full legal name ("North Wicklow Educate Together Secondary School", 51 characters). It does not fit a header row beside the app name and the account cluster, so the frames show a short form. See open questions.

### `/login`
- **1140:** 440px column centred on the ground, crest lockup above the heading. **390:** same column full-width at 20px gutters.
- Copy verbatim: heading "Sign in"; fields **Username**, **Password**; button **Sign in**; "Joining a class? Enter your join code." and "Forgotten your password? Use a reset code." with the second half of each sentence as the link.
- States drawn: default, wrong credentials ("Wrong username or password."), too many attempts ("Too many attempts. Try again in 12 minutes.") with **Sign in** disabled for the lockout, server unreachable (error panel in place above the form, form still usable).
- Rate limiting is amber, not red: the credentials were not necessarily wrong, and it resolves by waiting.

### `/account/password`
- **1140:** 440px column. **390:** full width. No header on either — the page is in the `(auth)` route group, which is what makes forced mode inescapable.
- Copy verbatim: heading "Change password"; **Current password**, **New password**, **Confirm new password**; button **Change password**; forced line "You signed in with a temporary password. Choose your own to continue. It needs at least 10 characters."
- Forced mode ends in a **Sign out** button and no Cancel; normal mode ends in a **Cancel** link back to the person's landing page.
- "At least 10 characters." sits under the New password row as persistent helper text rather than appearing only on failure.
- States drawn: forced, normal, new password too short, current password wrong ("Your current password isn't right.").

### `/join`
- **1140:** 440px column. **390:** full width. Join code field is set in Space Mono at 22px, uppercased on screen with `.16em` tracking, so an 8-character code can be checked at a glance.
- Copy verbatim: heading "Join a class"; field **Join code**; button **Continue**; error "That join code isn't right, or it has expired. Ask your teacher for a new one."
- Added line: "Your teacher reads an 8-character code out in class. Lowercase is fine." — new copy, flagged below.
- States drawn: default, code unknown or expired.

### `/join/[code]`
- **1140:** 460px column. **390:** full width. The class is shown first in a card with a teal subject edge — class name at display size, then "Biology · North Wicklow Educate Together Secondary School" — then the form or the button.
- Copy verbatim: "Create your account"; **First name**, **Surname**, **Username**, **Password**; helper "3 to 32 characters: letters, numbers, dots, dashes and underscores." and "At least 10 characters."; button **Create account and join**; "Already have an account? Sign in instead."; signed-in button **Join this class**; status sentences "Request sent. Waiting for your teacher to approve it." and "You're already in this class."
- Status labels "Pending approval" and "Approved" are set as mono eyebrows above those sentences, matching `STATUS_LABEL`.
- States drawn: signed out, username taken ("That username is taken."), password too short, signed in, already in class (pending), already in class (approved), code expired between steps.
- The expired state drops the form entirely and offers "Enter a different join code" — there is nothing useful to submit.

### `/reset`
- **1140:** 440px column. **390:** full width. Reset code field is mono, like the join code.
- Copy verbatim: heading "Reset your password"; line "Your teacher can give you a reset code. It works once and lasts 24 hours."; fields **Username**, **Reset code**, **New password**; button **Set new password**; error "That code isn't right, or it has expired. Ask your teacher for a new one."; success "Password set. Sign in with your new password."
- Success is not a redirect: redeeming a code does not sign anyone in, so the state ends in a **Sign in** button.
- States drawn: default, code wrong or expired, too many attempts (amber, button disabled), done.

### Shared error panel
- One block, drawn three ways in the frames: unreachable, validation with field problems, and 390. Left 4px red edge, tinted ground, red circled "!" plus the word in the heading (never colour alone), heading "Can't reach the service", sentence "Check your connection and try again in a moment.", optional field list with the field name in mono, then **Try again**.
- Appears in place at the top of the page's main content, above the form, and never replaces the form.

## Components restyled

- **Button** — `default` becomes the navy fill, `outline` a white fill with a `--app-field-border` hairline; both 48px tall on primary form actions, 40px in row actions. A destructive variant is needed for Remove (red text on white, red fill only after confirmation) — see D-2.
- **Input** — the shadcn bordered input is **replaced by a plain `<input>`** inside the field group, with the border, background and focus treatment owned by the group row. A bordered input inside a bordered card produced a double frame at every size, and the group makes the focused row readable at a glance. Labels stay real `<label for>`.
- **Card** — used for the field group and the class preview; padding 11/15 on rows, 16/18 on content cards.
- **Badge** — status eyebrows are plain mono `<p>` elements, not Badge, because they sit above a sentence rather than inline.
- **Table** — not used in D-1.
- Focus ring is a 2px `--app-accent` outline at 2px offset on every interactive element, including links.

## Motion

One moment per page: the error and status blocks fade and rise 4px on appear, 160ms on `cubic-bezier(.2,.7,.3,1)`. The focused field row's tint and edge cross-fade over the same duration. Under `prefers-reduced-motion: reduce` the duration token drops to 0ms and both simply appear. Nothing else animates — no page transitions, no button morphs.

## Open questions for Tim

1. **Short school name.** The header needs one. `Me.roles[].schoolName` is the full legal name and does not fit beside the app name and the account cluster at 1140, let alone 390. Suggest adding `schoolShortName` to the school record (pilot value "North Wicklow ETSS"); the frames assume it. Failing that, the header shows the crest only and the school name moves to each page's heading area.
2. **Product name.** Frames use "Leaving Cert Practical" as the on-screen rendering of the placeholder `leavingCertPractical`. Needs a real decision before build.
3. **New copy on `/join`** — "Your teacher reads an 8-character code out in class. Lowercase is fine." The component has no such line today. It exists because the field is mono and uppercased, which otherwise implies typing must be uppercase. Worth adding to the component; no test asserts it.
4. **Rate-limit copy is hard-coded to 12 minutes** in the spec ("Try again in 12 minutes."). If the backend returns a variable window, the sentence needs a number substituted; flagging so the string is not asserted verbatim in a test that later breaks.
5. **Password error sentences.** "Your current password isn't right." is specified. The frames also needed one for a too-short new password and used "The new password needs at least 10 characters." — invented, and worth a real string. Same for the sign-up case, where the frames use "That password is too short. Use at least 10 characters."
6. **Forced mode has no header, so there is no Change password link and no crest link out.** That is intended, but it also means a teacher in forced mode cannot reach anything else at all, including a support route. Confirm that is acceptable for the pilot.
7. **Helper text placement** moved inside the field row (under the input) rather than as a sibling `<p>` after the field, as in `sign-up-form.tsx`. Visually it belongs to the field; it changes the DOM order slightly. No accessible name changes, but worth wiring with `aria-describedby`.

## Answers (Tim, 16 Sep 2026)

1. Short school name: added as `school.short_name` / `schoolShortName` (roadmap R26).
2. Product name and crest: both used as placeholders until H4 (R28).
3. The `/join` helper line is built.
4. Rate-limit copy comes from the API's `detail`, so the minutes vary. Sign in stays enabled because the API gives no machine-readable retry time.
5. Password error sentences come from the API's `detail`. The frames' invented strings aren't used.
6. Forced mode with no header is accepted as drawn.
7. Helper text sits inside the row, wired with `aria-describedby`.
Field labels are built at 12px, not 11px, to meet the brief's type floor.
