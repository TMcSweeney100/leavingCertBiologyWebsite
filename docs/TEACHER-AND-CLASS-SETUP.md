# Setting up teachers and classes

How to add a teacher, make a class, get students into it, and fill a demo class in one go. This covers the pilot app only, not the BiPi schedule.

| I want to… | Go to |
|---|---|
| Add a teacher (and their school) | [Add a teacher](#add-a-teacher) |
| Set up a real class | [Set up a class](#set-up-a-class) |
| Get a full class for a demo | [Fill a demo class](#fill-a-demo-class) |
| Fix an error | [If something goes wrong](#if-something-goes-wrong) |

## How it fits together

- **Schools and teachers** can only be created with operator commands. There's no sign-up page for them.
- **Classes** are created by a teacher, in the app.
- **Students** make their own accounts with a class's join code, and the teacher then approves them.
- **The live site and your laptop have separate databases.** An account on one doesn't exist on the other.

| | Live pilot | Your laptop |
|---|---|---|
| Website | https://leaving-cert-practical-git-pilotmain-tim-mc-sweeneys-projects.vercel.app | http://localhost:3000 |
| Where operator commands run | Render Shell | A terminal at the repo root |
| Operator commands start with | `java -jar /app/app.jar operator` | `scripts/operator.sh` |
| Start first | Nothing | `make db-up`, `make backend-run`, `make frontend-run` (needs `APP_ENABLED=true` in `frontend/.env.local`) |

In the commands below, replace anything in `<angle brackets>`, including the brackets. They show the live version; on your laptop, swap the start of the command as the table says.

## Add a teacher

### 1. Open Render Shell (live site only)

1. Go to [dashboard.render.com](https://dashboard.render.com) and open the backend web service.
2. Find **Instance Type** (under Settings or Scaling) and change it to **Starter**. Render Shell doesn't work on Free. Billing is per second, so this costs cents.
3. Wait until the service shows **Live**, then open the **Shell** tab.

### 2. Create the school

Skip this if the school already exists. Teachers at the same school share one roll number.

```bash
java -jar /app/app.jar operator create-school --name="<school name>" --short-name="<name for the app header>" --roll=<roll number>
```

You should see `Created school <school name> (<roll number>) id=…`.

- The roll number must be unique. For a demo, make one up and use a made-up school name.
- `--short-name` is optional. To change it later, use `operator set-school-short-name --roll=<roll number> --short-name="<name>"`.

### 3. Create the account

```bash
java -jar /app/app.jar operator create-user --first-name=<first name> --last-name=<surname> --username=<username>
```

- Usernames are 3 to 32 characters: lowercase letters, numbers, dots, dashes and underscores.
- You should see `Temporary password (shown once): …`. **Copy it now.** It can't be shown again, and no command resets it. If you lose it, repeat this step with a different username.

### 4. Make them a teacher

```bash
java -jar /app/app.jar operator grant-role --username=<username> --roll=<roll number> --role=TEACHER
```

You should see `Granted TEACHER at <roll number> for <username>`. The other roles are `STUDENT` and `SCHOOL_LEADER`.

### 5. Sign in for the first time

1. Go to `/login` on the site and sign in with the temporary password.
2. The app makes you change it. Enter the temporary password as **Current password**, then choose a new one of 10 to 64 characters.
3. You land on the teacher's class list.

Do this even if you only want to run the demo script, because the script refuses a temporary password.

### 6. Switch Render back to Free

Change **Instance Type** back to **Free**. If a demo is coming up in the next few days, leave this until it's over ([why](#before-a-demo)).

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

On the **Students** tab, under **Pending requests**, press **Approve** or **Decline** for each student.

If a student forgets their password, press **Issue reset code** beside their name. The code is shown once and lasts 24 hours. The student uses it through **Use a reset code** on the login page.

## Fill a demo class

`scripts/seed-grid.mjs` builds a whole class from your laptop, through the site's public API. You don't need Render Shell for this, but you do need a teacher who has already [changed their temporary password](#5-sign-in-for-the-first-time).

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

- **Free sleeps when idle,** and the first request after that can fail. Either stay on Starter until the demo is over, or open the site a few minutes before you start.
- **Check the backend is awake.** This should print `{"status":"UP"}`. If it fails, wait a minute and try again.

  ```bash
  curl https://leaving-cert-practical-git-pilotmain-tim-mc-sweeneys-projects.vercel.app/api/v1/health
  ```

- **Sign in as both the teacher and a student** beforehand, so neither login surprises you.

## If something goes wrong

| Message | What it means | What to do |
|---|---|---|
| `Wrong username or password` | The login failed. The message is the same whether the username doesn't exist or the password is wrong. | Try it on the website. Check you're on the right site, because live and laptop accounts are separate. If you can't get in, [create a new teacher](#add-a-teacher). |
| `Too many attempts` | 5 wrong tries for one username within 15 minutes. | Wait for the time it gives, and don't keep guessing. |
| `still has its temporary password` | The teacher hasn't done their first sign-in. | [Sign in and change it](#5-sign-in-for-the-first-time). |
| `has no TEACHER role` | The account exists but isn't a teacher. | Run [`grant-role`](#4-make-them-a-teacher). |
| `could not reach` | The backend is probably waking up, or your laptop's servers aren't running. | Wait a minute and try again. |
| `That username is taken` | Someone already has it. | Pick another. |
| `A school with that roll number already exists` | The school is already there. | Skip `create-school` and use that roll number. |
| `No school with that roll number` or `No user with that username` | A typo, or that step hasn't been done yet. | Check the value, or do the earlier step. |
| `That join code isn't right, or it has expired` | The code was mistyped, replaced or turned off, or it's over 30 days old. | Check it, or press **New code** on the **Students** tab. |
| `seed-grid failed while…` (any other step) | The script stopped partway. Nothing is undone. | Check whether the class exists before running it again, as a rerun makes another one. |

## Cleaning up

There's no delete button for classes or accounts. A teacher can press **Remove** to take a student out of a class, but the account stays. Deleting anything else takes SQL on the database, and no script for that exists yet.

This must happen before real students join the live site. `docs/HANDOFF.md` lists it under "Delete test data before onboarding". Seeded students are easy to find, because their usernames all start with `seed.`.

## Keep passwords out of this

- Don't write real passwords in this file or anywhere else in the repo.
- A password typed into a command stays in your shell history, so give demo teachers a password you don't use anywhere else.
- Take the password out before pasting a command into a chat or a ticket.
