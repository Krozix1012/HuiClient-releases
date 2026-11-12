// Background music: your song, on a loop. On by default, but browsers only allow sound after the
// first click or key, so it starts then. The picture in the corner mutes and unmutes it.
(() => {
  const btn = document.getElementById('music'), song = document.getElementById('song');
  if (!btn || !song) return;
  const KEY = 'hui.musicMuted';
  const VOLUME = 0.3; // the song is mastered loud; this keeps it behind the page
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch {}
  let playing = false, fading = 0;

  // volume fades on a timer, not animation frames, so they still finish in a background tab
  const fadeTo = (target, ms, then) => {
    clearInterval(fading);
    const from = song.volume, start = performance.now();
    fading = setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / ms);
      song.volume = from + (target - from) * k;
      if (k === 1) { clearInterval(fading); then?.(); }
    }, 30);
  };

  const show = () => {
    btn.dataset.state = playing ? 'on' : muted ? 'off' : 'waiting';
    btn.setAttribute('aria-pressed', String(playing));
    btn.setAttribute('aria-label', playing ? 'Mute the music' : 'Play the music');
  };

  function play() {
    if (playing) return;
    if (song.paused) song.volume = 0;
    song.play().then(() => { playing = true; show(); fadeTo(VOLUME, 1500); }).catch(() => {}); // still waiting for a click
  }
  function quiet() {
    playing = false;
    show();
    fadeTo(0, 450, () => song.pause());
  }

  btn.addEventListener('click', () => {
    if (playing) { muted = true; quiet(); }
    else { muted = false; play(); }
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch {}
  });

  // on by default: start now if the browser allows it, otherwise with the first click or key anywhere
  const firstTouch = (e) => {
    for (const ev of ['pointerdown', 'keydown']) removeEventListener(ev, firstTouch, true);
    if (btn.contains(e.target)) return; // the button's own click starts it, so it isn't toggled twice
    if (!muted) play();
  };
  if (!muted) {
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, firstTouch, true);
    play();
  }
  // pauses while the tab is in the background, and comes back with it
  let resume = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) { resume = true; quiet(); }
    else if (!document.hidden && resume) { resume = false; play(); }
  });
  show();
})();
