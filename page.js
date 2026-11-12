// Everything the download page does, except the sky (sky.js), the music (music.js) and the 3D logo (hero3d.js).
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches; // a mouse, not a finger
const mouse = window.mouse = { x: -1e4, y: -1e4 }; // shared with sky.js
const H_PATH = 'M26 0H36V24a8 8 0 0 0 8 8H56a8 8 0 0 0 8-8V0H74a26 26 0 0 1 26 26V74a26 26 0 0 1-26 26H64V76a8 8 0 0 0-8-8H44a8 8 0 0 0-8 8V100H26A26 26 0 0 1 0 74V26A26 26 0 0 1 26 0Z';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
if (fine) {
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.documentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -1e4; });
}

// Version, size, link and changelog come from the same file HuiClient checks for updates,
// so this page never needs editing for a release.
fetch('latest.json', { cache: 'no-cache' }).then((r) => r.json()).then((v) => {
  const file = v.url.split('/').pop();
  for (const a of document.querySelectorAll('[data-get]')) a.href = v.url;
  for (const m of document.querySelectorAll('[data-meta]')) m.textContent = `Version ${v.version}, ${Math.round(v.size / 1048576)} MB. For Windows 10 and 11.`;
  const latest = (v.changelog || [])[0];
  if (latest && latest.sections.length) {
    const box = document.getElementById('newBox');
    const h = document.createElement('h3');
    h.textContent = `${latest.version}: ${latest.title}`;
    const t = document.createElement('time');
    t.dateTime = latest.date;
    t.textContent = new Date(`${latest.date}T12:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
    box.append(h, t);
    for (const [, items] of latest.sections) {
      const ul = document.createElement('ul');
      for (const text of items) { const li = document.createElement('li'); li.textContent = text; ul.append(li); }
      box.append(ul);
    }
    document.getElementById('news').hidden = false;
  }
  document.getElementById('checkCmd').textContent = `(Get-FileHash .\\${file}).Hash`;
  document.getElementById('hash').textContent = v.sha256.toUpperCase();
  for (const id of ['checkIntro', 'checkBox', 'hashBox']) document.getElementById(id).hidden = false;
}).catch(() => {}); // the buttons still lead to the latest release

// Smooth scrolling: the page glides after the wheel instead of jumping.
if (!still && window.Lenis) {
  const lenis = window.lenis = new Lenis({ lerp: 0.085 });
  const tick = (t) => { lenis.raf(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
const scrollToY = (y) => (window.lenis ? window.lenis.scrollTo(y, { duration: 1.3 }) : scrollTo({ top: y, behavior: still ? 'auto' : 'smooth' }));

// The header gets out of the way while you read down, and comes back when you scroll up or tab into it.
(() => {
  const head = document.querySelector('.site-head');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    head.classList.toggle('solid', y > 24);
    if (Math.abs(y - lastY) > 4) head.classList.toggle('away', y > lastY && y > 180);
    lastY = y;
  }, { passive: true });
  head.addEventListener('focusin', () => head.classList.remove('away'));
})();

// The name comes in letter by letter; screen readers still read it as one word.
(() => {
  const h1 = document.querySelector('h1'), name = h1.textContent;
  h1.setAttribute('aria-label', name);
  h1.replaceChildren(...[...name].map((ch, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = ch;
    s.style.setProperty('--i', i);
    s.setAttribute('aria-hidden', 'true');
    return s;
  }));
})();

// Headings slide up from behind their own edge, and the rest rises into place as you reach it.
(() => {
  for (const h of document.querySelectorAll('main h2')) {
    const inner = document.createElement('span'), line = document.createElement('span');
    inner.textContent = h.textContent;
    line.className = 'line';
    line.append(inner);
    h.replaceChildren(line);
    h.classList.add('rise');
  }
  const items = [...document.querySelectorAll('.reveal, h2.rise')];
  if (still) { items.forEach((el) => el.classList.add('in')); return; }
  document.querySelectorAll('.steps li').forEach((li, i) => li.style.setProperty('--d', `${i * 0.09}s`));
  document.querySelectorAll('.cta .reveal').forEach((el, i) => el.style.setProperty('--d', `${0.15 + i * 0.1}s`));
  const io = new IntersectionObserver((list) => {
    for (const e of list) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  items.forEach((el) => io.observe(el));
})();

// The statement lights up word by word as you scroll through it.
(() => {
  const p = document.getElementById('statement'), sec = p.closest('.statement');
  const words = p.textContent.split(' ');
  p.setAttribute('aria-label', p.textContent);
  p.replaceChildren(...words.flatMap((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    s.setAttribute('aria-hidden', 'true');
    return i ? [' ', s] : [s];
  }));
  const spans = [...p.querySelectorAll('.w')];
  if (still) { spans.forEach((s) => s.classList.add('lit')); return; }
  const update = () => {
    const r = sec.getBoundingClientRect();
    const k = clamp(-r.top / (r.height - innerHeight), 0, 1);
    const lit = Math.round(k * 1.25 * spans.length); // all lit a little before the pin lets go
    spans.forEach((s, i) => s.classList.toggle('lit', i < lit));
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();

// HuiClient's H as the cursor, for mice only, and not when motion is turned down.
if (fine && !still) {
  const cur = document.createElement('div');
  cur.className = 'cursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = `<svg viewBox="0 0 100 100"><path d="${H_PATH}"/></svg>`;
  document.body.append(cur);
  document.documentElement.classList.add('own-cursor');
  let x = -1e4, y = -1e4, lean = 0;
  const tick = () => {
    if (mouse.x > -1e3) {
      if (x < -1e3) { x = mouse.x; y = mouse.y; } // first move: start where the mouse is
      const nx = x + (mouse.x - x) * 0.45, ny = y + (mouse.y - y) * 0.45;
      lean += (clamp((nx - x) * 1.4, -28, 28) - lean) * 0.15;
      x = nx; y = ny;
      cur.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${lean}deg)`;
      cur.classList.add('on');
    } else cur.classList.remove('on');
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.addEventListener('pointerover', (e) => cur.classList.toggle('hover', !!e.target.closest('a, button')));
  addEventListener('pointerdown', () => cur.classList.add('down'));
  addEventListener('pointerup', () => cur.classList.remove('down'));
}

// The opening: the logo spins in big in the middle of a black screen, then glides down into its place
// while the site fades in. It never leaves the page, it's only pinned and then let go, so there's no jump.
// Until it lands nothing scrolls and clicks do nothing (except start the music).
(() => {
  const html = document.documentElement, stage = document.getElementById('stage'), slot = document.getElementById('stageSlot');
  const start3d = () => import('./hero3d.js')
    .then((m) => { m.start(stage, { still, mouse }); stage.classList.add('is-3d'); return true; })
    .catch((e) => { console.warn('3D logo off:', e.message); return false; });
  if (still) { start3d(); return; } // no opening when motion is turned down

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  window.lenis?.stop();
  const shield = document.createElement('div');
  shield.className = 'intro-shield';
  document.body.append(shield);
  const KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter']);
  const blockKey = (e) => { if (KEYS.has(e.key)) e.preventDefault(); };
  const blockScroll = (e) => e.preventDefault();
  addEventListener('keydown', blockKey, true);
  addEventListener('wheel', blockScroll, { capture: true, passive: false });
  addEventListener('touchmove', blockScroll, { capture: true, passive: false });

  const place = (r) => Object.assign(stage.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const big = () => { const w = Math.min(innerWidth, innerHeight * 1.2) * 0.98; return { left: (innerWidth - w) / 2, top: (innerHeight - w / 1.2) / 2, width: w, height: w / 1.2 }; };
  stage.classList.add('flying');
  place(big());
  const followResize = () => place(big());
  addEventListener('resize', followResize);

  const unlock = () => {
    stage.classList.remove('flying', 'landing');
    stage.removeAttribute('style'); // back to filling its slot, which is exactly where it already is
    shield.remove();
    removeEventListener('keydown', blockKey, true);
    removeEventListener('wheel', blockScroll, { capture: true });
    removeEventListener('touchmove', blockScroll, { capture: true });
    html.classList.remove('locked');
    window.lenis?.start();
  };
  let flown = false;
  const land = () => {
    if (flown) return;
    flown = true;
    removeEventListener('resize', followResize);
    html.classList.remove('opening'); // the site fades in while the logo travels
    stage.classList.add('landing');
    place(slot.getBoundingClientRect());
    stage.addEventListener('transitionend', (e) => { if (e.propertyName === 'width') unlock(); }, { once: false });
    setTimeout(() => { if (html.classList.contains('locked')) unlock(); }, 1500); // in case the end event is missed
  };
  start3d().then((ok) => setTimeout(land, ok ? 1800 : 0)); // lands once it has finished spinning in
  setTimeout(land, 7000); // never stuck if the logo is slow to load
})();

// Copy buttons say so when they've copied, like Quick Log In's code does in HuiClient.
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const box = document.getElementById(b.dataset.copy);
  let done = await navigator.clipboard.writeText(box.textContent).then(() => true, () => false);
  if (!done) { // some browsers block the clipboard: select the text, try the older copy, or let Ctrl+C do it
    getSelection().selectAllChildren(box);
    done = document.execCommand('copy');
  }
  b.textContent = done ? 'Copied' : 'Press Ctrl+C';
  b.classList.toggle('done', done);
  clearTimeout(b.timer);
  b.timer = setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, done ? 1600 : 3000);
});

