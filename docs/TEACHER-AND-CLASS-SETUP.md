# Setting people up

Everything needed to get a school, a teacher, a class and its students onto the pilot app. This covers the pilot app only, not the BiPi schedule.

| I want to… | Go to |
|---|---|
| Add a new teacher | [Add a teacher](#add-a-teacher) (5 minutes, 3 commands) |
| Help a teacher who forgot their password | [A teacher forgot their password](#a-teacher-forgot-their-password) |
| Help a student who forgot their password | [A student forgot their password](#a-student-forgot-their-password) |
| Tell a teacher how to make a class | [Set up a class](#set-up-a-class) |
| Get a full class for a demo | [Fill a demo class](#fill-a-demo-class) |
| Fix an error | [If something goes wrong](#if-something-goes-wrong) |
| Check the live site is ready for real people | [Before the first real user](#before-the-first-real-user) |

## Who makes what

| Thing | Who makes it | Where |
|---|---|---|
| School | You | A command in Render Shell |
| Teacher account | You | A command in Render Shell |
| Class | The teacher | In the app |
| Student account | The student | In the app, with the class's join code |

The live site and your laptop have separate databases. An account on one doesn't exist on the other.

| | Live pilot | Your laptop |
|---|---|---|
| Website | https://leaving-cert-practical-git-pilotmain-tim-mc-sweeneys-projects.vercel.app | http://localhost:3000 |
| Where commands run | Render Shell | A terminal at the repo root |
| Commands start with | `java -jar /app/app.jar operator` | `scripts/operator.sh` |
| Start first | Nothing | `make db-up`, `make backend-run`, `make frontend-run` (needs `APP_ENABLED=true` in `frontend/.env.local`) |

The commands below are the live version. On your laptop, swap the start of the command as the table says. Replace anything in `<angle brackets>`, brackets included.

## Open Render Shell

Every command for the live site is typed here.

1. Go to [dashboard.render.com](https://dashboard.render.com) and sign in.
2. In the list of services, click the **backend web service** (the one of type "Web Service", not the Postgres database).
3. In the menu down the left side of that page, click **Shell**.
4. Wait for a prompt with a blinking cursor. Click into it and paste a command.

If **Shell** is greyed out or asks you to upgrade, the service is on the Free instance type. Go to **Settings** in the same left menu, find **Instance Type**, and change it to **Starter**. Wait for the service to show **Live**, then open **Shell** again.

Each command takes 10 to 20 seconds, because it starts the app, does one thing and exits. Startup log lines scroll past first. The line you want is the last one or two.

## Add a teacher

You need three things from the teacher first: their first name, their surname, and their school's name and roll number.

### 1. Create the school

Skip this if the school already exists. Teachers at the same school share one roll number.

```bash
java -jar /app/app.jar operator create-school --name="<school name>" --short-name="<short name>" --roll=<roll number>
```

Example:

```bash
java -jar /app/app.jar operator create-school --name="Scoil Example Community College" --short-name="Scoil Example" --roll=12345A
```

You should see:

```
Created school Scoil Example Community College (12345A) id=3f0c9a52-7d1e-4b8a-9c64-2e5f8a1b7d30
```

- The short name is what shows in the app's header. Keep it under about 20 characters. It's optional.
- Not sure if the school exists? Run the command anyway. If it does, you get `error: A school with that roll number already exists.` and nothing changes.

### 2. Create the account

```bash
java -jar /app/app.jar operator create-user --first-name=<first name> --last-name=<surname> --username=<username>
```

Example:

```bash
java -jar /app/app.jar operator create-user --first-name=Maeve --last-name=Byrne --username=m.byrne
```

You should see (your password will differ):

```
Created m.byrne.
Temporary password (shown once): Hb7kQm3RtW9nXc4P
```

**Copy the temporary password now.** It is never shown again.

- Usernames are 3 to 32 characters: lowercase letters, numbers, dots, dashes and underscores. `firstinitial.surname` works well.
- A name with a space needs quotes: `--last-name="Ní Bhriain"`.

### 3. Make them a teacher

```bash
java -jar /app/app.jar operator grant-role --username=<username> --roll=<roll number> --role=TEACHER
```

Example:

```bash
java -jar /app/app.jar operator grant-role --username=m.byrne --roll=12345A --role=TEACHER
```

You should see:

```
Granted TEACHER at 12345A for m.byrne
```

The other roles are `SCHOOL_LEADER` and `STUDENT`. Without this step the account can sign in but sees no teacher pages.

### 4. Send the teacher their details

Send these three things. Put the password in a separate message from the username.

- The site: https://leaving-cert-practical-git-pilotmain-tim-mc-sweeneys-projects.vercel.app/login
- Their username
- Their temporary password

Tell them what happens next:

1. They sign in with the temporary password.
2. The app asks them to change it straight away. They type the temporary password as **Current password**, then choose their own, 10 to 64 characters.
3. They land on their class list, which is empty. [Set up a class](#set-up-a-class) is next.

### 5. Check it worked

Ask the teacher to tell you when they're in. If they report `Wrong username or password`, see [If something goes wrong](#if-something-goes-wrong).

## A teacher forgot their password

This works on the live site once `pilot/operator-reset-password` is merged into `pilotMain` and Render has deployed it. Before that, the command prints `usage:`.

1. [Open Render Shell](#open-render-shell).
2. Run:

   ```bash
   java -jar /app/app.jar operator reset-password --username=<username>
   ```

   Example:

   ```bash
   java -jar /app/app.jar operator reset-password --username=m.byrne
   ```

   You should see (your password will differ):

   ```
   Reset the password of m.byrne. They are signed out everywhere.
   Temporary password (shown once): Tq4wYn8LcR2vJd6M
   ```

3. Send the teacher the new temporary password. They sign in with it and are asked to choose a new one, the same as their first sign-in.

Their classes, students and sign-offs are untouched. Only the password changes.

- If they also see `Too many attempts`, that clears by itself 15 minutes after their last wrong try. The reset doesn't clear it.
- Don't know their username? It's what you chose in [Create the account](#2-create-the-account). There's no command to list users yet.

A teacher who still knows their password changes it themselves: the account menu in the app's header, then **Change password**.

## A student forgot their password

The teacher does this, not you.

1. The teacher opens the class, then the **Students** tab.
2. Beside the student's name, they press **Issue reset code**. An 8-character code shows once and lasts 24 hours.
3. The student goes to the login page, presses **Use a reset code**, and types their username, the code and a new password.
4. The student signs in with the new password.

## Set up a class

This all happens in the app, with no commands.

### As the teacher

1. Sign in, then press **Create class**.
2. Fill in **Subject**, **Class name** (up to 80 characters), **Year group** and **Level** (optional). **Academic year** is already filled in. Press **Create**.
3. Open the **Component** tab, choose the **Brief** and press **Create component**. A class does one coursework component.
4. Set a date for each stage, then press **Save dates**. Nothing is saved until you do.
5. Open the **Students** tab and give students the **Join code**. It has 8 characters and lasts 30 days.
   - **New code** replaces it, and the old code stops working.
   - **Turn joining off** stops anyone else joining.

### As each student

1. Go to `/join` on the site and type the code. Lowercase is fine.
2. Fill in **First name**, **Surname**, **Username** and **Password** (10 to 64 characters).

The student then waits for approval.

### Approving students

On the **Students** tab, under **Pending requests**, the teacher presses **Approve** or **Decline** for each student.

## Before the first real user

Do these once, before a real teacher or student has an account on the live site.

- [ ] **Web service on Starter or higher.** Render dashboard → the backend web service → **Settings** → **Instance Type**. Free has no Shell, and it sleeps when idle, so a teacher's first click of the day can fail.
- [ ] **Database off the Free plan.** Render dashboard → the Postgres database → its plan or instance type setting. A free Render database is deleted 30 days after it was created (plus a 14-day grace period) and has no backups. A paid one doesn't expire and is backed up continuously, so it can be restored to a point in time.
- [ ] **A restore tried once** into a scratch database, so you know it works before you need it.
- [ ] **Test data deleted.** `docs/HANDOFF.md` lists it under "Delete test data before onboarding". See [Cleaning up](#cleaning-up).
- [ ] **The privacy paperwork** for real students (roadmap §9, R3). One teacher trying the app with made-up students doesn't need it; a class of real students does.

After any Render deploy, check the school's short name still shows in the app header. If it doesn't:

```bash
java -jar /app/app.jar operator set-school-short-name --roll=<roll number> --short-name="<short name>"
```

## Fill a demo class

`scripts/seed-grid.mjs` builds a whole class from your laptop, through the site's public API. You don't need Render Shell for this, but you do need a teacher who has already signed in once and changed their temporary password.

Run it from the repo root:

```bash
node scripts/seed-grid.mjs --username=<teacher username> --password='<teacher password>' --base=https://leaving-cert-practical-git-pilotmain-tim-mc-sweeneys-projects.vercel.app --students=30 --class-name="<class name>"
```

Keep the single quotes around the password, so symbols in it don't confuse the terminal.

| Option | Meaning | Default |
|---|---|---|
| `--username`, `--password` | The teacher who will own the class | Required |
| `--base` | Which site to fill | `http://localhost:3000` |
| `--students` | How many students | `30` |
| `--class-name` | The class's name, which can't be changed afterwards | `Seed grid <stamp>` |

It prints nothing until the end, then shows this:

```
Progress page, first load: … ms
Progress page, second load: … ms
Grid API: … ms
Class: https://…/teach/classes/…/progress (30 students x … checkpoints)
Created: class "<class name>", students seed.<stamp>.0 to seed.<stamp>.29. Delete before onboarding.
```

Save the last two lines. The `Class:` line links to the class, and the `Created:` line has the student usernames.

**What you get:**

- A 6th-year Biology class for 2026/27, with its component set up.
- Approved students with made-up Irish names.
- Three stages already past and three still to come.
- A realistic spread of sign-offs, so the Progress page looks in use.

**To see the student view,** open a private window, so you stay signed in as the teacher in the normal one. Sign in with a username from the `Created:` line and the password `seed-student-password`.

**Limits:**

- It always creates a new class. It can't add students to an existing one.
- Each run makes another class and more students, so run it once.
- Biology, year 6 and `2026/27` are fixed in the script. Change `academicYear` there for later years.
- Every seeded student has the same password, which is in this repo. Only use this for demos, and [clean up](#cleaning-up) before real students join.

## Before a demo

- **Check the backend is awake.** This should print `{"status":"UP"}`. If it fails, wait a minute and try again.

  ```bash
  curl https://leaving-cert-practical-git-pilotmain-tim-mc-sweeneys-projects.vercel.app/api/v1/health
  ```

- **If the web service is on Free,** it sleeps when idle and the first request after that can fail. Open the site a few minutes before you start.
- **Sign in as both the teacher and a student** beforehand, so neither login surprises you.

## If something goes wrong

| Message | What it means | What to do |
|---|---|---|
| `Wrong username or password` | The login failed. The message is the same whether the username doesn't exist or the password is wrong. | Check they're on the right site, because live and laptop accounts are separate. Check the username is all lowercase. A temporary password is 16 letters and numbers with no `0`, `O`, `1`, `l` or `I`. If they still can't get in, [reset it](#a-teacher-forgot-their-password). |
| `Too many attempts` | 5 wrong tries for one username within 15 minutes. | Wait for the time it gives, and don't keep guessing. |
| `still has its temporary password` | The teacher hasn't done their first sign-in. | They sign in and change it. |
| `has no TEACHER role` | The account exists but isn't a teacher. | Run [`grant-role`](#3-make-them-a-teacher). |
| `could not reach` | The backend is waking up, or your laptop's servers aren't running. | Wait a minute and try again. |
| `error: That username is taken.` | Someone already has it. | Pick another. |
| `error: A school with that roll number already exists.` | The school is already there. | Skip `create-school` and use that roll number. |
| `error: No school with that roll number.` or `error: No user with that username.` | A typo, or that step hasn't been done yet. | Check the value, or do the earlier step. |
| `missing --<something>` then `usage:` | An option was left out or misspelled. | Compare your command with the example. Options are `--name=value` with no spaces around `=`. |
| `That join code isn't right, or it has expired` | The code was mistyped, replaced or turned off, or it's over 30 days old. | Check it, or press **New code** on the **Students** tab. |
| `seed-grid failed while…` (any other step) | The script stopped partway. Nothing is undone. | Check whether the class exists before running it again, as a rerun makes another one. |

## Cleaning up

There's no delete button for classes or accounts. A teacher can press **Remove** to take a student out of a class, but the account stays. Deleting anything else takes SQL on the database, and no script for that exists yet.

This must happen before real students join the live site. `docs/HANDOFF.md` lists it under "Delete test data before onboarding". Seeded students are easy to find, because their usernames all start with `seed.`.

## Keep passwords out of this

- Don't write real passwords in this file or anywhere else in the repo. The example passwords above are made up.
- Send a temporary password once, in a message separate from the username. It stops working when the teacher changes it.
- A password typed into a command stays in your shell history, so give demo teachers a password you don't use anywhere else.
- Take the password out before pasting a command into a chat or a ticket.
