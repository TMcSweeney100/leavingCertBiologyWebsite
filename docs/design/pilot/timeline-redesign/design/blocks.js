// The timeline's blocks, filled with Tim Mc Sweeney's real /home data (12 Nov 2026) so the frames
// can't drift apart. Two items marked `sample` are invented, to show a week used as a planner.
const svg = (d, w = 18, sw = 2) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  plus: svg('<path d="M12 5v14M5 12h14"/>', 18, 2.4),
  plusSm: svg('<path d="M12 5v14M5 12h14"/>', 14, 2.4),
  left: svg('<path d="M15 18l-6-6 6-6"/>'),
  right: svg('<path d="M9 18l6-6-6-6"/>'),
  check: svg('<path d="M5 12l5 5L19 7"/>', 16, 3),
  flag: svg('<path d="M5 21V4h11l-2 4 2 4H5"/>', 18),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 16),
  down: svg('<path d="M6 9l6 6 6-6"/>', 16),
  cal: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', 16),
};

const TODAY = '2026-11-12';
const ITEMS = [
  { d: '2026-10-31', k: 'stage', n: 3, t: 'Designing and Planning the Experiment', done: true },
  { d: '2026-11-04', k: 'teacher', t: 'Look at video link of passed experiment' },
  { d: '2026-11-09', k: 'own', kind: 'Essay', t: 'English essay, first draft', sample: true, done: true },
  { d: '2026-11-10', k: 'teacher', t: 'Create Plan in workbook copy' },
  { d: '2026-11-12', k: 'own', kind: 'Deadline', t: 'Maths Assignment' },
  { d: '2026-11-13', k: 'own', kind: 'Test', t: 'French vocab test', sample: true },
  { d: '2026-11-19', k: 'own', kind: 'Test', subj: 'Biology', t: 'Bio Assignment' },
  { d: '2026-11-20', k: 'teacher', t: 'Make edits to experiment plan' },
  { d: '2026-11-21', k: 'own', kind: 'Test', t: 'History Test' },
  { d: '2026-12-01', k: 'teacher', t: 'Submit edits and final Plan' },
  { d: '2026-12-02', k: 'teacher', t: 'FInalise' },
  { d: '2026-12-03', k: 'stage', n: 4, t: 'Conducting the Experiment' },
  { d: '2026-12-04', k: 'teacher', t: 'Look at experiment timetable and subit availability' },
  { d: '2027-01-02', k: 'stage', n: 5, t: 'Data Analysis and Conclusions' },
  { d: '2027-02-01', k: 'stage', n: 6, t: 'Finalising the Biology in Practice Investigation Report' },
  { d: '2027-02-26', k: 'completion', t: 'SEC completion date' },
];

const ms = (iso) => Date.parse(iso + 'T00:00:00Z');
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const add = (d, n) => iso(ms(d) + n * 864e5);
const fmt = (o) => new Intl.DateTimeFormat('en-IE', { timeZone: 'UTC', ...o });
const WD = fmt({ weekday: 'short' }), DM = fmt({ day: 'numeric', month: 'short' }), MON = fmt({ month: 'short' });
const when = (d) => `${WD.format(ms(d))} ${DM.format(ms(d))}`;
const days = (d) => Math.round((ms(d) - ms(TODAY)) / 864e5);
const rel = (d) => { const n = days(d); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n > 0 ? `In ${n} days` : `${-n} days ago`; };
const pill = (d) => { const n = days(d); return `<span class="pill ${n === 0 ? 'today' : n < 0 ? 'past' : n <= 7 ? 'soon' : ''}">${rel(d)}</span>`; };
const on = (d) => ITEMS.filter((i) => i.d === d);
const between = (a, b) => ITEMS.filter((i) => i.d >= a && i.d <= b);
const tick = (i) => i.k !== 'own' ? '' : `<span class="tick ${i.done ? 'on' : ''}" role="checkbox" aria-checked="${!!i.done}" aria-label="${i.t}, done">${i.done ? I.check : ''}</span>`;
const mk = (i) => `<span class="mk ${i.k === 'own' ? 'own' : i.done ? 'done' : i.k === 'teacher' ? 'teacher' : 'stage'}"></span>`;
const kindLine = (i) =>
  i.k === 'own' ? `${i.kind}${i.subj ? ' · ' + i.subj : ''} · only you`
  : i.k === 'teacher' ? 'From your teacher · Biology'
  : i.k === 'completion' ? 'Biology' : 'Stage date · Biology';
const title = (i) => (i.k === 'stage' ? `Stage ${i.n} · ${i.t}` : i.t);

