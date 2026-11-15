// The progress tab's blocks, filled with 6th Year Biology's real sign-off state (10 Nov 2026).
// Stress case: every student has shared a link to their work (live, only Tim has).
// Each frame composes these, so the frames can't drift apart.
const svg = (d, w = 18, sw = 2) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  check: svg('<path d="M5 12l5 5L19 7"/>', 15, 3),
  ext: svg('<path d="M14 4h6v6"/><path d="M10 14L20 4"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>', 16),
  back: svg('<path d="M15 18l-6-6 6-6"/>', 16),
  down: svg('<path d="M6 9l6 6 6-6"/>'),
};

const STAGES = [
  { n: 1, short: 'Initial ideas', cp: 'Initial ideas discussed with the teacher', name: 'Initial Response to the Investigation Brief', due: '24 Sept', isDue: true },
  { n: 2, short: 'Investigative log', cp: 'Investigative log shared with the teacher', name: 'Background Research', due: '14 Oct', isDue: true },
  { n: 3, short: 'Plan discussed', cp: 'Plan discussed with the teacher (feasibility and safety)', name: 'Designing and Planning the Experiment', due: '31 Oct', isDue: true },
  { n: 4, short: 'Experiment carried out', cp: 'Experiment carried out under supervision', name: 'Conducting the Experiment', due: '3 Dec', isDue: false },
  { n: 5, short: 'Data analysis', cp: 'Data analysis shared with the teacher', name: 'Data Analysis and Conclusions', due: '2 Jan', isDue: false },
  { n: 6, short: 'Final report', cp: 'Final report submitted to the teacher', name: 'Finalising the Report', due: '1 Feb', isDue: false },
];

// s signed off · d due, not signed off · n not due yet · w waiting for you (asked for sign-off)
const S = (name, st, last = null) => ({ name, st: st.split(''), last });
const STUDENTS = [
  S('John Mc', 'dddnnn'), S('Saoirse Murphy', 'ddds nn'.replace(' ', '')),
  S('Aoife Brennan', 'ddssnn'), S('Aoife Byrne', 'sddnnn'), S('Niamh Fitzgerald-Kavanagh', 'sddsnn'), S('Jack Kelly', 'ddsnnn'),
  S('Éabha McCarthy', 'sddnnn'), S('Ciara Nolan', 'sddnnn'), S("Fionn O'Brien", 'ddsnnn'),
  ...['Oisín Brennan', 'Róisín Brennan', 'Róisín Byrne', 'Cian Doyle', 'Grace Doyle', 'Sadhbh Fitzgerald-Kavanagh', 'Seán Fitzgerald-Kavanagh',
    'Niamh Kelly', 'Sadhbh Kelly', 'Darragh Murphy', 'Éabha Ó Briain', 'Jack Ó Briain'].map((n) => S(n, 'ssdnnn')),
  S('Cian Walsh', 'ssdsnn'), S('Saoirse Walsh', 'ssdnnn'),
  ...['Fionn Byrne', 'Liam Doyle', 'Seán McCarthy', 'Darragh Ní Bhriain', 'Grace Ní Bhriain', 'Oisín Nolan', "Ciara O'Brien", 'Liam Walsh'].map((n) => S(n, 'sssnnn')),
  S('Tim Mc Sweeney', 'sssnwn', 7),
];
const TOTAL = STUDENTS.length;
const behind = (s) => s.st.filter((c, i) => STAGES[i].isDue && c === 'd').length;
const count = (i, c) => STUDENTS.filter((s) => s.st[i] === c).length;
const first = (name) => name.split(' ')[0];
const lastWords = (s) => (s.last == null ? 'No entries' : `${s.last} days ago`);
const pct = (n) => `${(100 * n) / TOTAL}%`;
const bar = (i) => `<b style="width:${pct(count(i, 's'))}"></b><u style="width:${pct(count(i, 'w'))}"></u>`;

function bands() {
  const by = new Map();
  STUDENTS.forEach((s) => { const b = behind(s); by.set(b, [...(by.get(b) || []), s]); });
  return [...by.entries()].sort((a, b) => b[0] - a[0]);
}

