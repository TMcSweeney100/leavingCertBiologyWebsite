// The student page's blocks, filled with Tim Mc Sweeney's real data from 6th Year Biology (10 Nov 2026).
// Each frame composes these, so the three frames can't drift apart.
const svg = (d, w = 18, sw = 2) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  check: svg('<path d="M5 12l5 5L19 7"/>', 16, 3),
  down: svg('<path d="M6 9l6 6 6-6"/>'),
  up: svg('<path d="M6 15l6-6 6 6"/>'),
  ext: svg('<path d="M14 4h6v6"/><path d="M10 14L20 4"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>', 16),
  eyeOff: svg('<path d="M9.9 9.9a3 3 0 1 0 4.2 4.2"/><path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-1.7 2.7"/><path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M2 2l20 20"/>', 16),
  back: svg('<path d="M15 18l-6-6 6-6"/>', 16),
};

const STAGES = [
  { n: 1, name: 'Initial Response to the Investigation Brief', due: '24 Sept 2026', cp: 'Initial ideas discussed with the teacher', s: 's', signed: '3 Nov', note: 'Perfect Tim!!!!', answers: 1 },
  { n: 2, name: 'Background Research', due: '14 Oct 2026', cp: 'Investigative log shared with the teacher', s: 's', signed: '3 Nov', answers: 1 },
  { n: 3, name: 'Designing and Planning the Experiment', due: '31 Oct 2026', cp: 'Plan discussed with the teacher (feasibility and safety)', s: 's', signed: '3 Nov', answers: 2 },
  { n: 4, name: 'Conducting the Experiment', due: '3 Dec 2026', cp: 'Experiment carried out under supervision, in line with the research and planning already shared', s: 'n' },
  { n: 5, name: 'Data Analysis and Conclusions', due: '2 Jan 2027', cp: 'Data analysis shared with the teacher', s: 'w' },
  { n: 6, name: 'Finalising the Biology in Practice Investigation Report', due: '1 Feb 2027', cp: 'Final report submitted to the teacher', s: 'n' },
];

const ENTRIES = [
  { k: 'source', w: 'Source', t: 'Marketing for dummies', m: 'Book · Sharon Quinn · Penguin, 2024' },
  { k: 'note', w: 'Note', t: 'Updated my work after teacher gave mne feeback, looked at thsi website ....', m: 'updated my work at drive.google.com/drive/folders/19lKpzueB2FOXn8fU5jBqj5nv2fcHYCCa' },
  { k: 'ai', w: 'AI use', t: 'Claude · Anthropic', m: 'Got claude to complie a list of experiments that would be related to this writeup' },
  { k: 'source', w: 'Source', t: 'Information on how membranes react to oxygen', m: 'Newspaper or magazine article · Sharon Quinn · World Science, 2024', open: true },
  { k: 'source', w: 'Source', t: 'Membranes Experiment Video', m: 'Video online · KSI · youtube.com' },
  { k: 'note', w: 'Note', t: 'Looked at planning out the experiment here -', m: 'I need to confirm, do I need to bring in any equipment, where Am I recording the plan. Is it an individual experiment' },
];

