// The hero: HuiClient's H as a chrome 3D logo. It spins in once, then tilts toward the mouse,
// floats a little, glints, and turns away as you scroll past it.
import * as THREE from './vendor/three.module.min.js';
import { SVGLoader } from './vendor/SVGLoader.js';
import { toCreasedNormals } from './vendor/BufferGeometryUtils.js';

const H = 'M26 0H36V24a8 8 0 0 0 8 8H56a8 8 0 0 0 8-8V0H74a26 26 0 0 1 26 26V74a26 26 0 0 1-26 26H64V76a8 8 0 0 0-8-8H44a8 8 0 0 0-8 8V100H26A26 26 0 0 1 0 74V26A26 26 0 0 1 26 0Z';

// Chrome only looks like chrome when it mirrors strong contrast, so the logo reflects a black
// photo studio with a few bright light strips. They slide across it as it tilts.
function studio() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x000000);
  const strip = (w, h, pos, glow) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(glow, glow, glow), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  // wide and gentle, not thin and blinding: tiny bright lights turn into speckle on the rounded edges
  strip(9, 1.8, [0, 4.5, 3.5], 3); // a long softbox above, toward the viewer
  strip(2.4, 8, [-5.5, 0.5, 2.5], 1.3); // a tall one on the left
  strip(2, 6, [5.5, -1, 1], 0.8); // a dimmer one on the right
  strip(3, 3, [3, 3.5, -4], 1.8); // a square light behind
  strip(14, 3, [0, -6, 1], 0.35); // a faint glow from the floor
  // behind the viewer: what the logo's front face mirrors. Bright above, dark below, with two light bands
  // that sweep across the face as it tilts.
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const g = c.getContext('2d');
  const fade = g.createLinearGradient(0, 0, 0, 256);
  fade.addColorStop(0, '#fff'); fade.addColorStop(0.45, '#8a8a8a'); fade.addColorStop(0.62, '#1c1c1c'); fade.addColorStop(1, '#000');
  g.fillStyle = fade; g.fillRect(0, 0, 8, 256);
  g.fillStyle = '#fff'; g.fillRect(0, 92, 8, 7); g.fillRect(0, 170, 8, 3);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), new THREE.MeshBasicMaterial({ map, color: new THREE.Color(2.2, 2.2, 2.2), side: THREE.DoubleSide }));
  wall.position.set(0, 0.5, 7);
  wall.lookAt(0, 0, 0);
  env.add(wall);
  return env;
}

// A soft four-pointed glint, drawn once and reused by every sparkle.
function glintTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const halo = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  halo.addColorStop(0, '#fff');
  halo.addColorStop(0.18, '#ffffffaa');
  halo.addColorStop(1, '#fff0');
  g.fillStyle = halo;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#fff';
  for (const [w, h] of [[3, 128], [128, 3]]) g.fillRect(64 - w / 2, 64 - h / 2, w, h);
  return new THREE.CanvasTexture(c);
}

