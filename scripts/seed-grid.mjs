#!/usr/bin/env node
// Gate P4: builds a 30-student Biology class through the public API, then times its Progress page.
//
// Usage:
//   node scripts/seed-grid.mjs --username=<teacher> --password=<teacher password> \
//     [--base=https://<pilot host>] [--students=30]
//
// The teacher must exist (operator create-user + create-school + grant-role TEACHER) and must
// already have replaced their temporary password. --base defaults to http://localhost:3000.
//
// WARNING: this creates REAL accounts (students `seed.<stamp>.<i>`, all with the same known
// password) and a class called "Seed grid <stamp>". Against the deployed stack, delete that class
// and those users before onboarding real students.
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);
const base = (args.base || "http://localhost:3000").replace(/\/$/, "");
const count = Number(args.students || 30);
if (!args.username || !args.password) {
  console.error("Usage: node scripts/seed-grid.mjs --username=<teacher> --password=<password> [--base=<url>] [--students=30]");
  process.exit(2);
}

const FIRST = ["Aoife", "Cian", "Niamh", "Oisín", "Saoirse", "Seán", "Ciara", "Darragh", "Éabha", "Fionn", "Grace", "Jack", "Róisín", "Liam", "Sadhbh"];
const LAST = ["Byrne", "Murphy", "Kelly", "O'Brien", "Walsh", "Ó Briain", "Nolan", "Doyle", "McCarthy", "Brennan", "Ní Bhriain", "Fitzgerald-Kavanagh"];
const STUDENT_PASSWORD = "seed-student-password";

/**
 * A cookie jar plus the CSRF header, as the browser does it through the same-origin proxy:
 * GET /api/v1/auth/csrf sets the readable XSRF-TOKEN cookie; unsafe requests send it back in
 * the x-xsrf-token header. The SESSION cookie is what the Next page routes check.
 */
function session() {
  const jar = new Map();
  async function raw(method, path, body) {
    const headers = { accept: "application/json, text/html", cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") };
    if (method !== "GET") {
      headers["content-type"] = "application/json";
      headers["x-xsrf-token"] = decodeURIComponent(jar.get("XSRF-TOKEN") ?? "");
    }
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(";");
      const [k, ...v] = pair.split("=");
      const expired = attrs.some((a) => /^\s*max-age=0/i.test(a));
      if (expired || v.join("=") === "") jar.delete(k.trim());
      else jar.set(k.trim(), v.join("="));
    }
    return res;
  }
  async function call(method, path, body) {
    let res;
    try {
      res = await raw(method, path, body);
    } catch (cause) {
      throw new Error(`${method} ${path}: could not reach ${base} (${cause.cause?.code ?? cause.message}). Is the stack running?`);
    }
    if (res.status >= 300) {
      throw new Error(`${method} ${path} -> ${res.status} ${(await res.text()).slice(0, 400)}`);
    }
    const type = res.headers.get("content-type") ?? "";
    return type.includes("json") ? res.json() : res.text();
  }
  return { call, csrf: () => call("GET", "/api/v1/auth/csrf") };
}

const iso = (d) => d.toISOString().slice(0, 10);
const days = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const stamp = Date.now().toString(36);

async function step(label, fn) {
  try {
    return await fn();
  } catch (e) {
    console.error(`\nseed-grid failed while ${label}:\n  ${e.message}`);
    console.error("Anything created before this point is still there (class name contains the stamp " + stamp + ").");
    process.exit(1);
  }
}

const teacher = session();
await step("signing in the teacher", async () => {
  await teacher.csrf();
  const me = await teacher.call("POST", "/api/v1/auth/login", { username: args.username, password: args.password });
  if (me.mustChangePassword) {
    throw new Error("This account still has its temporary password. Change it first (POST /api/v1/auth/password or the app), then rerun.");
  }
  teacher.me = me;
  await teacher.csrf(); // the session id changes at login, so take a fresh token
});
const school = teacher.me.roles.find((r) => r.role === "TEACHER")?.schoolId;
if (!school) {
  console.error("seed-grid: this account has no TEACHER role (operator grant-role ... --role=TEACHER).");
  process.exit(1);
}

const { cls, component } = await step("building the class and component", async () => {
  const cls = await teacher.call("POST", "/api/v1/classes", {
    schoolId: school,
    subjectCode: "BIOLOGY",
    name: `Seed grid ${stamp}`,
    yearGroup: 6,
    academicYear: "2026/27",
  });
  const briefs = await teacher.call("GET", "/api/v1/briefs?subjectCode=BIOLOGY");
  if (!briefs.length) throw new Error("No published Biology brief to build a component from.");
  const brief = briefs[0];
  const created = await teacher.call("POST", `/api/v1/classes/${cls.id}/components`, { briefId: brief.id });

  // Stages 1-3 due, 4-6 not yet. A date after the brief's completion date is refused, so clamp.
  const completion = brief.completionDate;
  const clamp = (d) => (completion && iso(d) > completion ? completion : iso(d));
  const offsets = [-40, -20, -3, 30, 60, 90];
  const component = await teacher.call("PUT", `/api/v1/components/${created.id}/stage-dates`, {
    dates: created.stages.map((s, i) => ({ stageId: s.id, dueDate: clamp(days(offsets[i] ?? 90)) })),
  });
  return { cls, component };
});

await step(`creating ${count} students through the join flow`, async () => {
  for (let i = 0; i < count; i++) {
    const student = session();
    await student.csrf();
    await student.call("POST", `/api/v1/join/${cls.joinCode.code}/accounts`, {
      firstName: FIRST[i % FIRST.length],
      lastName: LAST[(i * 7) % LAST.length],
      username: `seed.${stamp}.${i}`,
      password: STUDENT_PASSWORD,
    });
  }
});

await step("approving the students", async () => {
  const detail = await teacher.call("GET", `/api/v1/classes/${cls.id}`);
  for (const e of detail.enrolments.filter((e) => e.status === "PENDING")) {
    await teacher.call("POST", `/api/v1/classes/${cls.id}/enrolments/${e.enrolmentId}/approve`);
  }
});

const grid = await step("signing off a spread of checkpoints", async () => {
  const grid = await teacher.call("GET", `/api/v1/components/${component.id}/progress`);
  const checkpoints = grid.stages.filter((s) => s.checkpoint).map((s) => s.checkpoint.id);
  // Most are up to date on Stage 1, fewer on 2 and 3, a few signed off early on 4.
  for (const [i, s] of grid.students.entries()) {
    const want = [i % 6 !== 0, i % 3 !== 0, i % 4 === 0, i % 9 === 0];
    for (const [k, on] of want.entries()) {
      if (on && checkpoints[k]) {
        await teacher.call("PUT", `/api/v1/components/${component.id}/students/${s.studentId}/checkpoints/${checkpoints[k]}/signoff`, { signedOff: true });
      }
    }
  }
  return grid;
});

async function time(label, path) {
  const t = performance.now();
  await step(`timing ${label}`, () => teacher.call("GET", path));
  console.log(`${label}: ${Math.round(performance.now() - t)} ms`);
}
const page = `/teach/classes/${cls.id}/progress`;
await time("Progress page, first load", page);
await time("Progress page, second load", page);
await time("Grid API", `/api/v1/components/${component.id}/progress`);
console.log(`Class: ${base}${page} (${grid.students.length} students x ${grid.stages.filter((s) => s.checkpoint).length} checkpoints)`);
console.log(`Created: class "Seed grid ${stamp}", students seed.${stamp}.0 to seed.${stamp}.${count - 1}. Delete before onboarding.`);