const B = {
  appbar: (phone) => `
    <header class="appbar" ${phone ? 'style="padding:0 16px"' : ''}>
      <div style="display:flex;align-items:center"><b>Leaving Cert Practical</b>${phone ? '' : '<span class="school">Test School</span>'}</div>
      <div class="who">${phone ? '' : 'Katelyn Hanlon'}<span class="btn"></span></div>
    </header>`,

  classHead: (phone) => `
    <div>
      <p class="crumb">${I.back} My classes</p>
      <h1 class="class-h1" ${phone ? 'style="font-size:26px"' : ''}>6th Year Biology</h1>
      <p class="class-sub">Biology, year 6, 2026/27</p>
      <div class="tabs"><span>Students</span><span>Component</span><span class="on">Progress</span></div>
    </div>`,

  waiting: () => `
    <section class="card waiting" aria-labelledby="h-wait">
      <h2 id="h-wait" class="flag"><i></i>1 waiting for you</h2>
      <div class="req">
        <div class="grow">
          <p class="t">Tim Mc Sweeney · Stage 5</p>
          <p class="muted">Data analysis shared with the teacher · asked 7 days ago</p>
        </div>
        <a class="btn btn-primary">Review</a>
      </div>
    </section>`,

  nameCell: (s) => `<span class="nm"><a class="name">${s.name}</a><a class="ext-btn" aria-label="Open ${first(s.name)}'s work">${I.ext}</a></span>`,

  hideNames: () => `<span class="switch" role="switch" aria-checked="false"><i></i>Hide names</span>`,

  // ── A ──
  stageTabs: (current) => `
    <nav class="card stage-tabs" aria-label="Stages">
      <a class="stage-tab ${current === 'all' ? 'on' : ''}"><span class="top"><span class="n">ALL</span></span><span class="t">Every stage</span><span class="due q">Overview</span></a>
      ${STAGES.map((st, i) => `
        <a class="stage-tab ${current === st.n ? 'on' : ''}" ${current === st.n ? 'aria-current="page"' : ''}>
          <span class="top"><span class="n">STAGE ${st.n}</span></span>
          <span class="t">${st.short}</span>
          <span class="bar">${bar(i)}</span>
          <span class="due ${st.isDue ? '' : 'q'}">${st.isDue ? `${TOTAL - count(i, 's')} to sign off` : `Due ${st.due}`}</span>
        </a>`).join('')}
    </nav>`,

  stageHero: (n) => {
    const i = n - 1; const st = STAGES[i];
    return `
    <section class="hero" aria-labelledby="h-stage">
      <p class="eyebrow">Stage ${n} · ${st.name} · due ${st.due}</p>
      <h2 id="h-stage" class="big">${st.cp}</h2>
      <div class="bar">${bar(i)}</div>
      <p class="counts"><span><b class="g">${count(i, 's')}</b> signed off</span><span><b class="a">${count(i, 'w')}</b> waiting</span><span><b>${TOTAL - count(i, 's') - count(i, 'w')}</b> not yet</span></p>
    </section>`;
  },

  todo: (n, phone) => {
    const i = n - 1;
    const rows = STUDENTS.filter((s) => s.st[i] === 'd' || s.st[i] === 'n').sort((a, b) => behind(b) - behind(a));
    return `
    <section class="card" aria-labelledby="h-todo">
      <div class="list-head"><h2 id="h-todo" class="h2">Still to sign off · ${rows.length}</h2><span class="muted">Furthest behind first</span></div>
      <ul class="st-list">
        ${rows.map((s) => {
          const b = behind(s);
          return `<li>
            <span class="behind-chip ${b ? '' : 'z'}" title="${b} due checkpoints not signed off">${b}</span>
            <div class="grow">${B.nameCell(s)}<span class="m">${b ? `<b>${b} behind</b>` : 'Up to date'} · ${lastWords(s)}</span></div>
            <button class="btn btn-outline" aria-label="Sign off Stage ${n} for ${s.name}">Sign off</button>
          </li>`;
        }).join('')}
      </ul>
    </section>`;
  },

  done: (n) => {
    const i = n - 1;
    const rows = STUDENTS.filter((s) => s.st[i] === 's');
    return `
    <section class="card done-row">
      <div><h2 class="h2" style="font-size:16px">Signed off · ${rows.length}</h2>
      <p class="names">${rows.slice(0, 3).map((s) => s.name).join(', ')} and ${rows.length - 3} more</p></div>
      <button class="btn btn-quiet">Show ${I.down}</button>
    </section>`;
  },

  // ── B ──
  classHero: () => {
    const behindN = STUDENTS.filter((s) => behind(s) > 0).length;
    return `
    <section class="ghero cols" aria-labelledby="h-class">
      <div class="lead"><p class="eyebrow">This class</p><h2 id="h-class" class="big">${behindN} of ${TOTAL} behind</h2><p>Stages 1–3 are due. Pick a stage to sign off one at a time.</p></div>
      ${STAGES.map((st, i) => `
        <a class="gcol">
          <span class="n">STAGE ${st.n}</span>
          <span class="t">${st.short}</span>
          <span class="bar">${bar(i)}</span>
          <span class="c"><b>${count(i, 's')}</b>/${TOTAL} · ${st.isDue ? '<span class="due">Due</span>' : `due ${st.due}`}</span>
        </a>`).join('')}
      <span class="logh">Last log entry</span>
    </section>`;
  },

  legend: () => `
    <p class="legend" aria-label="Key">
      <span><span class="tick">${I.check}</span>Signed off</span>
      <span><span class="sign-due" style="height:28px">Sign off</span>Due, not signed off</span>
      <span><span class="none" style="margin:0 4px"></span>Not due yet (hover to sign off early)</span>
      <span><span class="wait" style="height:28px"><i style="width:20px;height:20px">5</i>Review</span>Waiting for you</span>
    </p>`,

  cell: (c, i) => {
    if (c === 's') return `<span class="tick" title="Signed off 3 Nov">${I.check}</span>`;
    if (c === 'd') return `<button class="sign-due">Sign off</button>`;
    if (c === 'w') return `<a class="wait"><i>${i + 1}</i>Review</a>`;
    return `<span class="none" title="Not due yet"></span>`;
  },

  // ── A, "All" tab ──
  allHero: () => {
    const bs = bands();
    const behindN = STUDENTS.filter((s) => behind(s) > 0).length;
    return `
    <section class="hero" aria-labelledby="h-all">
      <p class="eyebrow">Every stage · Stages 1–3 are due</p>
      <h2 id="h-all" class="big">${behindN} of ${TOTAL} students are behind</h2>
      <div class="bar"><b style="width:${pct(TOTAL - behindN)}"></b><u style="width:${pct(behindN)}"></u></div>
      <p class="counts">${bs.map(([b, list]) => b
        ? `<span><b class="a">${list.length}</b> ${list.length === 1 ? 'is' : 'are'} ${b} behind</span>`
        : `<span><b class="g">${list.length}</b> up to date</span>`).join('')}</p>
    </section>`;
  },

  gridHead: () => `
    <div class="cols ghead">
      <div>Student</div>
      ${STAGES.map((st) => `<div><span class="n">${st.n}</span><a>${st.short}</a><span class="${st.isDue ? 'due' : 'q'}">${st.isDue ? 'Due' : st.due}</span></div>`).join('')}
      <div>Last entry</div>
    </div>`,

  dots: (s) => `<span class="dots" aria-label="Stages: ${s.st.map((c, i) => `${i + 1} ${({ s: 'signed off', d: 'due', n: 'not due', w: 'waiting' })[c]}`).join(', ')}">
    ${s.st.map((c, i) => `<i class="${c}">${c === 's' ? I.check : i + 1}</i>`).join('')}</span>`,

  allList: () => `
    ${bands().map(([b, list]) => `
      <section class="card" aria-label="${b ? `${b} behind` : 'Up to date'}">
        <div class="band" style="border-radius:10px 10px 0 0">${b ? `<span class="num">${b}</span><span class="lbl">behind</span>` : '<span class="lbl">Up to date</span>'}<span class="cnt">· ${list.length} students</span></div>
        <ul class="st-list">
          ${(b ? list : list.filter((s) => s.st.includes('w'))).map((s) => `<li>
            <div class="grow">${B.nameCell(s)}${B.dots(s)}</div>
            <span class="chev">›</span>
          </li>`).join('')}
        </ul>
        ${b ? '' : `<div class="collapsed" style="border-radius:0 0 10px 10px"><span class="muted">8 more, all signed off so far</span><button class="btn btn-quiet" style="height:36px">Show ${I.down}</button></div>`}
      </section>`).join('')}`,

  grid: ({ collapseUpToDate, head } = {}) => `
    <section class="card grid" aria-label="Checkpoint sign-offs, furthest behind first">
      ${head ? B.gridHead() : ''}
      ${bands().map(([b, list]) => {
        const head = `<div class="band">${b ? `<span class="num">${b}</span><span class="lbl">behind</span>` : '<span class="lbl">Up to date</span>'}<span class="cnt">· ${list.length} students</span></div>`;
        if (!b && collapseUpToDate) {
          const waiting = list.filter((s) => s.st.includes('w'));
          return head + waiting.map(B.row).join('') +
            `<div class="collapsed"><span class="muted">${list.length - waiting.length} more, all signed off so far</span><button class="btn btn-quiet" style="height:36px">Show ${I.down}</button></div>`;
        }
        return head + list.map(B.row).join('');
      }).join('')}
    </section>`,

  row: (s) => `
    <div class="cols grow-row">
      <div>${B.nameCell(s)}</div>
      ${s.st.map((c, i) => `<div class="cell">${B.cell(c, i)}</div>`).join('')}
      <div class="logc ${s.last == null ? '' : 'has'}">${s.last == null ? '–' : lastWords(s)}</div>
    </div>`,
};
