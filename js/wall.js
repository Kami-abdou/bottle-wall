/*
  The wall: a night facade with 32 × 16 plastic bottles that light up and play Snake.

  Drawing strategy
  - The static scene (sky, building, street, unlit bottles) is drawn once per
    resize into an offscreen canvas.
  - Each frame blits that, then draws only the lit bottles from pre-rendered
    sprites: an additive glow and a capsule body.
  - Every bottle has a brightness that rises fast and decays slowly, so the
    snake leaves a short warm trail, like an LED behind cloudy plastic.
  - During the zoom transition the scene is drawn as vectors under a camera
    transform so it stays crisp while scaling ~100×.
*/
(function () {
  "use strict";

  const BW = (window.BW = window.BW || {});

  const COLS = 32, ROWS = 16, N = COLS * ROWS;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // up, right, down, left

  // LED colours. Index 0 means "off".
  const LED = [null, "#7cf29a", "#ff5a5f", "#ffe9c2", "#f2a65a", "#d8ffe3"];
  const GREEN = 1, RED = 2, WHITE = 3, AMBER = 4, HEAD = 5;

  const PAPER = "#f6f5f0";
  const S = {
    sky: "#141a33",
    far: "#181f3b",
    neighbour: "#1a2040",
    facade: "#232845",
    facadeShade: "#1f2441",
    edge: "#2b3152",
    edgeHi: "#363d63",
    bottle: "#2c3354",
    bottleEdge: "#333a64",
    sodium: "#f2a65a",
    pavement: "#1e2339",
    road: "#161a2d",
    silhouette: "#0b0e1d"
  };

  // 3 × 5 pixel font for the high-score board on the wall.
  const GLYPHS = {
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "011", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
    a: ["000", "110", "011", "101", "011"],
    b: ["100", "100", "111", "101", "111"],
    c: ["000", "011", "100", "100", "011"],
    e: ["010", "101", "111", "100", "011"],
    g: ["011", "100", "101", "101", "011"],
    n: ["000", "110", "101", "101", "101"],
    o: ["000", "010", "101", "101", "010"],
    r: ["000", "101", "110", "100", "100"],
    s: ["011", "100", "010", "001", "110"],
    t: ["010", "111", "010", "010", "001"],
    w: ["000", "101", "101", "111", "101"],
    "!": ["1", "1", "1", "0", "1"],
    " ": ["0", "0", "0", "0", "0"]
  };

  // ───────────── helpers ─────────────

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hexRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hexRgb(a), B = hexRgb(b);
    return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") + ")";
  }
  function rgba(h, a) {
    const c = hexRgb(h);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function capsule(ctx, cx, cy, w, h) {
    const r = w / 2;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - h / 2 + r);
    ctx.arc(cx, cy - h / 2 + r, r, Math.PI, 0);
    ctx.lineTo(cx + r, cy + h / 2 - r);
    ctx.arc(cx, cy + h / 2 - r, r, 0, Math.PI);
    ctx.closePath();
  }

  // One bottle, centred on (cx, cy), cell size c. `lit` is an LED colour or null.
  function drawBottle(ctx, cx, cy, c, lit) {
    const w = c * 0.64, h = c * 0.84;
    capsule(ctx, cx, cy, w, h);
    if (lit) {
      const g = ctx.createRadialGradient(cx - w * 0.1, cy - h * 0.12, 0, cx, cy, h * 0.62);
      g.addColorStop(0, mix(lit, "#ffffff", 0.6));
      g.addColorStop(0.55, lit);
      g.addColorStop(1, mix(lit, "#000000", 0.2));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = S.bottle;
    }
    ctx.fill();
    if (!lit && c >= 7) {
      ctx.lineWidth = Math.max(0.5, c * 0.04);
      ctx.strokeStyle = S.bottleEdge;
      ctx.stroke();
    }
    // the little highlight that makes it read as plastic
    ctx.fillStyle = lit ? "rgba(255,255,255,0.5)" : "rgba(220,228,255,0.1)";
    capsule(ctx, cx - w * 0.22, cy - h * 0.12, w * 0.16, h * 0.42);
    ctx.fill();
  }

  // ───────────── Snake ─────────────

  function neighbour(i, d) {
    const x = (i % COLS) + DX[d], y = ((i / COLS) | 0) + DY[d];
    return x < 0 || y < 0 || x >= COLS || y >= ROWS ? -1 : y * COLS + x;
  }
  function dist(a, b) {
    return Math.abs((a % COLS) - (b % COLS)) + Math.abs(((a / COLS) | 0) - ((b / COLS) | 0));
  }

  function Game(random) {
    this.random = random || Math.random;
    this.occ = new Uint8Array(N);
    this.reset();
  }
  Game.prototype.reset = function () {
    this.occ.fill(0);
    const y = 8;
    this.body = [y * COLS + 7, y * COLS + 6, y * COLS + 5];
    this.body.forEach((i) => (this.occ[i] = 1));
    this.dir = 1;
    this.alive = true;
    this.score = 0;
    this.placeFood();
  };
  Game.prototype.placeFood = function () {
    const free = N - this.body.length;
    if (free <= 0) { this.food = -1; return; }
    let k = Math.floor(this.random() * free);
    for (let i = 0; i < N; i++) {
      if (this.occ[i]) continue;
      if (k-- === 0) { this.food = i; return; }
    }
  };
  // Returns false if the snake died on this step.
  Game.prototype.step = function (dir) {
    if (dir !== undefined && dir >= 0 && dir !== (this.dir + 2) % 4) this.dir = dir;
    const n = neighbour(this.body[0], this.dir);
    const tail = this.body[this.body.length - 1];
    const eats = n === this.food;
    if (n < 0 || (this.occ[n] && !(n === tail && !eats))) {
      this.alive = false;
      return false;
    }
    if (!eats) { this.body.pop(); this.occ[tail] = 0; }
    this.body.unshift(n);
    this.occ[n] = 1;
    if (eats) { this.score++; this.placeFood(); }
    return true;
  };

  // Self-playing AI: shortest path to food, but only if it leaves enough room.
  const qbuf = new Int16Array(N), seen = new Uint32Array(N), first = new Int8Array(N);
  let stamp = 0;
  function flood(g, start, free) {
    const s = ++stamp;
    let h = 0, t = 0;
    qbuf[t++] = start; seen[start] = s;
    while (h < t) {
      const i = qbuf[h++];
      for (let d = 0; d < 4; d++) {
        const n = neighbour(i, d);
        if (n < 0 || seen[n] === s || (g.occ[n] && n !== free)) continue;
        seen[n] = s; qbuf[t++] = n;
      }
    }
    return t;
  }
  function pathDir(g, target, free) {
    const head = g.body[0], s = ++stamp;
    let h = 0, t = 0;
    qbuf[t++] = head; seen[head] = s; first[head] = -1;
    while (h < t) {
      const i = qbuf[h++];
      if (i === target) return first[i];
      for (let d = 0; d < 4; d++) {
        const n = neighbour(i, d);
        if (n < 0 || seen[n] === s || (g.occ[n] && n !== free)) continue;
        seen[n] = s; first[n] = i === head ? d : first[i]; qbuf[t++] = n;
      }
    }
    return -1;
  }
  function aiDir(g) {
    const head = g.body[0], tail = g.body[g.body.length - 1];
    const toFood = pathDir(g, g.food, tail);
    let bestD = g.dir, best = -Infinity;
    for (let d = 0; d < 4; d++) {
      if (d === (g.dir + 2) % 4) continue;
      const n = neighbour(head, d);
      if (n < 0 || (g.occ[n] && n !== tail)) continue;
      const area = flood(g, n, tail);
      let score = Math.min(area, g.body.length * 2 + 6) * 10;
      if (area >= g.body.length + 3) score += 1000;
      if (d === toFood) score += 300;
      score -= dist(n, g.food) + g.random() * 2;
      if (score > best) { best = score; bestD = d; }
    }
    return bestD;
  }

  // ───────────── the wall ─────────────

  BW.createWall = function (opts) {
    const canvas = opts.canvas;
    const ctx = canvas.getContext("2d");
    const bg = document.createElement("canvas");
    const bgx = bg.getContext("2d");

    let W = 0, H = 0, dpr = 1, L = null;
    let sprites = { body: [], glow: [] };

    const cur = new Float32Array(N), tgt = new Float32Array(N);
    const col = new Uint8Array(N), tcol = new Uint8Array(N);

    let raf = 0, last = 0, clock = 0;
    let mode = "idle"; // intro | demo | countdown | play | over
    let modeT = 0;
    let decayRate = 9;
    let reduced = !!opts.reducedMotion;

    let game = new Game();
    let stepAcc = 0;
    let dying = 0; // seconds of the demo snake's death blink
    const queue = [];
    let best = 0;
    try { best = parseInt(localStorage.getItem("bottlewall.best") || "0", 10) || 0; } catch (e) { /* storage blocked */ }
    let newBest = false;

    let zoom = null; // { t0, dur, dir: 1 in / -1 out, cell, done }

    // ───── layout ─────

    function computeLayout() {
      const topR = opts.topEl.getBoundingClientRect();
      const botR = opts.bottomEl.getBoundingClientRect();
      const wide = W >= 760;
      const groundY = Math.round(Math.min(H - 24, botR.top + (wide ? 36 : 22)));
      const top = topR.bottom + (wide ? 26 : 16);

      const cByH = (groundY - top) / (ROWS + 1.8 + 0.8 + 7);
      const cByW = (W - 32) / (COLS + 1.8);
      let c = Math.min(cByH, cByW, 24, wide ? (W * 0.58) / COLS : Infinity);
      c = Math.max(5, c);

      const gw = c * COLS, gh = c * ROWS;
      const gx = (W - gw) / 2;
      const pad = 0.9 * c;
      const spaceTop = top + pad;
      const spaceBottom = groundY - 7 * c - 0.8 * c - pad;
      const gy = spaceTop + Math.max(0, (spaceBottom - spaceTop - gh) / 2);

      const frame = { x: gx - pad, y: gy - pad, w: gw + 2 * pad, h: gh + 2 * pad };
      const slabY = frame.y + frame.h, slabH = 0.8 * c;
      const groundTop = slabY + slabH;
      const margin = wide ? Math.max(6 * c, 90) : Math.max(4 * c, 44);
      const bx0 = frame.x - margin, bx1 = frame.x + frame.w + margin;
      const floorH = 13 * c;
      const wallFloorTop = frame.y - 2.4 * c;
      let floors = 1;
      while (floors < 3 && wallFloorTop - (floors + 1) * floorH > H * 0.06) floors++;
      const roofY = wallFloorTop - floors * floorH;

      const lampX = wide ? Math.min(bx1 + 3.5 * c, W - 40) : W * 0.87;
      const personH = clamp(7.5 * c, 58, 150);
      const sidewalk = Math.min(Math.max(14, 1.6 * c), (H - groundY) * 0.5);

      L = {
        c, gx, gy, gw, gh, frame, slabY, slabH, groundTop, groundY, bx0, bx1,
        floorH, floors, wallFloorTop, roofY, lampX, personH, sidewalk, wide,
        lampY: groundTop - 1.2 * c,
        personX: lampX - (wide ? 5 : 3.4) * c - personH * 0.12,
        personFeet: groundY + sidewalk * 0.55,
        windows: [],
        tv: null,
        phone: null
      };
      planWindows();
    }

    function planWindows() {
      const r = rng(7);
      const { c, bx0, bx1, wallFloorTop, floorH, floors } = L;
      const ww = 4.4 * c, wh = 6.6 * c;
      const gap = 3.6 * c;
      const n = Math.max(2, Math.floor((bx1 - bx0 - gap) / (ww + gap)));
      const span = n * ww + (n - 1) * gap;
      const x0 = (bx0 + bx1) / 2 - span / 2;
      for (let f = 0; f < floors; f++) {
        const y = wallFloorTop - (f + 1) * floorH + floorH * 0.32;
        for (let i = 0; i < n; i++) {
          const roll = r();
          const kind = roll < 0.3 ? "warm" : roll < 0.45 ? "shutter" : roll < 0.52 ? "dim" : "dark";
          L.windows.push({ x: x0 + i * (ww + gap), y, w: ww, h: wh, kind, shutter: r() });
        }
      }
      // one window glows with a TV
      const dark = L.windows.filter((w) => w.kind === "dark");
      if (dark.length) { L.tv = dark[Math.floor(r() * dark.length)]; L.tv.kind = "tv"; }
    }

    // ───── static scene (vector) ─────

    function drawScene(g) {
      const { c, frame, bx0, bx1, groundY, groundTop, slabY, slabH, wallFloorTop, roofY } = L;
      const r = rng(42);

      // sky
      g.fillStyle = S.sky;
      g.fillRect(-W, -H, W * 3, H * 3);
      // city haze near the horizon (sodium from streets far away)
      const haze = g.createRadialGradient(W / 2, groundY, 0, W / 2, groundY, Math.max(W, H) * 0.9);
      haze.addColorStop(0, rgba(S.sodium, 0.1));
      haze.addColorStop(1, rgba(S.sodium, 0));
      g.fillStyle = haze;
      g.fillRect(0, 0, W, H);
      // stars
      g.fillStyle = "rgba(230,232,255,0.55)";
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = r() * groundY * 0.7, s = r() < 0.15 ? 1.4 : 0.8;
        g.globalAlpha = 0.25 + r() * 0.6;
        g.fillRect(x, y, s, s);
      }
      g.globalAlpha = 1;

      // far skyline, with a minaret
      g.fillStyle = S.far;
      let x = -20;
      while (x < W + 20) {
        const w = (3 + r() * 6) * c, h = (6 + r() * 14) * c;
        g.fillRect(x, groundY - h - 10 * c, w, h + 10 * c);
        x += w - 2;
      }
      const mx = bx0 > 60 ? bx0 * 0.45 : W * 0.12, mTop = groundY - 34 * c;
      g.fillRect(mx - 1.1 * c, mTop, 2.2 * c, 40 * c);
      g.fillRect(mx - 1.5 * c, mTop + 1.4 * c, 3 * c, 0.6 * c);
      g.beginPath();
      g.moveTo(mx - 0.9 * c, mTop); g.lineTo(mx, mTop - 1.8 * c); g.lineTo(mx + 0.9 * c, mTop);
      g.fill();

      // neighbours
      g.fillStyle = S.neighbour;
      const lTop = Math.max(roofY + 6 * c, groundY - 30 * c), rTop = Math.max(roofY - 3 * c, groundY - 40 * c);
      g.fillRect(-10, lTop, bx0 + 4, groundY - lTop);
      g.fillRect(bx1 - 4, rTop, W - bx1 + 14, groundY - rTop);
      g.fillStyle = "rgba(242,166,90,0.32)";
      for (let i = 0; i < 26; i++) {
        const side = i % 2;
        const x0 = side ? bx1 + 2 * c : 0, x1 = side ? W : bx0 - 2 * c;
        if (x1 - x0 < 2 * c) continue;
        const wx = x0 + r() * (x1 - x0 - 1.6 * c), wy = (side ? rTop : lTop) + 2 * c + r() * (groundY - (side ? rTop : lTop) - 6 * c);
        if (r() < 0.45) g.fillRect(wx, wy, 1.6 * c, 2.2 * c);
      }

      // the building
      const bTop = roofY;
      g.fillStyle = S.facade;
      g.fillRect(bx0, bTop, bx1 - bx0, groundY - bTop);
      // a side in shade, for depth
      g.fillStyle = S.facadeShade;
      g.fillRect(bx1 - 1.2 * c, bTop, 1.2 * c, groundY - bTop);
      // roof parapet, water tanks, dishes
      if (roofY > -4 * c) {
        g.fillStyle = S.edge;
        g.fillRect(bx0 - 0.4 * c, roofY - 1.1 * c, bx1 - bx0 + 0.8 * c, 1.1 * c);
        g.fillStyle = S.facadeShade;
        const tx = bx0 + (bx1 - bx0) * 0.18;
        for (let i = 0; i < 2; i++) {
          const cx = tx + i * 4.4 * c;
          g.fillRect(cx - 0.2 * c, roofY - 3.2 * c, 0.4 * c, 2.2 * c);
          g.fillRect(cx + 2.6 * c, roofY - 3.2 * c, 0.4 * c, 2.2 * c);
          g.beginPath();
          g.ellipse(cx + 1.4 * c, roofY - 4.6 * c, 2 * c, 1.6 * c, 0, 0, Math.PI * 2);
          g.fill();
        }
        const dx = bx0 + (bx1 - bx0) * 0.72;
        g.save();
        g.translate(dx, roofY - 2.6 * c);
        g.rotate(-0.5);
        g.beginPath();
        g.ellipse(0, 0, 1.7 * c, 0.75 * c, 0, Math.PI, 0);
        g.fill();
        g.restore();
        g.fillRect(dx - 0.15 * c, roofY - 2.6 * c, 0.3 * c, 1.6 * c);
        g.fillRect(bx0 + (bx1 - bx0) * 0.86, roofY - 6 * c, 0.2 * c, 5 * c);
      }
      // floor slabs above the wall
      g.fillStyle = S.edge;
      for (let f = 0; f <= L.floors; f++) {
        g.fillRect(bx0, wallFloorTop - f * L.floorH - 0.5 * c, bx1 - bx0, 0.5 * c);
      }
      // windows
      for (const w of L.windows) drawWindow(g, w);

      // the balcony frame holding the bottles
      g.fillStyle = "#1a1e36";
      g.fillRect(frame.x, frame.y, frame.w, frame.h);
      g.strokeStyle = S.edgeHi;
      g.lineWidth = Math.max(1.5, c * 0.28);
      g.strokeRect(frame.x, frame.y, frame.w, frame.h);
      // mesh
      g.strokeStyle = "rgba(90,100,150,0.18)";
      g.lineWidth = Math.max(0.5, c * 0.05);
      g.beginPath();
      for (let i = 0; i <= COLS; i++) { const xx = L.gx + i * c; g.moveTo(xx, L.gy); g.lineTo(xx, L.gy + L.gh); }
      for (let j = 0; j <= ROWS; j++) { const yy = L.gy + j * c; g.moveTo(L.gx, yy); g.lineTo(L.gx + L.gw, yy); }
      g.stroke();
      // unlit bottles
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) drawBottle(g, L.gx + (i + 0.5) * c, L.gy + (j + 0.5) * c, c, null);
      }
      // AC unit next to the wall, with its drip line
      const acx = frame.x + frame.w + 1.2 * c, acy = frame.y + frame.h * 0.18;
      if (acx + 4 * c < bx1 - 1.2 * c) {
        g.fillStyle = "#2f3555";
        g.fillRect(acx, acy, 4 * c, 2.8 * c);
        g.strokeStyle = "#20243f";
        g.lineWidth = Math.max(1, c * 0.12);
        g.beginPath(); g.arc(acx + 2.6 * c, acy + 1.4 * c, 0.95 * c, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(acx + 0.6 * c, acy + 2.8 * c); g.lineTo(acx + 0.6 * c, slabY); g.stroke();
      }
      // balcony slab
      g.fillStyle = S.edgeHi;
      g.fillRect(frame.x - 1.2 * c, slabY, frame.w + 2.4 * c, slabH);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(frame.x - 1.2 * c, slabY + slabH, frame.w + 2.4 * c, 0.5 * c);

      drawGroundFloor(g);
      drawStreet(g);
      drawLamp(g);
      drawPerson(g);
    }

    function drawWindow(g, w) {
      const c = L.c;
      g.fillStyle = S.edge;
      g.fillRect(w.x - 0.35 * c, w.y - 0.35 * c, w.w + 0.7 * c, w.h + 0.9 * c);
      if (w.kind === "warm") {
        const gr = g.createLinearGradient(0, w.y, 0, w.y + w.h);
        gr.addColorStop(0, "#5a4a46");
        gr.addColorStop(1, "#8a6a4e");
        g.fillStyle = gr;
      } else if (w.kind === "dim") {
        g.fillStyle = "#3a3a52";
      } else {
        g.fillStyle = "#151a30";
      }
      g.fillRect(w.x, w.y, w.w, w.h);
      if (w.kind === "warm") {
        // curtain edge and a sodium rim on the frame
        g.fillStyle = "rgba(20,22,40,0.45)";
        g.fillRect(w.x, w.y, w.w * 0.28, w.h);
        g.fillStyle = rgba(S.sodium, 0.35);
        g.fillRect(w.x - 0.35 * c, w.y + w.h + 0.35 * c, w.w + 0.7 * c, 0.2 * c);
      }
      // half-closed shutters (persiennes)
      const shut = w.kind === "shutter" ? 0.55 + w.shutter * 0.45 : w.kind === "dark" ? w.shutter * 0.5 : 0.12;
      g.fillStyle = "#2a3050";
      g.fillRect(w.x, w.y, w.w, w.h * shut);
      g.strokeStyle = "rgba(10,12,28,0.5)";
      g.lineWidth = Math.max(0.5, c * 0.07);
      g.beginPath();
      for (let y = w.y + c * 0.45; y < w.y + w.h * shut; y += c * 0.45) { g.moveTo(w.x, y); g.lineTo(w.x + w.w, y); }
      g.stroke();
      // sill
      g.fillStyle = S.edgeHi;
      g.fillRect(w.x - 0.6 * c, w.y + w.h + 0.2 * c, w.w + 1.2 * c, 0.35 * c);
    }

    function drawGroundFloor(g) {
      const { c, frame, groundTop, groundY } = L;
      const gh = groundY - groundTop;
      const cx = frame.x + frame.w / 2;
      // the café on the left: lit window and a door
      const cw = frame.w * 0.38, ch = Math.min(gh * 0.62, 8 * c);
      const cxl = cx - frame.w * 0.46;
      const wy = groundY - ch - 0.2 * c;
      const glow = g.createRadialGradient(cxl + cw / 2, wy + ch * 0.6, 0, cxl + cw / 2, wy + ch * 0.6, cw);
      glow.addColorStop(0, "#c98a52");
      glow.addColorStop(1, "#6b4a3a");
      g.fillStyle = S.edge;
      g.fillRect(cxl - 0.4 * c, wy - 0.4 * c, cw + 0.8 * c, ch + 0.4 * c);
      g.fillStyle = glow;
      g.fillRect(cxl, wy, cw, ch);
      // stools and a counter seen through the glass
      g.fillStyle = "rgba(30,20,24,0.55)";
      g.fillRect(cxl, wy + ch * 0.62, cw, ch * 0.08);
      for (let i = 1; i < 5; i++) g.fillRect(cxl + (cw * i) / 5 - 0.2 * c, wy + ch * 0.7, 0.4 * c, ch * 0.3);
      // mullion
      g.fillStyle = S.edge;
      g.fillRect(cxl + cw * 0.5 - 0.15 * c, wy, 0.3 * c, ch);
      // awning
      g.fillStyle = "#2f3658";
      g.fillRect(cxl - 0.9 * c, wy - 1.4 * c, cw + 1.8 * c, 1 * c);
      // building entrance
      const dw = Math.max(2.6 * c, 14), dh = Math.min(gh * 0.78, 9 * c);
      const dx = cx + frame.w * 0.04;
      g.fillStyle = S.edge;
      g.fillRect(dx - 0.4 * c, groundY - dh - 0.4 * c, dw + 0.8 * c, dh + 0.4 * c);
      g.fillStyle = "#121628";
      g.fillRect(dx, groundY - dh, dw, dh);
      g.fillStyle = "rgba(242,166,90,0.22)";
      g.fillRect(dx + dw * 0.15, groundY - dh + dh * 0.1, dw * 0.7, dh * 0.35);
      // a shop with its shutter rolled down
      const sw = frame.w * 0.3, sh = Math.min(gh * 0.66, 8 * c);
      const sx = cx + frame.w * 0.2;
      g.fillStyle = "#2d3352";
      g.fillRect(sx, groundY - sh, sw, sh);
      g.strokeStyle = "rgba(10,12,28,0.55)";
      g.lineWidth = Math.max(0.5, c * 0.08);
      g.beginPath();
      for (let y = groundY - sh + c * 0.4; y < groundY; y += c * 0.4) { g.moveTo(sx, y); g.lineTo(sx + sw, y); }
      g.stroke();
    }

    function drawStreet(g) {
      const { c, groundY, sidewalk } = L;
      g.fillStyle = S.pavement;
      g.fillRect(-W, groundY, W * 3, sidewalk);
      g.fillStyle = S.edgeHi;
      g.fillRect(-W, groundY + sidewalk, W * 3, Math.max(1.5, c * 0.25));
      g.fillStyle = S.road;
      g.fillRect(-W, groundY + sidewalk + Math.max(1.5, c * 0.25), W * 3, H * 2);
      // lane marks catching the lamp
      g.fillStyle = "rgba(242,166,90,0.18)";
      const ly = groundY + sidewalk + (H - groundY - sidewalk) * 0.55;
      for (let x = -c * 2; x < W; x += 9 * c) g.fillRect(x, ly, 4.5 * c, Math.max(1.5, c * 0.22));
    }

    function drawLamp(g) {
      const { c, lampX, lampY, groundY, sidewalk } = L;
      const foot = groundY + sidewalk * 0.85;
      // light pool on the pavement and facade
      g.save();
      g.globalCompositeOperation = "lighter";
      let gr = g.createRadialGradient(lampX, foot, 0, lampX, foot, 22 * c);
      gr.addColorStop(0, rgba(S.sodium, 0.35));
      gr.addColorStop(0.4, rgba(S.sodium, 0.1));
      gr.addColorStop(1, rgba(S.sodium, 0));
      g.fillStyle = gr;
      g.save();
      g.translate(lampX, foot);
      g.scale(1, 0.38);
      g.translate(-lampX, -foot);
      g.fillRect(lampX - 22 * c, foot - 22 * c, 44 * c, 44 * c);
      g.restore();
      const hx = lampX - 2.6 * c;
      gr = g.createRadialGradient(hx, lampY, 0, hx, lampY, 26 * c);
      gr.addColorStop(0, rgba(S.sodium, 0.32));
      gr.addColorStop(0.25, rgba(S.sodium, 0.1));
      gr.addColorStop(1, rgba(S.sodium, 0));
      g.fillStyle = gr;
      g.fillRect(hx - 26 * c, lampY - 26 * c, 52 * c, 52 * c);
      g.restore();
      // pole and arm
      g.strokeStyle = "#11152a";
      g.lineCap = "round";
      g.lineWidth = Math.max(2, c * 0.42);
      g.beginPath();
      g.moveTo(lampX, foot);
      g.lineTo(lampX, lampY + 1.2 * c);
      g.quadraticCurveTo(lampX, lampY, lampX - 1.6 * c, lampY);
      g.lineTo(hx, lampY);
      g.stroke();
      // head and bulb
      g.fillStyle = "#11152a";
      g.beginPath();
      g.ellipse(hx, lampY + 0.2 * c, 1.3 * c, 0.5 * c, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = "#ffd29a";
      g.beginPath();
      g.ellipse(hx, lampY + 0.3 * c, 0.9 * c, 0.28 * c, 0, 0, Math.PI * 2);
      g.fill();
    }

    function personPath(g, ox) {
      const { personX, personFeet, personH: h } = L;
      const x = personX + ox, f = personFeet;
      const hr = h * 0.075;
      g.beginPath();
      g.arc(x, f - h + hr, hr, 0, Math.PI * 2);
      // torso
      g.moveTo(x - h * 0.12, f - h * 0.8);
      g.lineTo(x + h * 0.1, f - h * 0.8);
      g.lineTo(x + h * 0.085, f - h * 0.44);
      g.lineTo(x - h * 0.095, f - h * 0.44);
      g.closePath();
      // legs
      g.rect(x - h * 0.085, f - h * 0.46, h * 0.07, h * 0.46);
      g.rect(x + h * 0.005, f - h * 0.46, h * 0.07, h * 0.46);
      g.moveTo(x, f - h * 0.86);
      g.rect(x - h * 0.04, f - h * 0.87, h * 0.08, h * 0.08); // neck
    }
    function drawPerson(g) {
      const { personX: x, personFeet: f, personH: h } = L;
      // rim light from the lamp behind them
      g.fillStyle = rgba(S.sodium, 0.55);
      personPath(g, Math.max(1, h * 0.012));
      g.fill();
      g.fillStyle = S.silhouette;
      personPath(g, 0);
      g.fill();
      // arm raised, holding the phone towards the wall
      g.strokeStyle = S.silhouette;
      g.lineCap = "round";
      g.lineWidth = h * 0.055;
      const sx = x - h * 0.08, sy = f - h * 0.76;
      const px = x - h * 0.26, py = f - h * 0.95;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(x - h * 0.2, f - h * 0.8);
      g.lineTo(px + h * 0.03, py + h * 0.04);
      g.stroke();
      L.phone = { x: px - h * 0.035, y: py - h * 0.05, w: h * 0.07, h: h * 0.11 };
      g.fillStyle = "#05060d";
      g.fillRect(L.phone.x - 1, L.phone.y - 1, L.phone.w + 2, L.phone.h + 2);
      // ground shadow
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath();
      g.ellipse(x - h * 0.1, f + 1, h * 0.2, h * 0.025, 0, 0, Math.PI * 2);
      g.fill();
    }

    // ───── sprites ─────

    function buildSprites() {
      const c = L.c;
      sprites = { body: [], glow: [], size: c, glowR: c * 2.6 };
      for (let k = 1; k < LED.length; k++) {
        const b = document.createElement("canvas");
        b.width = b.height = Math.ceil(c * dpr) + 2;
        const bc = b.getContext("2d");
        bc.scale(b.width / c, b.height / c);
        drawBottle(bc, c / 2, c / 2, c, LED[k]);
        sprites.body[k] = b;

        const gR = sprites.glowR;
        const gcv = document.createElement("canvas");
        gcv.width = gcv.height = Math.ceil(gR * 2 * dpr);
        const gc = gcv.getContext("2d");
        const s = gcv.width / 2;
        const gr = gc.createRadialGradient(s, s, 0, s, s, s);
        gr.addColorStop(0, rgba(LED[k], 0.95));
        gr.addColorStop(0.14, rgba(LED[k], 0.55));
        gr.addColorStop(0.38, rgba(LED[k], 0.16));
        gr.addColorStop(0.7, rgba(LED[k], 0.04));
        gr.addColorStop(1, rgba(LED[k], 0));
        gc.fillStyle = gr;
        gc.fillRect(0, 0, gcv.width, gcv.height);
        sprites.glow[k] = gcv;
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      bg.width = canvas.width;
      bg.height = canvas.height;
      computeLayout();
      bgx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(bgx);
      buildSprites();
      positionHit();
      if (!raf) renderOnce();
    }

    function positionHit() {
      const h = opts.hitEl, f = L.frame;
      h.style.left = f.x + "px";
      h.style.top = f.y + "px";
      h.style.width = f.w + "px";
      h.style.height = f.h + "px";
    }

    // ───── programs: write the target state of every bottle ─────

    function set(x, y, color, b) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
      const i = y * COLS + x;
      tgt[i] = b;
      tcol[i] = color;
    }
    function textWidth(s) {
      let w = 0;
      for (const ch of s) w += (GLYPHS[ch] || GLYPHS[" "])[0].length + 1;
      return Math.max(0, w - 1);
    }
    function text(s, x, y, color, b, scale) {
      scale = scale || 1;
      for (const ch of s) {
        const g = GLYPHS[ch] || GLYPHS[" "];
        for (let r = 0; r < 5; r++) {
          for (let k = 0; k < g[r].length; k++) {
            if (g[r][k] !== "1") continue;
            for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) set(x + k * scale + sx, y + r * scale + sy, color, b);
          }
        }
        x += (g[0].length + 1) * scale;
      }
    }
    function centred(s, y, color, b, scale) {
      scale = scale || 1;
      text(s, Math.floor((COLS - textWidth(s) * scale) / 2), y, color, b, scale);
    }

    function drawSnake(g, tint) {
      const len = g.body.length;
      for (let k = len - 1; k >= 0; k--) {
        const i = g.body[k];
        const b = k === 0 ? 1 : lerp(0.92, 0.42, k / Math.max(1, len - 1));
        tgt[i] = b;
        tcol[i] = tint || (k === 0 ? HEAD : GREEN);
      }
      if (g.food >= 0) {
        tgt[g.food] = 0.78 + 0.22 * Math.sin(clock * 4.2);
        tcol[g.food] = RED;
      }
    }

    const ORIGIN = { x: 4, y: 12 };
    function programIntro(dt) {
      const t = modeT;
      if (t < 0.55) return;
      const oi = ORIGIN.y * COLS + ORIGIN.x;
      if (t < 1.55) { tgt[oi] = smooth(0.55, 0.85, t); tcol[oi] = WHITE; return; }
      if (t < 3.15) {
        const k = (t - 1.55) / 0.05;
        for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
          const d = Math.hypot(i - ORIGIN.x, j - ORIGIN.y);
          if (d <= k) set(i, j, WHITE, 0.82);
        }
        tgt[oi] = 1;
        return;
      }
      if (t < 3.4) { for (let i = 0; i < N; i++) { tgt[i] = 1; tcol[i] = GREEN; } return; }
      setMode("demo");
      decayRate = 2.6;
    }

    function programDemo(dt) {
      if (dying > 0) {
        dying -= dt;
        drawSnake(game, RED);
        if (dying <= 0) game.reset();
        return;
      }
      stepAcc += dt;
      const interval = 0.085;
      while (stepAcc >= interval) {
        stepAcc -= interval;
        if (!game.step(aiDir(game)) || game.body.length > 90 || game.food < 0) { dying = 1.1; break; }
      }
      drawSnake(game);
    }

    function programPlay(dt) {
      if (mode === "countdown") {
        const n = 3 - Math.floor(modeT / 0.6);
        if (n >= 1) {
          centred(String(n), 0, AMBER, 0.9, 2);
          if (best > 0) centred("best " + best, 11, WHITE, 0.35);
        } else {
          setMode("play");
          stepAcc = 0;
        }
        return;
      }
      if (mode === "play") {
        stepAcc += dt;
        const interval = Math.max(0.062, 0.135 - game.score * 0.0035);
        while (stepAcc >= interval) {
          stepAcc -= interval;
          let d;
          while (queue.length) {
            const q = queue.shift();
            if (q !== game.dir && q !== (game.dir + 2) % 4) { d = q; break; }
          }
          if (!game.step(d)) { gameOver(); break; }
          if (game.food < 0) { gameOver(); break; }
        }
        const s = String(game.score);
        text(s, COLS - textWidth(s) - 1, 1, AMBER, 0.38);
        if (mode === "play") drawSnake(game);
        return;
      }
      if (mode === "over") {
        if (modeT < 1.3) {
          drawSnake(game, RED);
          for (const i of game.body) tgt[i] *= 0.55 + 0.45 * Math.cos(modeT * 7);
          return;
        }
        const s = "score " + game.score;
        centred(textWidth(s) <= COLS ? s : String(game.score), 2, newBest ? AMBER : GREEN, 0.95);
        const b = newBest ? "new best" : "best " + best;
        centred(textWidth(b) <= COLS ? b : String(best), 9, newBest ? AMBER : WHITE, newBest ? 0.5 + 0.35 * Math.sin(clock * 3) : 0.55);
      }
    }

    function gameOver() {
      newBest = game.score > best;
      if (newBest) {
        best = game.score;
        try { localStorage.setItem("bottlewall.best", String(best)); } catch (e) { /* storage blocked */ }
      }
      setMode("over");
      opts.onStatus && opts.onStatus("Game over. Score " + game.score + ". Best " + best + ". Tap the wall or press Enter to play again.", "over");
    }

    function setMode(m) {
      mode = m;
      modeT = 0;
      opts.onMode && opts.onMode(m);
    }

    // ───── frame ─────

    function easeCells(dt, instant) {
      const atk = instant ? 1 : 1 - Math.exp(-dt * 30);
      const dec = instant ? 1 : 1 - Math.exp(-dt * decayRate);
      for (let i = 0; i < N; i++) {
        const d = tgt[i] - cur[i];
        cur[i] += d * (d > 0 ? atk : dec);
        if (tgt[i] > 0.001 && tcol[i]) col[i] = tcol[i];
      }
      decayRate += (9 - decayRate) * (1 - Math.exp(-dt * 0.9));
    }

    function runProgram(dt) {
      tgt.fill(0);
      tcol.fill(0);
      if (mode === "intro") programIntro(dt);
      else if (mode === "demo") programDemo(dt);
      else if (mode === "countdown" || mode === "play" || mode === "over") programPlay(dt);
    }

    function cellCentre(i) {
      return [L.gx + ((i % COLS) + 0.5) * L.c, L.gy + (((i / COLS) | 0) + 0.5) * L.c];
    }

    function render() {
      const c = L.c;
      let s = 1, ox = 0, oy = 0, zt = 0;
      if (zoom) {
        const p = clamp((performance.now() - zoom.t0) / zoom.dur, 0, 1);
        zt = zoom.dir > 0 ? p : 1 - p;
        const e = easeInOut(zt);
        const [tx, ty] = cellCentre(zoom.cell);
        s = Math.exp(Math.log(zoom.smax) * e);
        const k = smooth(0, 0.6, e);
        ox = lerp(tx, W / 2, k) - tx * s;
        oy = lerp(ty, H / 2, k) - ty * s;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (s === 1) {
        ctx.drawImage(bg, 0, 0);
      } else {
        ctx.fillStyle = S.sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      if (s !== 1) drawScene(ctx);

      // dynamic bits of the street
      const tvA = 0.14 + 0.1 * Math.sin(clock * 2.3) * Math.sin(clock * 0.9 + 1);
      if (L.tv) {
        ctx.fillStyle = "rgba(120,150,255," + tvA.toFixed(3) + ")";
        ctx.fillRect(L.tv.x, L.tv.y + L.tv.h * L.tv.shutter * 0.5, L.tv.w, L.tv.h * (1 - L.tv.shutter * 0.5));
      }

      // lit bottles
      let litSum = 0, greenSum = 0;
      for (let i = 0; i < N; i++) { litSum += cur[i]; if (col[i] === GREEN || col[i] === HEAD) greenSum += cur[i]; }
      const glowK = 1.15 / (1 + litSum / 60);
      const gR = sprites.glowR;
      const target = zoom ? zoom.cell : -1;

      // spill of the whole wall onto the facade and the street
      if (litSum > 0.5) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.min(0.5, litSum / N) * 0.9 + 0.03;
        const wc = greenSum > litSum * 0.5 ? GREEN : WHITE;
        const R = L.gw * 0.85;
        ctx.drawImage(sprites.glow[wc], L.gx + L.gw / 2 - R, L.gy + L.gh / 2 - R * 0.8, R * 2, R * 2);
        if (L.phone) {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(sprites.glow[GREEN], L.phone.x - c * 1.2, L.phone.y - c * 1.2, L.phone.w + c * 2.4, L.phone.h + c * 2.4);
        }
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < N; i++) {
        const b = cur[i];
        if (b < 0.02 || i === target) continue;
        const [x, y] = cellCentre(i);
        ctx.globalAlpha = Math.min(1, b * glowK);
        ctx.drawImage(sprites.glow[col[i]], x - gR, y - gR, gR * 2, gR * 2);
      }
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < N; i++) {
        const b = cur[i];
        if (b < 0.02 || i === target) continue;
        const [x, y] = cellCentre(i);
        ctx.globalAlpha = Math.min(1, b);
        if (s > 2) drawBottle(ctx, x, y, c, LED[col[i]]);
        else ctx.drawImage(sprites.body[col[i]], x - c / 2, y - c / 2, c, c);
      }
      ctx.globalAlpha = 1;

      // the phone in the street mirrors the game
      if (L.phone) {
        ctx.fillStyle = mix("#0d3a22", LED[GREEN], 0.55 + 0.35 * Math.min(1, greenSum / 12));
        ctx.fillRect(L.phone.x, L.phone.y, L.phone.w, L.phone.h);
      }

      // the bottle we dive into: it warms up and becomes the paper
      if (zoom) {
        const [x, y] = cellCentre(target);
        const base = cur[target] > 0.1 ? LED[col[target]] : LED[WHITE];
        const m = smooth(0.12, 0.7, zt);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.4 + 0.6 * m;
        ctx.drawImage(sprites.glow[WHITE], x - gR * 1.4, y - gR * 1.4, gR * 2.8, gR * 2.8);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        // flat fill so the edges don't go grey as it fills the screen
        capsule(ctx, x, y, c * 0.64, c * 0.84);
        ctx.fillStyle = m < 0.5 ? mix(base, "#fffaf0", m * 2) : mix("#fffaf0", PAPER, (m - 0.5) * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5 * (1 - m);
        ctx.fillStyle = "#ffffff";
        capsule(ctx, x - c * 0.14, y - c * 0.1, c * 0.1, c * 0.35);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.1) dt = 0.1;
      clock += dt;
      modeT += dt;
      runProgram(dt);
      easeCells(dt, reduced);
      render();
      if (zoom && now - zoom.t0 >= zoom.dur) {
        const z = zoom;
        if (z.dir > 0) { stop(); } else { zoom = null; render(); }
        z.done && z.done();
      }
    }

    function renderOnce() {
      if (!L) return;
      render();
    }

    // A still frame for reduced motion: a snake mid-game, fully lit.
    function staticFrame() {
      const r = rng(2026);
      game = new Game(r);
      for (let k = 0; k < 260; k++) { if (!game.step(aiDir(game))) game.reset(); }
      game.random = Math.random;
      if (mode === "intro" || mode === "idle") setMode("demo");
      tgt.fill(0); tcol.fill(0);
      drawSnake(game);
      if (game.food >= 0) tgt[game.food] = 1;
      easeCells(0, true);
      renderOnce();
    }

    function start(o) {
      o = o || {};
      if (!L) resize();
      if (reduced && mode !== "countdown" && mode !== "play" && mode !== "over") {
        stop();
        staticFrame();
        return;
      }
      if (o.intro && mode === "idle") {
        cur.fill(0);
        setMode("intro");
      } else if (mode === "idle" || mode === "intro") {
        setMode("demo");
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    // ───── public API ─────

    const api = {
      get mode() { return mode; },
      get cols() { return COLS; },
      get rows() { return ROWS; },
      resize,
      start,
      stop,
      setReducedMotion(v) {
        reduced = !!v;
        if (reduced && mode !== "play" && mode !== "countdown" && mode !== "over") { stop(); staticFrame(); }
        else start();
      },
      cellAt(clientX, clientY) {
        if (!L) return -1;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor((clientX - r.left - L.gx) / L.c), y = Math.floor((clientY - r.top - L.gy) / L.c);
        return x < 0 || y < 0 || x >= COLS || y >= ROWS ? -1 : y * COLS + x;
      },
      zoomIn(cell, done) {
        if (cell == null || cell < 0) cell = game && game.body ? game.body[0] : (ROWS >> 1) * COLS + (COLS >> 1);
        const c = L.c;
        const smax = 1.3 * Math.max(W / (c * 0.64), H / (c * 0.84));
        zoom = { t0: performance.now(), dur: 1150, dir: 1, cell, smax, done };
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      },
      zoomOut(done) {
        if (mode === "idle" || mode === "intro") setMode("demo");
        const cell = zoom && zoom.cell != null ? zoom.cell : game.body[0];
        const c = L.c;
        const smax = 1.3 * Math.max(W / (c * 0.64), H / (c * 0.84));
        zoom = { t0: performance.now(), dur: 950, dir: -1, cell, smax, done };
        if (reduced && mode !== "play") {
          // no motion: jump straight back to the still frame
          zoom = null;
          staticFrame();
          done && done();
          return;
        }
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      },
      // Playable mode
      startPlay() {
        game = new Game();
        queue.length = 0;
        newBest = false;
        cur.fill(0);
        setMode("countdown");
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
        opts.onStatus && opts.onStatus("Get ready. Steer with the arrow keys, swipe, or the buttons.", "countdown");
      },
      stopPlay() {
        game = new Game();
        queue.length = 0;
        setMode("demo");
        if (reduced) { stop(); staticFrame(); } else start();
      },
      restart() { api.startPlay(); },
      input(dir) {
        const d = { up: 0, right: 1, down: 2, left: 3 }[dir];
        if (d === undefined) return;
        if (mode === "over" && modeT > 1.3) { api.startPlay(); return; }
        if (mode !== "play" && mode !== "countdown") return;
        if (queue.length < 3) queue.push(d);
      },
      get canRestart() { return mode === "over" && modeT > 1.3; }
    };
    return api;
  };
})();