const B = {
  appbar: (phone) => `
    <header class="appbar">
      <div style="display:flex;align-items:center"><b>Leaving Cert Practical</b>${phone ? '' : '<span class="school">Test School</span>'}</div>
      <div class="who">${phone ? '' : 'Katelyn Hanlon'}<span class="btn"></span></div>
    </header>`,

  back: () => `
    <nav class="back" aria-label="Back to class">
      <span>${I.back} 6th Year Biology, Progress</span><span>${I.back} 6th Year Biology, Students</span>
    </nav>`,

  who: (phone) => `
    <section class="card who-card" style="${phone ? 'flex-wrap:wrap' : ''}">
      <span class="square" aria-hidden="true">TM</span>
      <div class="grow">
        <p class="muted">6th Year Biology · last log entry 7 days ago</p>
        <h1>Tim Mc Sweeney</h1>
      </div>
      <a class="btn btn-outline" style="${phone ? 'width:100%' : ''}">Open Tim's work ${I.ext}</a>
    </section>`,

  hero: () => `
    <section class="hero" aria-labelledby="h-progress">
      <h2 id="h-progress" class="eyebrow">Checkpoints</h2>
      <p class="big">Up to date · 3 of 6 signed off</p>
      <div class="steps" role="list" aria-label="Stages">
        ${STAGES.map((s) => `<a role="listitem" class="${s.s}" aria-label="Stage ${s.n}, ${s.s === 's' ? 'signed off' : s.s === 'w' ? 'waiting for you' : 'not due yet'}"><i></i>${s.n}</a>`).join('')}
      </div>
      <p class="counts"><span><b class="g">3</b> signed off</span><span><b class="a">1</b> waiting for you</span><span><b>2</b> not due yet</span></p>
    </section>`,

  waiting: () => `
    <section class="card waiting" aria-labelledby="h-wait">
      <p class="flag"><span id="h-wait"><span class="dot"></span>Waiting for you</span><span style="font-weight:600">Tim asked 7 days ago</span></p>
      <div class="body">
        <div class="stage-line">
          <span class="num" aria-hidden="true">5</span>
          <div>
            <p class="muted">Stage 5 · Data Analysis and Conclusions · due 2 Jan 2027</p>
            <p class="cp-text">Data analysis shared with the teacher</p>
          </div>
        </div>
        <div class="answer">
          <div class="ask">
            <strong>Tim's first request for this checkpoint</strong>
            <p style="color:var(--body)">No note from Tim.</p>
            <a class="work">Open Tim's work ${I.ext}<small>drive.google.com, opens in a new tab</small></a>
          </div>
          <div class="reply">
            <label>Note to Tim <span style="font-weight:400;color:var(--muted)">(optional)</span></label>
            <textarea></textarea>
            <p class="muted" style="display:flex;justify-content:space-between;gap:12px"><span>Keep it general: what's missing, not how to fix it.</span><span class="mono" style="font-size:12px">0 / 500</span></p>
            <div class="row"><span class="btn btn-primary">${I.check} Accept and sign off Stage 5</span><span class="btn btn-quiet">Not yet</span></div>
          </div>
        </div>
      </div>
    </section>`,

  checkpoints: ({ openStage = 1, narrow = false } = {}) => `
    <section class="card" aria-labelledby="h-cps">
      <div class="card-head" style="padding:16px 18px 6px"><h2 id="h-cps" class="h2">All checkpoints</h2><span class="muted">Tap one for its history</span></div>
      <ul class="cp-list">
        ${STAGES.map((s) => {
          const pill = s.s === 's' ? `<span class="pill s">${I.check} Signed off ${s.signed}</span>`
            : s.s === 'w' ? `<span class="pill w">Waiting for you</span>`
            : `<span class="pill n">Not due · ${s.due.replace(/ 20\d\d$/, '')}</span>`;
          const open = s.n === openStage;
          const dot = s.s === 's' ? I.check : s.n;
          return `<li>
            <div class="cp-row" style="${narrow ? 'grid-template-columns:32px minmax(0,1fr) 28px' : ''}">
              <span class="dot-num ${s.s}" aria-hidden="true">${dot}</span>
              <div><p class="m">Stage ${s.n} · ${s.name}</p><p class="t">${s.cp}</p>${narrow ? `<div style="margin-top:6px">${pill}</div>` : ''}</div>
              ${narrow ? '' : pill}
              <span class="chev">${open ? I.up : I.down}</span>
            </div>
            ${open ? `<div class="cp-open" style="${narrow ? 'padding-left:18px' : ''}">
              <div class="my-note"><small>Accepted 3 Nov 2026 · your note</small>“${s.note}”</div>
              <div class="row"><span class="btn btn-quiet">Full history (${s.answers} answer)</span><span class="btn btn-text" style="color:var(--grey)">Revoke sign-off</span></div>
            </div>` : ''}
          </li>`;
        }).join('')}
      </ul>
    </section>`,

  log: ({ narrow = false } = {}) => `
    <section class="card" aria-labelledby="h-log">
      <div style="padding:16px 18px 12px;display:flex;flex-direction:column;gap:12px">
        <div class="card-head"><h2 id="h-log" class="h2">Tim's log</h2><span class="muted">6 entries · all shared with you</span></div>
        <div class="filters" role="group" aria-label="Show">
          <span class="chip on" aria-pressed="true">All <b>6</b></span>
          <span class="chip">Sources <b>3</b></span>
          <span class="chip">Notes <b>2</b></span>
          <span class="chip">AI use <b>1</b></span>
        </div>
      </div>
      <h3 class="day eyebrow" style="border-top:1px solid var(--line)">Tue 3 Nov 2026 · 6 entries</h3>
      <ul class="log-list">
        ${ENTRIES.map((e) => `<li>
          <div class="log-row">
            <span><span class="kind ${e.k}">${e.w}</span></span>
            <div style="min-width:0"><p class="t">${e.t}</p><p class="m">${e.m}</p></div>
            <span class="chev">${e.open ? I.up : I.down}</span>
          </div>
          ${e.open ? `<div class="log-open" style="${narrow ? 'grid-template-columns:1fr;padding-left:18px' : ''}">
            <div><h4 class="eyebrow" style="color:var(--muted)">The source</h4>
              <dl class="facts"><dt>Type</dt><dd>Newspaper or magazine article</dd><dt>Author</dt><dd>Sharon Quinn</dd><dt>Publisher</dt><dd>World Science</dd><dt>Published</dt><dd>2024</dd><dt>Accessed</dt><dd>3 Nov 2026</dd></dl></div>
            <div><h4 class="eyebrow" style="color:var(--muted)">Tim's notes on it</h4>
              <dl class="facts" style="grid-template-columns:1fr"><dt>Page 38 · key information</dt><dd>Gives findings on how membranes react to oxygen with clearly outlined tests.</dd><dt>Why it's relevant</dt><dd>I can include these clear findings in my assumptions.</dd></dl></div>
            <p class="said"><small>Tim wrote</small>We can mention this in our investigation writeup that we were aware of this and we made sure not to cause the reaction</p>
          </div>` : ''}
        </li>`).join('')}
      </ul>
      <p class="private-line">${I.eyeOff} Entries Tim keeps private show only their kind and date.</p>
    </section>`,
};

