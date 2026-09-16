# UI checklist — before a page or component is called done

Run this on every restyle task, every new page, and in review of a front-end PR. Each line is a yes or a fix; the reasons are in `UI-STANDARDS.md` (section numbers in brackets).

## Does it do its job?

- [ ] A first-time user can tell what this page is for and what to do next without reading instructions. [Brief §3]
- [ ] The answer the user came for is the first and largest thing on the page. [Brief §4]
- [ ] One filled primary button; secondary actions subordinate; destructive actions apart and confirmed or undoable. [§6]
- [ ] Every state in the page's roadmap §6.2 row renders: empty, pending, error, expired, unreachable. Empty states carry the next action. [§8]
- [ ] Every status is a word, not only a colour. [§5]

## Phone and laptop

- [ ] Looks right at 390px and 1140px, and nothing scrolls sideways. [§3]
- [ ] Body 16px, inputs 16px, nothing under 12px. [§4]
- [ ] Touch targets 44×44px with 8px between them; nothing depends on hover. [§6]
- [ ] Layout survives 200% zoom and long content (a 40-character surname, a wrapped class name). [§3, §13]
- [ ] Nothing jumps as it loads. [§3]

## Keyboard and screen reader

- [ ] The whole flow completes with keyboard only; focus is visible on every stop and never hidden under a sticky bar. [§6, §13]
- [ ] Buttons are `<button>`, links are `<Link>`; no clickable `div`s. [§6]
- [ ] Every field has a visible label, the right `type`, `inputMode` and `autoComplete`; paste works. [§7]
- [ ] Errors sit under their field with `aria-describedby`; a failed submit focuses the alert. [§7]
- [ ] Icon-only controls have `aria-label`; decorative icons are `aria-hidden`. [§6]
- [ ] Asynchronous changes are announced from a live region. [§8]
- [ ] Headings in order, one `<h1>`, landmarks present, skip link present. [§13]
- [ ] axe reports no violations on the page (it is in `phase1.e2e.ts` or the current journey file). [§13]

## Tokens, colour, type

- [ ] No raw hex, no literal font name, no `--bipi-*` value changed. [§1, §2]
- [ ] Text 4.5:1, controls and meaningful graphics 3:1, measured on the light surfaces. [§5]
- [ ] BiPi blue only marks "now"; green only marks "done"; the app accent is neither. [§5]
- [ ] No `--text-*` size and `text-*` colour through one `cn()`; no two `--text-*` steps on one element. [§2]
- [ ] `tabular-nums` on aligned numbers; `text-balance` on headings; `…` not `...`. [§4]

## Motion and feedback

- [ ] At most one designed motion moment on the page, on `transform`/`opacity`, with `motion-reduce:` handled. [§10]
- [ ] No `transition-all`; properties listed. [§2]
- [ ] Submit button disables and reads "Doing…" during the request; nothing spins for work under 300ms. [§7, §8]
- [ ] Success is visible in place; the status word changes. [§8]

## Copy

- [ ] Sentence case; buttons name the outcome; the verb continues into the status. [§11]
- [ ] Errors give cause and fix. [§11]
- [ ] Dates through `Intl` in `Europe/Dublin`; counts as numerals. [§11]
- [ ] No SEC or NCCA content that isn't quoted from a source with a `source_ref`. [§11]

## Process

- [ ] Specs in `components/app/*.spec.tsx` pass unchanged (or a separate commit names the pack that renamed a control). [§15]
- [ ] Screenshots compared against the design export at both widths; one decoration removed. [§15]
- [ ] `make verify && make e2e` green.
- [ ] Anything learned is recorded in `UI-STANDARDS.md`; anything now false is deleted from it.
