// Background music: your song, on a loop, unmuted on every visit. Browsers only allow sound after the
// first click or key, so it starts then. The picture in the corner mutes and unmutes it for this visit.
// Also the soft crystal chime the tour plays when it changes screen (silent while muted).
(() => {
  const btn = document.getElementById('music'), song = document.getElementById('song');
  if (!btn || !song) return;
  const VOLUME = 0.12; // the song is mastered loud; this keeps it well behind the page
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

  // keeps playing when you switch to another browser tab; only the picture stops it
  show();

  // the tab sound: a soft airy swoosh with no pitch (so it never clashes with the song), sweeping
  // fast at first and settling, like the slide it goes with
  let ac = null, noise = null, lastSwoosh = 0;
  const audio = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ac) {
      ac = new AC();
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    }
    if (ac.state !== 'running') ac.resume().catch(() => {});
    return ac;
  };
  window.huiChime = (i = 0) => {
    const now = performance.now();
    if (muted || now - lastSwoosh < 120) return; // never a flurry while scrolling fast
    lastSwoosh = now;
    if (!audio()) return;
    const t = ac.currentTime + 0.01, src = ac.createBufferSource(), band = ac.createBiquadFilter(), vol = ac.createGain(), pan = ac.createStereoPanner();
    src.buffer = noise;
    band.type = 'bandpass';
    band.Q.value = 1.1;
    band.frequency.setValueAtTime(2600, t);
    band.frequency.exponentialRampToValueAtTime(700, t + 0.42);
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(0.05, t + 0.07);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    pan.pan.setValueAtTime(0.35, t); // moves across, like the screenshot does
    pan.pan.linearRampToValueAtTime(-0.35, t + 0.45);
    src.connect(band).connect(vol).connect(pan).connect(ac.destination);
    src.start(t);
    src.stop(t + 0.55);
  };

  // The logo's easter egg: a whoosh as it jumps, a glittery scatter while the shards fly, a soft thump when it lands.
  // It plays even with the music muted, since it only ever comes from a click on the logo.
  window.huiPop = () => {
    if (!audio()) return;
    const t = ac.currentTime + 0.02;
    // whoosh up
    const src = ac.createBufferSource(), band = ac.createBiquadFilter(), vol = ac.createGain();
    src.buffer = noise;
    band.type = 'bandpass';
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(500, t);
    band.frequency.exponentialRampToValueAtTime(3400, t + 0.38);
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(0.07, t + 0.12);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    src.connect(band).connect(vol).connect(ac.destination);
    src.start(t);
    src.stop(t + 0.55);
    // glitter: tiny high tings, scattered left and right
    for (let i = 0; i < 16; i++) {
      const at = t + 0.16 + Math.random() * 0.8, o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner();
      o.type = 'sine';
      o.frequency.value = 3200 + Math.random() * 4200;
      p.pan.value = Math.random() * 1.6 - 0.8;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.018 + Math.random() * 0.02, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09 + Math.random() * 0.1);
      o.connect(g).connect(p).connect(ac.destination);
      o.start(at);
      o.stop(at + 0.25);
    }
    // thump on landing (the jump lasts 1.5s and lands at 80%)
    const land = t + 1.2, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, land);
    o.frequency.exponentialRampToValueAtTime(55, land + 0.18);
    g.gain.setValueAtTime(0.0001, land);
    g.gain.exponentialRampToValueAtTime(0.16, land + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, land + 0.28);
    o.connect(g).connect(ac.destination);
    o.start(land);
    o.stop(land + 0.3);
  };
})();