// The tour stays pinned while scrolling steps through the screens; the tabs jump there.
// The pill and the screenshot slide over, fast at first and slowing down as they arrive, with a soft chime.
(() => {
  const sec = document.getElementById('tourSec'), bar = sec.querySelector('.tour-tabs'), pill = bar.querySelector('.tour-pill');
  const tabs = [...bar.querySelectorAll('[role=tab]')], view = document.getElementById('tourView');
  const say = document.getElementById('tourSay'), progress = document.getElementById('tourProgress');
  let front = document.getElementById('shotA'), back = document.getElementById('shotB');
  const STEP = 0.62; // screens' worth of scrolling per tab
  sec.style.height = `calc(100vh + ${tabs.length * STEP * 100}vh)`;
  for (const t of tabs) new Image().src = `${t.dataset.shot}.jpg`; // ready before their turn
  let current = 0;

  const movePill = (t, animate = true) => {
    pill.style.transition = animate && !still ? '' : 'none';
    pill.style.transform = `translateX(${t.offsetLeft}px)`;
    pill.style.width = `${t.offsetWidth}px`;
    // on narrow screens the bar scrolls itself (never the page) to keep the pill in view
    bar.scrollTo({ left: t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' });
  };
  const slide = (t, dir) => {
    back.src = `${t.dataset.shot}.jpg`;
    back.alt = t.dataset.alt;
    back.removeAttribute('aria-hidden');
    front.alt = '';
    front.setAttribute('aria-hidden', 'true');
    const opts = { duration: still ? 0 : 850, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' };
    back.style.opacity = 1;
    back.style.zIndex = 2;
    front.style.zIndex = 1;
    back.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'translateX(0)' }], opts);
    front.animate([{ transform: 'translateX(0)', opacity: 1, filter: 'brightness(1)' }, { transform: `translateX(${-dir * 28}%)`, opacity: 0.2, filter: 'brightness(.5)' }], opts);
    [front, back] = [back, front];
  };
  const select = (i, { focus = false } = {}) => {
    i = clamp(i, 0, tabs.length - 1);
    if (i === current) return;
    const dir = i > current ? 1 : -1, t = tabs[i];
    current = i;
    tabs.forEach((x, j) => { x.setAttribute('aria-selected', String(j === i)); x.tabIndex = j === i ? 0 : -1; });
    view.setAttribute('aria-labelledby', t.id);
    if (focus) t.focus({ preventScroll: true });
    movePill(t);
    slide(t, dir);
    say.classList.add('swap');
    setTimeout(() => { say.textContent = t.dataset.say; say.classList.remove('swap'); }, still ? 0 : 200);
    window.huiChime?.(i);
  };
  // where the page has to be for tab i
  const topOf = () => sec.getBoundingClientRect().top + scrollY;
  const stepPx = () => (sec.offsetHeight - innerHeight) / tabs.length;
  // a picked tab shows at once; the screens in between aren't flicked through while the page glides there
  let hold = 0;
  const goTo = (i) => { hold = performance.now() + 1500; scrollToY(topOf() + (i + 0.5) * stepPx()); };
  const onScroll = () => {
    const into = scrollY - topOf();
    progress.style.setProperty('--p', clamp(into / (sec.offsetHeight - innerHeight), 0, 1));
    if (performance.now() < hold) return;
    if (into < -innerHeight * 0.5 || into > sec.offsetHeight) return; // only while it's on screen
    select(Math.floor(clamp(into / stepPx(), 0, tabs.length - 1)));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => movePill(tabs[current], false));
  bar.addEventListener('click', (e) => { const t = e.target.closest('[role=tab]'); if (t) { select(tabs.indexOf(t)); goTo(tabs.indexOf(t)); } });
  bar.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(clamp(to, 0, tabs.length - 1), { focus: true });
    goTo(clamp(to, 0, tabs.length - 1));
  });
  document.fonts?.ready.then(() => movePill(tabs[current], false));
  movePill(tabs[0], false);

  // a slight tilt toward the cursor
  if (!fine || still) return;
  view.addEventListener('pointermove', (e) => {
    const r = view.getBoundingClientRect();
    view.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 5}deg`);
    view.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -4}deg`);
  });
  view.addEventListener('pointerleave', () => { view.style.removeProperty('--rx'); view.style.removeProperty('--ry'); });
})();