const B = {
  appbar: () => `
    <header class="appbar">
      <div style="display:flex;align-items:center"><b>Leaving Cert Practical</b><span class="school no-phone">Test School</span></div>
      <div class="who"><span class="no-phone">Tim Mc Sweeney</span><span class="sq"></span></div>
    </header>`,

  snav: () => `
    <nav class="snav" aria-label="Your classes">
      <span class="l"><span class="on">Timeline</span><span class="subj">Biology</span></span>
      <a class="join">Join a class</a>
    </nav>`,

  head: () => `
    <div class="head">
      <h1>Timeline</h1>
      <button class="btn btn-primary">${I.plus} Add my own item</button>
    </div>`,

  // Next up: what it is comes first; the date is a calendar leaf (gold when it's today).
  next: () => `
    <section class="next" aria-label="Next up">
      <div class="leaf today" aria-hidden="true"><small>Nov</small><b>12</b></div>
      <div>
        <p class="eyebrow">Next up · today</p>
        <h2>Maths Assignment</h2>
        <p class="meta">Deadline · only you can see this</p>
      </div>
      <div class="acts"><button class="btn solid">${I.check} Mark done</button><button class="btn">Edit</button></div>
      <p class="then"><span class="eyebrow">After that</span><span><b>French vocab test</b> · tomorrow</span><span><b>Bio Assignment</b> · Thu 19 Nov</span><span class="no-phone"><b>Make edits to experiment plan</b> · Fri 20 Nov</span></p>
    </section>`,

  bar: (view, label) => `
    <div class="bar">
      <nav class="seg" aria-label="Timeline view">
        ${['Timeline', 'Week', 'Month'].map((v) => `<a class="${v === view ? 'on' : ''}">${v}</a>`).join('')}
      </nav>
      ${label ? `<div class="range">
        <button class="btn btn-icon" aria-label="Previous ${view.toLowerCase()}">${I.left}</button>
        <h2>${label}</h2>
        <button class="btn btn-icon" aria-label="Next ${view.toLowerCase()}">${I.right}</button>
        <button class="btn btn-quiet">Today</button>
      </div>` : `<button class="btn btn-quiet">Show earlier</button>`}
    </div>`,

  // ---------- Timeline ----------
  item: (i) => `
    <a class="item ${i.k === 'own' ? 'own' : i.k === 'stage' ? 'subj stage' : i.k === 'completion' ? 'stage' : 'subj'} ${days(i.d) < 0 ? 'past' : ''} ${i.done ? 'isdone' : ''}">
      ${tick(i)}<div>
        <p class="when">${when(i.d)}${i.d.startsWith('2027') ? ' 2027' : ''}</p>
        <p class="t">${i.k === 'stage' ? i.t : i.t}</p>
        <p class="m">${i.k === 'stage' ? `<span class="tag">Stage ${i.n} of 6</span>` : ''}${kindLine(i)}</p>
      </div>
      ${i.done && i.k === 'own' ? '<span class="pill done">Done</span>' : pill(i.d)}
    </a>`,
  node: (i) =>
    i.k === 'stage' ? `<span class="node num">${i.n}</span>`
    : i.k === 'completion' ? `<span class="node flag">${I.flag}</span>`
    : `<span class="node">${mk(i)}</span>`,
  row: (i, last) => `<li class="tl-row ${last ? 'last' : ''}"><div class="rail">${B.node(i)}</div>${B.item(i)}</li>`,
  group: (h, sub) => `<li class="grp"><h3>${h}</h3>${sub ? `<span class="muted">${sub}</span>` : ''}</li>`,
  todayRow: () => `<li class="today-row"><div class="rail"><span class="disc" style="align-self:center"></span></div><p class="lbl">Today · Thu 12 Nov</p></li>`,
  timeline: () => {
    const r = (a, b) => between(a, b).map((i) => B.row(i)).join('');
    return `
    <ol class="tl" aria-label="Timeline items">
      ${B.group('This week', '9–15 Nov')}
      ${r('2026-11-09', '2026-11-11')}
      ${B.todayRow()}
      ${r('2026-11-12', '2026-11-15')}
      ${B.group('Next week', '16–22 Nov')}
      ${r('2026-11-16', '2026-11-22')}
      ${B.group('December')}
      ${r('2026-12-01', '2026-12-31')}
      <li class="gap">Nothing for four weeks, over Christmas.</li>
      ${B.group('January 2027')}
      ${r('2027-01-01', '2027-01-31')}
      ${B.group('February 2027')}
      ${B.row(ITEMS[14])}${B.row(ITEMS[15], true)}
    </ol>`;
  },
  side: () => `
    <aside class="side">
      <a class="card cw">
        <p class="eyebrow">Biology</p>
        <h3>Your coursework</h3>
        <div class="steps" aria-hidden="true"><i class="s"></i><i class="s"></i><i class="s"></i><i class="n"></i><i></i><i></i></div>
        <p class="muted" style="font-size:14px;color:var(--body)"><b style="color:var(--approved)">3 of 6</b> stages signed off</p>
        <p class="kv"><span>Next stage date</span><b>Stage 4 · 3 Dec</b></p>
        <p class="kv"><span>SEC completion date</span><b>26 Feb 2027</b></p>
      </a>
      <div class="card legend-card">
        <ul class="legend">
          <li><span class="mk stage"></span>A stage date for your coursework</li>
          <li><span class="mk teacher"></span>Something from your teacher</li>
          <li><span class="mk own"></span>Your own item. Only you see it</li>
        </ul>
      </div>
    </aside>`,

  // ---------- Week ----------
  wk: (i) => `
    <a class="wk ${i.k === 'own' ? 'own' : i.k === 'stage' ? 'stage' : 'subj'} ${days(i.d) < 0 ? 'past' : ''} ${i.done ? 'isdone' : ''}">
      <span class="wr">${tick(i)}<span class="t">${title(i)}</span></span>
      <span class="m">${mk(i)}${i.k === 'own' ? i.kind + (i.subj ? ' · ' + i.subj : '') : i.k === 'teacher' ? 'Teacher · Biology' : 'Stage date'}</span>
    </a>`,
  week: (from) => `
    <div class="week">
      ${Array.from({ length: 7 }, (_, n) => {
        const d = add(from, n), its = on(d), past = d < TODAY;
        return `
        <section class="day ${n > 4 ? 'we' : ''} ${d === TODAY ? 'now' : ''} ${past ? 'gone' : ''} ${its.length ? '' : 'empty'}">
          <header><span class="dn">${d === TODAY ? 'Today' : WD.format(ms(d))}</span><span class="dd">${Number(d.slice(8))}</span></header>
          <div class="slot">
            ${its.map(B.wk).join('')}
            ${past ? '' : `<button class="add-day" aria-label="Add my own item on ${when(d)}">${I.plusSm} Add</button>`}
          </div>
        </section>`;
      }).join('')}
    </div>`,
  sum: () => `
    <p class="sum">
      <span class="chip"><span class="mk own"></span>1 of 3 of your own done</span>
      <span class="chip"><span class="mk teacher"></span>1 from your teacher</span>
      <span class="chip"><span class="mk stage"></span>Stage 4 is in 21 days</span>
    </p>`,
  after: () => `
    <section class="card after">
      <h3 class="eyebrow">After this week</h3>
      <ul>
        ${[ITEMS[6], ITEMS[7], ITEMS[8], ITEMS[9]].map((i) => `
        <li><span class="d">${when(i.d)}</span>${mk(i)}<span class="t">${title(i)}<small>${kindLine(i)}</small></span>${pill(i.d)}</li>`).join('')}
      </ul>
    </section>`,

  // ---------- Month ----------
  chip: (i) => `
    <a class="chip ${i.k === 'own' ? (i.done ? 'own isdone' : 'own') : i.done ? 'sdone' : i.k === 'stage' ? 'stage' : 'subj'}">
      ${i.done ? I.check : i.k === 'teacher' ? '' : mk(i)}<span class="x">${i.k === 'stage' ? 'Stage ' + i.n + (i.done ? ' signed off' : ' date') : i.t}</span>
    </a>`,
  month: (from, weeks, month) => `
    <div class="month">
      <div class="dow">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="grid">
        ${Array.from({ length: weeks * 7 }, (_, n) => {
          const d = add(from, n), its = on(d);
          return `
          <div class="cell ${n % 7 > 4 ? 'we' : ''} ${d.slice(0, 7) === month ? '' : 'out'} ${d === TODAY ? 'now pick' : ''}">
            <span class="n">${Number(d.slice(8))}</span>
            ${its.map(B.chip).join('')}
            <span class="dots">${its.map(mk).join('')}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`,
  picked: () => `
    <section class="sel">
      <div class="sel-h"><h3>Thu 12 Nov · today</h3><button class="btn btn-quiet" style="height:40px">${I.plusSm} Add</button></div>
      ${on(TODAY).map(B.item).join('')}
    </section>`,

  // ---------- Add my own item ----------
  sheet: () => `
    <div class="scrim"></div>
    <section class="sheet" role="dialog" aria-label="Add my own item">
      <div class="sh">
        <div>
          <h2>Add my own item</h2>
          <p class="private">${I.lock} Only you can see this. Your teachers can't.</p>
        </div>
        <button class="btn btn-quiet">Close</button>
      </div>
      <form>
        <div class="fld"><label>What is it?</label><div class="inp focus">French vocab test</div></div>
        <div class="fld">
          <span class="lab">Kind</span>
          <div class="kinds"><span class="on">Test</span><span>Essay</span><span>Deadline</span><span>Other</span></div>
        </div>
        <div class="fld">
          <label>Date</label>
          <div class="inp">Fri 13 Nov 2026 ${I.cal}</div>
          <div class="quick"><span>Today</span><span class="on">Tomorrow</span><span>Next Monday</span></div>
        </div>
        <div class="fld"><label>Class <span style="font-weight:400;color:var(--muted)">(optional)</span></label><div class="inp">No class ${I.down}</div></div>
      </form>
      <footer><button class="btn btn-primary">Save item</button><button class="btn btn-quiet">Cancel</button></footer>
    </section>`,

  page: (body) => { document.getElementById('root').innerHTML = B.appbar() + `<main>${B.snav()}${B.head()}${B.next()}${body}</main>`; },
};
