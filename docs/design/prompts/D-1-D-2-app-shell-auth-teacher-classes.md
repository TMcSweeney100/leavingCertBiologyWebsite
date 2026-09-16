# Claude Design prompt — packs D-1 (app shell and auth) and D-2 (teacher classes)

Edit freely, then paste everything below the line into Claude Design. **Attach `docs/design/UI-BRIEF.md`** with it; the prompt assumes Claude Design has read it. Everything here comes from `docs/PILOT-ROADMAP.md` §6.1–§6.2 (pages and states) and the built components in `frontend/components/app/` (the exact words on screen today).

---

I'm designing the front end of a Leaving Cert coursework app. The attached `UI-BRIEF.md` is the design brief: who the users are, how it should feel, the visual system to build from, what to avoid, the copy rules, and what a design pack must contain. Read it first and follow it. This message gives you the pages for the first two packs.

Give me **two or three distinct directions** for the app shell and the sign-in page, as rough frames, before doing anything else. I'll pick one, then you build out every page below in that direction, at **390px and 1140px**, showing **every state** listed. Deliver the pack as the brief's §8 describes: the frames, a `tokens.css` of the tokens you add, and a `NOTES.md` on the brief's template with exact copy, the measured contrast of any colour you add, and anything you decided that these notes don't.

## The rules that constrain you

- Existing tokens are in the brief §5. Keep the fonts, neutrals and radii. Choose the app's accent and status colours; the accent must not be the BiPi "now" blue.
-But I will say that I am not set on keep the font netrals and radii if you feel that we can do better suggest some differant designs and we can look at them. You can possibly do some designs side by side with other fonts, neutrals and radii, and I can compare them, if I like them I can switch over then, so you can tkae this information on the `UI-BRIEF.md` with a pinch of salt
- Light mode only. Body and inputs 16px.
- The control labels below are asserted by automated tests. **Keep them word for word.** If a better label is genuinely warranted, keep the old one in the frame and propose the new one in `NOTES.md` under "Open questions" so we can change the test first.
- If you have any suggestions for chnages put them in `NOTES.md` under "Open questions" we welcome suggestions that are justified and will make the frontend better
- Sentence case everywhere. No icon-only buttons. No hover-only affordances.
- Every page also has one shared **error panel** (a heading, a sentence, an optional list of field problems, and a "Try again" link) for when the server can't be reached or a request fails. Design it once; it appears in place on any page.

## Users on these pages

- **Teachers** on a laptop, often projecting to a classroom screen (D-2 is theirs).
- **Students** on laptops but also on phones, students will be using this application alot on laptops and tablets put it is nice for this to be able to work on a phone (D-1's join, sign-up, reset and sign-in pages are mostly theirs).


## D-1: App shell and auth pages

### App header (on every signed-in page)

Shows, in order: the app's name or mark; a **role switcher** only when the person holds more than one role, as links labelled **Classes** (teacher), **School overview** (school leader), **Timeline** (student), with the current one marked; the person's name; a **Change password** link; a **Sign out** button. Accessible names to keep: "Switch role" for the switcher nav, "Sign out". States: one role (no switcher); two or three roles.

### `/login` — Sign in

Heading "Sign in". Fields **Username** and **Password**. Button **Sign in**. Below the form: "Joining a class? Enter your join code." and "Forgotten your password? Use a reset code." as links. States: wrong credentials (one message for both: "Wrong username or password."); too many attempts ("Too many attempts. Try again in 12 minutes."); the error panel for a dead server.

### `/account/password` — Change password

Heading "Change password". Fields **Current password**, **New password**, **Confirm new password**. Button **Change password**. States: **forced mode** for a teacher signing in for the first time with a temporary password, with the line "You signed in with a temporary password. Choose your own to continue. It needs at least 10 characters." and no way out except Sign out; normal mode reached from the header, with a **Cancel** link; new password too short; current password wrong ("Your current password isn't right.").

### `/join` — Enter a join code

Heading "Join a class". One field **Join code** (8 characters, letters and digits, no look-alike characters; typed lowercase should still work). Button **Continue**. States: code unknown or expired ("That join code isn't right, or it has expired. Ask your teacher for a new one.").

### `/join/[code]` — The class behind the code

Shows the class name, subject and school for that code, so the student can see what they're joining before they commit. Then one of two things:

- **Signed out:** a form headed "Create your account" with **First name**, **Surname**, **Username** (helper text: "3 to 32 characters: letters, numbers, dots, dashes and underscores."), **Password** (helper text: "At least 10 characters."), button **Create account and join**, and "Already have an account? Sign in instead." as a link.
- **Signed in:** a button **Join this class**.

States: username taken ("That username is taken."); password too short; already in this class (show the current status, Pending approval or Approved, instead of the button); code expired between steps.

### `/reset` — Reset your password

Heading "Reset your password", with "Your teacher can give you a reset code. It works once and lasts 24 hours." Fields **Username**, **Reset code**, **New password**. Button **Set new password**. After success the person is not signed in: send them to sign in. States: code wrong or expired (one message: "That code isn't right, or it has expired. Ask your teacher for a new one."); too many attempts.

## D-2: Teacher class pages

### `/teach` — My classes

Heading "My classes". A list of the teacher's classes, each showing subject, class name, year group, academic year, and a **pending-request count** that should be the thing a teacher's eye lands on if it's above zero. Primary action **Create class**. States: no classes yet ("No classes yet. Create one and read its join code out to the class.").

### `/teach/classes/new` — Create a class

Heading "Create a class". Fields **Subject** (a choice of Biology, Business, Chemistry, Physics), **Class name**, **Year group** (5th or 6th), **Academic year** (defaults to the current one, e.g. 2026/27), and **Level** (optional: Higher, Ordinary, Mixed). Button **Create**. **Cancel** link. States: validation errors under fields.

### `/teach/classes/[id]` — One class, Students tab

Heading is the class name, with subject, year group and academic year beneath. Three sections:

1. **Join code.** The current 8-character code, large and easy to read off a projector, with its expiry date ("expires 14 Oct 2026"). Buttons **New code** and **Turn joining off**. State: joining is off ("Joining is off. Make a new code to let students join.") with only **New code** showing.
2. **Pending requests.** Students who've asked to join, with name, username and when they asked. Per student: **Approve** and **Decline**. (Accessible names are "Approve Cian Murphy" and "Decline Cian Murphy": the visible button can say "Approve", the name is for screen readers.) State: none waiting ("No requests waiting.").
3. **Students.** Approved students with name and username. Per student: **Remove** and **Issue reset code** (accessible names "Remove Aoife Byrne", "Issue reset code for Aoife Byrne"). Removing needs a confirmation. Issuing a reset code shows the code **once**, in a way the teacher can read out or show to one student without the whole class seeing, with "expires in 24 hours". State: no students yet ("No students yet.").

Later tabs on this page (Component, Progress) arrive in other packs; leave room for a tab row but don't design them.

## What I want back

1. Two or three directions for the header plus `/login`, rough, at both widths.
2. Some possible alternative looks to what is stated in the design brief eg. font, mood ect
3. After I choose: every page above, every state, both widths, plus the shared error panel.
4. `tokens.css` and `NOTES.md` as the brief describes.
5. It is important that this looks very sleek and modern and up to date with best practices of current web  development. We want this to attract students and impress teachers and pricipals by how well it looks.
