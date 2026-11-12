// Background music: an original, slow ambient piece the browser plays live (no audio file).
// Dreamy chords in A minor on warm pads, a soft bass, sparse glass bells with echo, and faint rain.
// It's on by default, but browsers only allow sound after the first click or key, so it starts then.
(() => {
  const btn = document.getElementById('music');
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }
  const KEY = 'hui.musicMuted';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch {}

  const VOLUME = 0.5, BAR = 9; // seconds per chord
  // [bass, pad notes...] as MIDI numbers: Am9, Fmaj9, Cadd9 over E, Gadd9
  const CHORDS = [[45, 57, 60, 64, 67, 71], [41, 57, 60, 64, 67], [40, 55, 60, 62, 64], [43, 55, 59, 62, 69]];
  const BELLS = [69, 72, 74, 76, 79, 81, 84, 86, 88]; // A minor pentatonic, up high
  const hz = (n) => 440 * 2 ** ((n - 69) / 12);

  let ctx = null, master, padBus, bellBus, next = 0, bar = 0, step = 3, timer = 0, sleep = 0;

  // A soft room: decaying stereo noise used as the reverb's echo shape.
  const room = (seconds) => {
    const len = Math.round(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
    return buf;
  };

  function build() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    const verb = ctx.createConvolver();
    verb.buffer = room(5);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    verb.connect(wet).connect(master);
    padBus = ctx.createGain();
    padBus.connect(master);
    padBus.connect(verb);
    // bells get a slow echo that fades as it repeats
    bellBus = ctx.createGain();
    const echo = ctx.createDelay(2), back = ctx.createGain(), dull = ctx.createBiquadFilter();
    echo.delayTime.value = 0.62;
    back.gain.value = 0.38;
    dull.type = 'lowpass';
    dull.frequency.value = 2400;
    bellBus.connect(master);
    bellBus.connect(verb);
    bellBus.connect(echo).connect(dull).connect(back).connect(echo);
    dull.connect(verb);
    // faint rain: filtered noise, barely there
    const noise = ctx.createBufferSource();
    noise.buffer = room(4); // any noise will do; looped it sounds like distant rain
    noise.loop = true;
    const rain = ctx.createBiquadFilter(), rainVol = ctx.createGain();
    rain.type = 'bandpass';
    rain.frequency.value = 1400;
    rain.Q.value = 0.5;
    rainVol.gain.value = 0.035;
    noise.connect(rain).connect(rainVol).connect(master);
    noise.start();
  }

  function pad(notes, t) {
    const filter = ctx.createBiquadFilter(), vol = ctx.createGain();
    filter.type = 'lowpass';
    filter.Q.value = 0.3;
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(1100, t + BAR * 0.6); // opens up slowly, then closes
    filter.frequency.linearRampToValueAtTime(600, t + BAR + 3);
    vol.gain.setValueAtTime(0, t);
    vol.gain.linearRampToValueAtTime(0.045, t + 3);
    vol.gain.setValueAtTime(0.045, t + BAR - 0.5);
    vol.gain.linearRampToValueAtTime(0, t + BAR + 3.5);
    for (const n of notes) for (const cents of [-8, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(n);
      o.detune.value = cents;
      o.connect(filter);
      o.start(t);
      o.stop(t + BAR + 4);
    }
    filter.connect(vol).connect(padBus);
  }

  function bass(n, t) {
    const o = ctx.createOscillator(), vol = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = hz(n);
    vol.gain.setValueAtTime(0, t);
    vol.gain.linearRampToValueAtTime(0.16, t + 2.5);
    vol.gain.linearRampToValueAtTime(0, t + BAR + 1.5);
    o.connect(vol).connect(padBus);
    o.start(t);
    o.stop(t + BAR + 2);
  }

  // a glassy note: a pure tone plus a quieter, slightly out-of-tune overtone, ringing out
  function bell(n, t, loud) {
    const vol = ctx.createGain();
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(loud, t + 0.015);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    for (const [mul, level] of [[1, 1], [2.76, 0.18]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = hz(n) * mul;
      g.gain.value = level;
      o.connect(g).connect(vol);
      o.start(t);
      o.stop(t + 3.6);
    }
    vol.connect(bellBus);
  }

  // a few bells per chord, wandering up and down the scale a step or two at a time
  function bells(t) {
    let at = t + 0.6 + Math.random();
    while (at < t + BAR - 0.8) {
      step = Math.max(0, Math.min(BELLS.length - 1, step + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      bell(BELLS[step], at, 0.05 + Math.random() * 0.03);
      at += [1.2, 1.8, 2.4, 3][Math.floor(Math.random() * 4)];
    }
  }

  function schedule() {
    while (next < ctx.currentTime + 2) {
      const [low, ...notes] = CHORDS[bar % CHORDS.length];
      pad(notes, next);
      bass(low, next);
      if (bar > 0) bells(next); // the first chord plays alone
      next += BAR;
      bar++;
    }
  }

  let playing = false;
  const show = () => {
    btn.dataset.state = playing ? 'on' : muted ? 'off' : 'waiting';
    btn.setAttribute('aria-pressed', String(playing));
    btn.setAttribute('aria-label', playing ? 'Mute the music' : 'Play the music');
    const tip = document.getElementById('musicTip');
    if (tip) tip.textContent = playing ? 'Mute music' : 'Play music';
  };

  async function play() {
    if (!ctx) build();
    await ctx.resume().catch(() => {});
    if (ctx.state !== 'running') return false; // the browser still wants a click first
    clearTimeout(sleep);
    if (!next) next = ctx.currentTime + 0.1;
    schedule();
    clearInterval(timer);
    timer = setInterval(schedule, 500);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 1.2); // fades in
    playing = true;
    show();
    return true;
  }

  function quiet() {
    playing = false;
    show();
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    clearTimeout(sleep);
    sleep = setTimeout(() => { clearInterval(timer); ctx.suspend(); }, 2000); // stops using the CPU once it's silent
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
    if (!muted && !playing) play();
  };
  if (!muted) {
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, firstTouch, true);
    if (navigator.userActivation?.hasBeenActive) play();
  }
  // goes quiet while the tab is in the background, and comes back with it
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) { quiet(); playing = false; btn.dataset.resume = '1'; show(); }
    else if (!document.hidden && btn.dataset.resume) { delete btn.dataset.resume; play(); }
  });
  show();
})();