// D — the checkpoints are the page: a card per stage, in order, actions visible, the waiting one open in place.
B.timeline = ({ phone = false } = {}) => `
  <ol class="tl" aria-label="Checkpoints">
    ${STAGES.map((s) => {
      const dot = s.s === 's' ? I.check : s.n;
      const head = `<p class="m">Stage ${s.n} · ${s.name} · due ${s.due.replace(/ 20\d\d$/, '')}</p>`;
      let card;
      if (s.s === 'w') {
        card = `<section class="card waiting" aria-labelledby="cp-${s.n}">
          <p class="flag"><span><span class="dot"></span>Waiting for you</span><span style="font-weight:600">Tim asked 7 days ago</span></p>
          <div class="body">
            <p class="m muted">Stage 5 · ${s.name} · due ${s.due}</p>
            <p id="cp-${s.n}" class="cp-text" style="font-size:21px;margin-top:2px">${s.cp}</p>
            <div class="answer" style="${phone ? 'grid-template-columns:1fr' : ''}">
              <div class="ask">
                <strong>Tim's first request for this checkpoint</strong>
                <p style="color:var(--body)">No note from Tim.</p>
                <a class="work">Open Tim's work ${I.ext}<small>drive.google.com, opens in a new tab</small></a>
              </div>
              <div class="reply">
                <label>Note to Tim <span style="font-weight:400;color:var(--muted)">(optional)</span></label>
                <textarea></textarea>
                <p class="muted" style="display:flex;justify-content:space-between;gap:12px"><span>Keep it general: what's missing, not how to fix it.</span><span class="mono" style="font-size:12px">0 / 500</span></p>
                <div class="row"><span class="btn btn-primary">${I.check} Accept and sign off Stage 5</span><span class="btn btn-quiet">Not yet</span></div>
              </div>
            </div>
          </div>
        </section>`;
      } else if (s.s === 's') {
        card = `<div class="card tl-card s"><div class="tl-row">
            <div class="grow">${head}<p class="t">${s.cp}</p>${s.note ? `<p class="mine"><small>Your note · </small>“${s.note}”</p>` : ''}</div>
            <div class="tl-acts"><span class="pill s">${I.check} Signed off ${s.signed}</span>
              <span class="btn btn-text">History (${s.answers})</span><span class="btn btn-text" style="color:var(--grey)">Revoke</span></div>
          </div></div>`;
      } else {
        card = `<div class="card tl-card n"><div class="tl-row">
            <div class="grow">${head}<p class="t">${s.cp}</p></div>
            <div class="tl-acts"><span class="pill n">Not due yet</span><span class="btn btn-outline">Sign off</span></div>
          </div></div>`;
      }
      return `<li class="tl-item ${s.s}"><div class="tl-rail"><span class="dot-num ${s.s}" aria-hidden="true">${dot}</span></div>${card}</li>`;
    }).join('')}
  </ol>`;

// D — the log as supporting evidence: the latest three, then the rest on request.
B.logCompact = () => `
  <section class="card" aria-labelledby="h-log">
    <div class="card-head" style="padding:16px 18px 10px"><h2 id="h-log" class="h2">Tim's log</h2><span class="muted">6 entries · last one 7 days ago</span></div>
    <ul class="log-list">
      ${ENTRIES.slice(0, 3).map((e) => `<li><div class="log-row">
        <span><span class="kind ${e.k}">${e.w}</span></span>
        <div style="min-width:0"><p class="t">${e.t}</p><p class="m">${e.m}</p></div>
        <span class="chev">${I.down}</span></div></li>`).join('')}
    </ul>
    <span class="btn btn-quiet show-all">Show all 6 entries</span>
  </section>`;
