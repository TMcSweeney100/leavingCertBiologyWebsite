// The parts every frame shares: the app bar, the nav row from /home, and the component header with its tabs.
const svg = (d, w = 16, sw = 2) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  plus: svg('<path d="M12 5v14M5 12h14"/>', 18, 2.4),
  left: svg('<path d="M15 18l-6-6 6-6"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>', 18),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M3 3l18 18M10.6 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.5 6.6A16.600 16.6 0 0 0 2 12s3.500 7 10 7a9.900 9.900 0 0 0 4.200-.9M9.900 9.900a3 3 0 0 0 4.200 4.200"/>'),
  pencil: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', 13),
  alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.500v.01"/>'),
};

const S = {
  appbar: () => `
    <header class="appbar">
      <div style="display:flex;align-items:center"><b>Leaving Cert Practical</b><span class="school no-phone">Test School</span></div>
      <div class="who"><span class="no-phone">Tim Mc Sweeney</span><span class="sq"></span></div>
    </header>`,

  snav: () => `
    <nav class="snav" aria-label="Main">
      <span class="l"><a>Timeline</a><a class="subj on" aria-current="page">Biology</a></span>
      <a class="join">Join a class</a>
    </nav>`,

  // One heading for all three tabs: the title never changes as you move between them.
  chead: (tab) => `
    <div class="chead">
      <h1>Biology</h1>
      <p class="sub">Biology in Practice Investigation, 2027 · 6th Year Biology</p>
      <nav class="tabs" aria-label="Component sections">
        ${['Overview', 'Log', 'Sources'].map((t) => `<a class="${t === tab ? 'on' : ''}">${t}</a>`).join('')}
        <a class="off" aria-disabled="true">Word checker</a>
      </nav>
    </div>`,

  page: (inner) => { document.getElementById('root').innerHTML = S.appbar() + `<main>${S.snav()}${inner}</main>`; },
};