export function start(host, { still, mouse }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.04).texture; // a little blur keeps the reflections smooth (0.04 is about the most it allows)
  pmrem.dispose();

  const path = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${H}"/></svg>`).paths[0];
  // The outline ends on its own starting point. That zero-length edge leaves the bevel no direction
  // there and showed as a dark notch, so repeated points are dropped first.
  const shapes = SVGLoader.createShapes(path).map((s) => {
    const pts = s.getPoints(28).filter((p, i, all) => p.distanceTo(all[(i + 1) % all.length]) > 0.05);
    return new THREE.Shape(pts);
  });
  // The rounded edge is made of thin facets; shaded one by one, they speckle at an angle.
  // Smoothing the shading across them (but keeping the sharp front and back edges) makes it one clean curve.
  const raw = new THREE.ExtrudeGeometry(shapes, { depth: 14, bevelEnabled: true, bevelThickness: 7, bevelSize: 4.5, bevelSegments: 10 });
  const flat = raw.getAttribute('normal').clone();
  const geo = toCreasedNormals(raw, Math.PI / 5);
  const caps = geo.groups[0]; // the flat front and back faces keep their own straight-on shading
  const normal = geo.getAttribute('normal');
  for (let i = caps.start; i < caps.start + caps.count; i++) normal.setXYZ(i, flat.getX(i), flat.getY(i), flat.getZ(i));
  geo.center();
  geo.rotateX(Math.PI); // SVG's y points down
  // a touch less than a perfect mirror, so the thin bevels don't shimmer
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 });
  const logo = new THREE.Group();
  logo.add(new THREE.Mesh(geo, chrome));
  scene.add(logo);
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-80, 140, 160);
  const rim = new THREE.DirectionalLight(0xffffff, 1.8);
  rim.position.set(140, -60, -120);
  scene.add(key, rim);

  // glints: one of the four outer corners flashes now and then, one at a time, never sitting on the face.
  // They're drawn on top (so the bevels never cut them in half) and only while the front faces you.
  const glint = glintTexture();
  const glints = [[-44, 43], [44, 43], [44, -43], [-44, -43]].map(([x, y]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glint, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true }));
    s.position.set(x, y, 16);
    s.renderOrder = 2;
    s.scale.setScalar(0.001);
    logo.add(s);
    return s;
  });
  let flash = { i: -1, at: 0 }; // which corner is flashing, and since when
  const front = new THREE.Vector3();

  // a wider lens up close, so the reflection changes across the face instead of being one flat tone
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 2000);
  camera.position.set(0, 0, 245);
  // resizing wipes the canvas, so it's redrawn straight away instead of showing a blank frame
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (typeof draw === 'function') draw(performance.now());
  };
  const watch = new ResizeObserver(resize);
  watch.observe(host);
  resize();

  // only draws while the hero is on screen
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

  const born = performance.now();
  let rx = 0, ry = 0;
  const ease = (x) => 1 - Math.pow(1 - x, 4);
  var draw = (now) => {
    const t = (now - born) / 1000;
    const intro = still ? 1 : ease(Math.min(1, t / 1.8));
    const r = host.getBoundingClientRect();
    // tilt toward the mouse, measured from the logo's own center
    let tx = 0, ty = 0;
    if (mouse.x > -1e3) {
      tx = Math.max(-1, Math.min(1, (mouse.x - (r.left + r.width / 2)) / (innerWidth / 2)));
      ty = Math.max(-1, Math.min(1, (mouse.y - (r.top + r.height / 2)) / (innerHeight / 2)));
    }
    rx += (ty * 0.45 - rx) * 0.06;
    ry += (tx * 0.6 - ry) * 0.06;
    const scrolled = Math.min(1, Math.max(0, -r.top / r.height)); // 0 at the top, 1 once the hero is gone
    logo.rotation.set(rx + scrolled * 0.6, ry + (1 - intro) * -Math.PI * 1.15 + scrolled * 1.1, (1 - intro) * 0.3);
    logo.position.y = still ? 0 : Math.sin(t * 0.9) * 3;
    logo.scale.setScalar(0.7 + 0.3 * intro - scrolled * 0.15);
    // how squarely the front faces the camera: 1 straight on, 0 side on
    front.set(0, 0, 1).applyQuaternion(logo.quaternion);
    const facing = Math.min(1, Math.max(0, (front.z - 0.75) / 0.2));
    if (!still && intro === 1 && now - flash.at > 2200 + Math.random() * 1600) {
      let i;
      do i = Math.floor(Math.random() * glints.length); while (i === flash.i);
      flash = { i, at: now };
    }
    glints.forEach((s, i) => {
      const k = i === flash.i ? (now - flash.at) / 900 : 1; // 0..1 over the flash
      const size = k < 1 ? Math.sin(k * Math.PI) ** 2 * 24 : 0;
      s.scale.setScalar(Math.max(0.001, size * facing));
    });
    renderer.render(scene, camera);
  };
  if (still) draw(performance.now());
  else { const loop = (now) => { if (visible) draw(now); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}
