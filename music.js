// Background music: your song, on a loop, unmuted on every visit. Browsers only allow sound after the
// first click or key, so it starts then. The picture in the corner mutes and unmutes it for this visit.
// Also the soft crystal chime the tour plays when it changes screen (silent while muted).
(() => {
  const btn = document.getElementById('music'), song = document.getElementById('song');
  if (!btn || !song) return;
  const VOLUME = 0.2; // the song is mastered loud; this keeps it well behind the page
  let muted = false, playing = false, fading = 0;

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

  // the picture shows "on" until you mute it, even in the moment before the browser lets sound start
  const show = () => {
    btn.dataset.state = muted ? 'off' : 'on';
    btn.setAttribute('aria-pressed', String(!muted));
    btn.setAttribute('aria-label', muted ? 'Play the music' : 'Mute the music');
  };

  function play() {
    if (playing || muted) return;
    if (song.paused) song.volume = 0;
    song.play().then(() => { playing = true; fadeTo(VOLUME, 1500); }).catch(() => {}); // still waiting for a click
  }
  function quiet() {
    playing = false;
    fadeTo(0, 450, () => song.pause());
  }

  btn.addEventListener('click', () => {
    muted = !muted;
    show();
    if (muted) quiet(); else play();
  });

  // starts with the first click or key anywhere (the picture's own click toggles instead)
  const firstTouch = (e) => {
    for (const ev of ['pointerdown', 'keydown']) removeEventListener(ev, firstTouch, true);
    if (!btn.contains(e.target)) play();
  };
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, firstTouch, true);
  play();

  // pauses while the tab is in the background, and comes back with it
  let resume = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) { resume = true; quiet(); }
    else if (!document.hidden && resume) { resume = false; play(); }
  });
  show();

  // the chime: a short glassy note from three slightly out-of-tune partials, with a soft echo
  const NOTES = [76, 79, 81, 83, 86, 88]; // a high, gentle scale, one per tour screen
  let ac = null, lastChime = 0;
  window.huiChime = (i = 0) => {
    const now = performance.now();
    if (muted || now - lastChime < 120) return; // never a flurry while scrolling fast
    lastChime = now;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ac) {
      ac = new AC();
      ac.out = ac.createGain();
      ac.out.gain.value = 0.07;
      const echo = ac.createDelay(1), back = ac.createGain(), dull = ac.createBiquadFilter();
      echo.delayTime.value = 0.21;
      back.gain.value = 0.3;
      dull.type = 'lowpass';
      dull.frequency.value = 3200;
      ac.out.connect(ac.destination);
      ac.out.connect(echo).connect(dull).connect(back).connect(echo);
      dull.connect(ac.destination);
    }
    if (ac.state !== 'running') ac.resume().catch(() => {});
    const t = ac.currentTime + 0.01, f = 440 * 2 ** ((NOTES[i % NOTES.length] - 69) / 12);
    for (const [mul, level, decay] of [[1, 1, 1.4], [2.76, 0.35, 0.8], [5.4, 0.12, 0.45]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(ac.out);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  };
})();
