/*
  Wires the two states together.
  - No hash in the URL → the wall.  Any hash (#plan or a section id) → the plan.
  - Wall → plan: zoom into a bottle until it becomes the paper.
  - Plan → wall: the same move in reverse.
*/
(function () {
  "use strict";

  const C = window.CONTENT;
  const BW = window.BW;
  const $ = (id) => document.getElementById(id);

  const hero = $("hero"), planEl = $("plan"), veil = $("paper-veil");
  const canvas = $("wall-canvas"), hit = $("wall-hit");
  const playBtn = $("play-btn"), stopBtn = $("stop-btn"), dpad = $("dpad"), hint = $("play-hint");
  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const mqFine = matchMedia("(hover: hover) and (pointer: fine)");
  // ?still in the URL previews the reduced-motion version
  const forceStill = /[?&]still\b/.test(location.search);
  let reduced = mqReduce.matches || forceStill;

  // ───── copy ─────
  const ideaBlock = C.parts[0].sections.find((s) => s.id === "idea");
  $("hero-title").textContent = C.title;
  $("hero-idea").textContent = ideaBlock ? "“" + ideaBlock.blocks[0].text + "”" : "";
  canvas.setAttribute("aria-label", C.hero.canvasDescription);
  playBtn.textContent = C.hero.playLabel;
  function setPrompt() { $("hero-prompt-text").textContent = mqFine.matches ? C.hero.promptPointer : C.hero.prompt; }
  setPrompt();
  mqFine.addEventListener && mqFine.addEventListener("change", setPrompt);

  // ───── the two halves ─────
  const wall = BW.createWall({
    canvas,
    hitEl: hit,
    topEl: hero.querySelector(".hero__top"),
    bottomEl: hero.querySelector(".hero__bottom"),
    reducedMotion: reduced,
    onStatus: (msg) => { $("game-status").textContent = msg; },
    onMode: onWallMode
  });
  const plan = BW.renderPlan(C, { reducedMotion: reduced });

  let state = "wall"; // wall | plan | busy
  let pendingCell = -1;
  let cameFromWall = false;

  // ───── routing ─────
  function route(instant) {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) {
      if (state === "wall") openPlan(h, instant);
      else if (state === "plan") scrollToId(h);
    } else if (state === "plan") {
      closePlan();
    }
  }
  window.addEventListener("hashchange", () => route(false));

  function goPlan(cell) {
    if (state !== "wall") return;
    pendingCell = cell == null ? -1 : cell;
    cameFromWall = true;
    location.hash = "plan";
  }
  function goWall() {
    if (state !== "plan") return;
    if (cameFromWall) { history.back(); return; }
    history.pushState(null, "", location.pathname + location.search);
    route(false);
  }

  function scrollToId(id, instant) {
    const target = id && id !== "plan" ? document.getElementById(id) : null;
    const behavior = instant ? "instant" : "auto";
    if (target) target.scrollIntoView({ block: "start", behavior });
    else window.scrollTo({ top: 0, behavior });
  }

  // ───── wall → plan ─────
  function openPlan(id, instant) {
    if (isPlaying()) exitPlay(true);
    state = "busy";
    hero.classList.add("is-leaving");
    const finish = () => {
      hero.hidden = true;
      planEl.hidden = false;
      document.body.classList.remove("is-wall");
      document.body.classList.add("is-plan");
      wall.stop();
      planEl.classList.remove("is-entering");
      void planEl.offsetWidth;
      if (!instant) planEl.classList.add("is-entering");
      scrollToId(id, true);
      if (id === "plan") $("doc").focus({ preventScroll: true });
      plan.onShow();
      state = "plan";
      requestAnimationFrame(() => veil.classList.remove("is-on"));
    };
    if (instant) {
      finish();
      return;
    }
    if (reduced) {
      veil.classList.add("is-on");
      setTimeout(finish, 220);
      return;
    }
    setTimeout(() => veil.classList.add("is-on"), 820);
    wall.zoomIn(pendingCell, finish);
    pendingCell = -1;
  }

  // ───── plan → wall ─────
  function closePlan() {
    state = "busy";
    veil.classList.add("is-instant", "is-on");
    void veil.offsetWidth;
    veil.classList.remove("is-instant");
    planEl.hidden = true;
    hero.hidden = false;
    hero.classList.add("is-leaving");
    document.body.classList.remove("is-plan");
    document.body.classList.add("is-wall");
    window.scrollTo(0, 0);
    wall.resize();
    cameFromWall = false;
    requestAnimationFrame(() => {
      veil.classList.remove("is-on");
      wall.zoomOut(() => {
        hero.classList.remove("is-leaving", "is-intro");
        state = "wall";
        wall.start();
        hit.focus({ preventScroll: true });
      });
    });
  }

  // ───── playable mode ─────
  function isPlaying() {
    const m = wall.mode;
    return m === "countdown" || m === "play" || m === "over";
  }
  function setHint(mode) {
    if (mode === "over") hint.textContent = mqFine.matches ? "Game over. Press Enter or click the wall to play again." : "Game over. Tap the wall to play again.";
    else hint.textContent = mqFine.matches ? "Steer with the arrow keys or W A S D. Esc stops the game." : "Swipe on the wall or use the arrows to steer.";
  }
  function enterPlay(fromKeyboard) {
    hero.classList.add("is-playing");
    hero.classList.remove("is-intro");
    playBtn.hidden = true;
    stopBtn.hidden = false;
    hint.hidden = false;
    dpad.hidden = mqFine.matches;
    setHint("play");
    wall.resize();
    wall.startPlay();
    hit.setAttribute("aria-label", "Snake game. Use the arrow keys to steer.");
    if (fromKeyboard) hit.focus({ preventScroll: true });
  }
  function exitPlay(silent) {
    hero.classList.remove("is-playing");
    playBtn.hidden = false;
    stopBtn.hidden = true;
    hint.hidden = true;
    dpad.hidden = true;
    hit.removeAttribute("aria-label");
    if (!hero.hidden) wall.resize();
    wall.stopPlay();
    if (!silent) playBtn.focus({ preventScroll: true });
  }
  function onWallMode(m) {
    if (m === "over" || m === "play") setHint(m);
  }

  playBtn.addEventListener("click", (e) => { e.stopPropagation(); enterPlay(e.detail === 0); });
  stopBtn.addEventListener("click", (e) => { e.stopPropagation(); exitPlay(); });

  dpad.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("[data-dir]");
    if (!b) return;
    e.preventDefault();
    wall.input(b.dataset.dir);
  });
  dpad.addEventListener("click", (e) => {
    e.stopPropagation();
    const b = e.target.closest("[data-dir]");
    if (b && e.detail === 0) wall.input(b.dataset.dir); // keyboard activation
  });

  const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
  window.addEventListener("keydown", (e) => {
    if (state !== "wall" || !isPlaying()) return;
    if (KEYS[e.key]) {
      e.preventDefault();
      wall.input(KEYS[e.key]);
    } else if (e.key === "Escape") {
      exitPlay();
    } else if ((e.key === "Enter" || e.key === " ") && wall.canRestart && !e.target.closest("button")) {
      e.preventDefault();
      wall.restart();
    }
  });

  // swipe to steer
  let swipe = null;
  hero.addEventListener("pointerdown", (e) => {
    if (!isPlaying() || e.pointerType === "mouse" || e.target.closest(".hero__bottom")) return;
    swipe = { x: e.clientX, y: e.clientY, moved: false };
  });
  hero.addEventListener("pointermove", (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    wall.input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    swipe = { x: e.clientX, y: e.clientY, moved: true };
  });
  const endSwipe = () => { swipe = null; };
  hero.addEventListener("pointerup", endSwipe);
  hero.addEventListener("pointercancel", endSwipe);

  // ───── tapping the wall ─────
  hero.addEventListener("click", (e) => {
    if (state !== "wall") return;
    if (e.target.closest(".hero__bottom")) return;
    if (isPlaying()) {
      if (wall.canRestart) wall.restart();
      return;
    }
    const cell = e.detail === 0 ? -1 : wall.cellAt(e.clientX, e.clientY);
    goPlan(cell);
  });

  document.addEventListener("click", (e) => {
    const back = e.target.closest("#back-btn, [data-back]");
    if (back) { goWall(); return; }
    const open = e.target.closest("[data-open-plan]");
    if (open && state === "wall") { e.preventDefault(); goPlan(-1); }
  });

  // ───── environment ─────
  mqReduce.addEventListener && mqReduce.addEventListener("change", () => {
    reduced = mqReduce.matches || forceStill;
    wall.setReducedMotion(reduced);
  });
  let rz = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => { if (!hero.hidden) wall.resize(); });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!hero.hidden) wall.resize(); });

  // ───── boot ─────
  if (location.hash.length > 1) {
    cameFromWall = false;
    route(true);
  } else {
    if (!reduced) hero.classList.add("is-intro");
    wall.resize();
    wall.start({ intro: !reduced });
  }
})();
