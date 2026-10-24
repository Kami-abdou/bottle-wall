/*
  Renders the plan from window.CONTENT into #doc and the two tables of contents.
  Interactive parts: bottle counter, season timeline, cost table, checklist
  (saved in localStorage) and the experiment filter.
*/
(function () {
  "use strict";

  const BW = (window.BW = window.BW || {});

  // ───────────── tiny markup ─────────────

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function md(s) {
    let h = esc(s);
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\{\{verify(?::\s*([^}]*))?\}\}/g, (m, note) =>
      '<span class="verify"><span class="verify__label">verify</span>' +
      (note ? '<span class="verify__note">' + note.trim() + "</span>" : "") +
      "</span>"
    );
    h = h.replace(/_{3,}/g, '<span class="blank"><span class="visually-hidden">(blank, to fill in)</span></span>');
    return h;
  }
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmt = (n) => n.toLocaleString("en-US");

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      return null;
    }
  }

  // ───────────── blocks ─────────────

  const blocks = {
    p: (b) => `<p>${md(b.text)}</p>`,
    lead: (b) => `<p class="lead">${md(b.text)}</p>`,
    note: (b) => `<p class="note">${md(b.text)}</p>`,
    quote: (b) => `<blockquote class="oneline"><p>${md(b.text)}</p></blockquote>`,
    bigQuestion: (b) => `<p class="big-q"><span class="big-q__label">Big question</span>${md(b.text)}</p>`,
    ul: (b) => `<ul class="list">${b.items.map((i) => `<li>${md(i)}</li>`).join("")}</ul>`,
    ol: (b) => `<ol class="list list--num">${b.items.map((i) => `<li>${md(i)}</li>`).join("")}</ol>`,
    terms: (b) =>
      `<dl class="terms">${b.items.map(([t, d]) => `<div class="terms__row"><dt>${md(t)}</dt><dd>${md(d)}</dd></div>`).join("")}</dl>`,
    when: (b) =>
      `<ol class="when">${b.items.map(([t, d]) => `<li><span class="when__date">${md(t)}</span><span class="when__what">${md(d)}</span></li>`).join("")}</ol>`,
    moments: (b) => `<ul class="moments">${b.items.map((i) => `<li>${md(i)}</li>`).join("")}</ul>`,
    questions: (b) => `<ul class="questions">${b.items.map((i) => `<li>${md(i)}</li>`).join("")}</ul>`,
    beats: (b) =>
      `<ol class="beats" aria-label="The six beats of every video">${b.items.map((i, k) => `<li><span class="beats__n">${k + 1}</span>${md(i)}</li>`).join("")}</ol>`,
    table: (b) =>
      `<div class="table-wrap"><table class="table">
        <thead><tr>${b.head.map((h) => `<th scope="col">${md(h)}</th>`).join("")}</tr></thead>
        <tbody>${b.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${md(c)}</th>` : `<td>${md(c)}</td>`)).join("")}</tr>`).join("")}</tbody>
      </table></div>`,

    timeline: (b) => {
      const eps = b.episodes;
      return `<div class="arc" data-arc>
        <div class="arc__nav">
          <div class="arc__rail" role="group" aria-label="Jump to an episode">
            ${eps.map((e, i) => `<button type="button" class="arc__dot" data-go="${i}" aria-label="Ep ${e.ep}: ${esc(e.title)}"><span>Ep ${e.ep}</span></button>`).join("")}
          </div>
          <div class="arc__arrows">
            <button type="button" class="arc__arrow" data-step="-1" aria-label="Previous episode">
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M8 2 4 6l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button type="button" class="arc__arrow" data-step="1" aria-label="Next episode">
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <ol class="arc__track" tabindex="0" aria-label="Season arc, episode 0 to episode 6. Scrolls sideways.">
          ${eps
            .map(
              (e) => `<li class="ep" data-ep="${e.ep}">
              <p class="ep__no">Ep ${e.ep}</p>
              <h4 class="ep__title">${md(e.title)}</h4>
              <p class="ep__label">What happens</p>
              <p class="ep__what">${md(e.what)}</p>
              <div class="ep__payoff"><p class="ep__label">Payoff</p><p>${md(e.payoff)}</p></div>
            </li>`
            )
            .join("")}
        </ol>
      </div>`;
    },

    flow: (b) =>
      `<figure class="flow">
        <figcaption>${md(b.label)}</figcaption>
        <ol class="flow__steps">
          ${b.steps
            .map(
              (s) =>
                (s.link ? `<li class="flow__link" aria-label="via ${esc(s.link)}"><span>${md(s.link)}</span></li>` : "") +
                `<li class="flow__node"><strong>${md(s.name)}</strong><span>${md(s.detail)}</span></li>`
            )
            .join("")}
        </ol>
      </figure>`,

    costs: (b) => {
      const max = Math.max(...b.rows.map((r) => r[2]), 1);
      let lo = 0, hi = 0;
      const rows = b.rows
        .map(([item, l, h]) => {
          lo += l; hi += h;
          const left = (l / max) * 100, width = Math.max(((h - l) / max) * 100, 0);
          return `<tr>
            <th scope="row"><span class="costs__item">${md(item)}</span>
              <span class="range" aria-hidden="true">${h > 0 ? `<span class="range__bar" style="left:${left}%;width:${width}%"></span>` : `<span class="range__zero"></span>`}</span></th>
            <td class="num" data-label="Low">${fmt(l)}</td>
            <td class="num" data-label="High">${fmt(h)}</td>
            <td class="num costs__run" data-label="Running total">${fmt(lo)}–${fmt(hi)}</td>
          </tr>`;
        })
        .join("");
      return `<div class="table-wrap"><table class="table costs">
        <caption class="visually-hidden">Rough cost estimate in ${esc(b.currency)}, with a running total range</caption>
        <thead><tr><th scope="col">Item</th><th scope="col" class="num">Low</th><th scope="col" class="num">High</th><th scope="col" class="num">Running total</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th scope="row">Total</th><td class="num" data-label="Low">≈ ${fmt(lo)}</td><td class="num" data-label="High">≈ ${fmt(hi)}</td><td class="num costs__total" data-label="Range">${fmt(lo)}–${fmt(hi)} <span>${esc(b.currency)}</span></td></tr></tfoot>
      </table></div>`;
    },

    checklist: (b) =>
      `<div class="checklist" data-checklist="${esc(b.storageKey)}">
        <div class="checklist__status">
          <span class="checklist__leds" aria-hidden="true">${b.items.map(() => "<i></i>").join("")}</span>
          <span class="checklist__count" aria-live="polite"></span>
          <button type="button" class="link-btn checklist__reset">Clear all ticks</button>
        </div>
        <ul class="checklist__list">
          ${b.items
            .map(
              (i) => `<li><label class="check"><input type="checkbox" value="${esc(i.id)}"><span class="check__box" aria-hidden="true"></span><span class="check__text">${md(i.text)}</span></label></li>`
            )
            .join("")}
        </ul>
        <p class="checklist__hint">Ticks are saved in this browser only.</p>
      </div>`,

    roadmap: (b) =>
      `<ol class="roadmap">
        ${b.phases
          .map(
            (p) => `<li class="phase${p.n === b.highlight ? " phase--hl" : ""}">
            <div class="phase__head">
              <span class="phase__n" aria-hidden="true">${p.n}</span>
              <h4 class="phase__name"><span class="visually-hidden">Phase ${p.n}: </span>${md(p.name)}</h4>
              <span class="phase__when">${md(p.when)}</span>
              ${p.n === b.highlight ? `<span class="phase__tag">${md(b.highlightLabel)}</span>` : ""}
            </div>
            <p class="phase__focus">${md(p.focus)}</p>
            ${p.gate ? `<p class="phase__gate"><span>Gate to move on</span>${md(p.gate)}</p>` : `<p class="phase__gate phase__gate--none"><span>Gate to move on</span>—</p>`}
          </li>`
          )
          .join("")}
      </ol>`,

    pilots: (b) =>
      `<div class="pilots">
        <ol class="pilots__row">${b.slots.map((s, i) => `<li class="pilots__slot${/paid/i.test(s) ? " pilots__slot--paid" : ""}"><span class="pilots__n">${i + 1}</span>${md(s)}</li>`).join("")}</ol>
        <p class="pilots__earn">Each free pilot must earn ${b.earns.map((e) => `<span class="pilots__chip">${md(e)}</span>`).join(" ")}</p>
      </div>`,

    experiments: (b) => {
      const cats = [...new Set(b.items.map((x) => x[2]))];
      const levels = ["Easy", "Medium", "Hard"].filter((l) => b.items.some((x) => x[3] === l));
      const count = (fn) => b.items.filter(fn).length;
      const chip = (name, value, label, n, extra) =>
        `<label class="chip${extra || ""}"><input type="radio" name="${name}" value="${esc(value)}"${value === "" ? " checked" : ""}><span>${md(label)} <small>${n}</small></span></label>`;
      return `<div class="exps">
        <div class="exps__filters">
          <fieldset class="chips">
            <legend>Category</legend>
            ${chip("exp-cat", "", "All", b.items.length)}
            ${cats.map((c) => chip("exp-cat", c, c, count((x) => x[2] === c), (b.related || []).includes(c) ? " chip--wall" : "")).join("")}
          </fieldset>
          <fieldset class="chips">
            <legend>Level</legend>
            ${chip("exp-lvl", "", "All", b.items.length)}
            ${levels.map((l) => chip("exp-lvl", l, l, count((x) => x[3] === l))).join("")}
          </fieldset>
          <p class="exps__legend"><span class="wall-mark" aria-hidden="true"></span> Categories the bottle wall grows out of</p>
        </div>
        <p class="exps__count" aria-live="polite"></p>
        <ul class="exps__list">
          ${b.items
            .map(
              ([id, name, cat, lvl]) => `<li class="exp${(b.related || []).includes(cat) ? " exp--wall" : ""}" data-cat="${esc(cat)}" data-lvl="${esc(lvl)}">
              <span class="exp__id">${esc(id)}</span>
              <span class="exp__name">${md(name)}</span>
              <span class="exp__meta">
                <span class="exp__cat">${md(cat)}</span>
                <span class="exp__lvl" data-level="${esc(lvl)}"><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>${esc(lvl)}</span>
              </span>
            </li>`
            )
            .join("")}
        </ul>
      </div>`;
    }
  };

  // ───────────── render ─────────────

  BW.renderPlan = function (content, opts) {
    const doc = document.getElementById("doc");
    const toc = document.getElementById("toc");
    const tocMobile = document.getElementById("toc-mobile-nav");
    const reduced = opts && opts.reducedMotion;

    let n = 0;
    const tocParts = [];
    let body = "";
    for (const part of content.parts) {
      const items = [];
      body += `<section class="part" aria-labelledby="part-${part.id}"><h2 class="part__title" id="part-${part.id}">${md(part.title)}</h2>`;
      for (const sec of part.sections) {
        n++;
        items.push({ id: sec.id, num: pad2(n), title: sec.title });
        body += `<section class="sec" id="${sec.id}" aria-labelledby="h-${sec.id}">
          <h3 class="sec__title" id="h-${sec.id}"><span class="sec__num" aria-hidden="true">${pad2(n)}</span>${md(sec.title)}</h3>
          ${sec.blocks.map((b) => (blocks[b.type] ? blocks[b.type](b) : "")).join("")}
        </section>`;
      }
      body += `</section>`;
      tocParts.push({ title: part.title, items });
    }

    const { collected, goal } = content.bottles;
    const head = `<header class="doc__head" id="plan-start">
        <p class="doc__kicker">The full plan</p>
        <h1 class="doc__title">${md(content.title)}</h1>
        <figure class="counter" id="counter">
          <div class="counter__grid" aria-hidden="true"></div>
          <figcaption class="counter__caption">
            <span class="counter__num"><b>${fmt(collected)}</b> / ${fmt(goal)}</span>
            <span>bottles collected${goal > collected ? ` · ${fmt(goal - collected)} to go` : ""}</span>
          </figcaption>
        </figure>
        <p class="legend"><span class="verify"><span class="verify__label">verify</span></span> marks a claim that isn't checked yet. Don't present it as a fact.</p>
      </header>`;

    const foot = `<footer class="doc__foot">
        <p>This plan is generated from <code>content.js</code>. Edit that file to change it.</p>
        <button type="button" class="link-btn" data-back>Back to the wall</button>
      </footer>`;

    doc.innerHTML = head + body + foot;

    const tocHtml = tocParts
      .map(
        (p) => `<p class="toc__part">${md(p.title)}</p>
        <ol class="toc__list">${p.items.map((i) => `<li><a href="#${i.id}" data-toc="${i.id}"><span class="toc__num">${i.num}</span>${md(i.title)}</a></li>`).join("")}</ol>`
      )
      .join("");
    toc.innerHTML = tocHtml;
    tocMobile.innerHTML = tocHtml;

    buildCounter(collected, goal);
    doc.querySelectorAll("[data-checklist]").forEach(setupChecklist);
    doc.querySelectorAll("[data-arc]").forEach(setupArc);
    doc.querySelectorAll(".exps").forEach(setupExperiments);
    setupToc(tocParts);

    let counterShown = false;
    return {
      onShow() {
        if (counterShown) return;
        counterShown = true;
        animateCounter(collected, goal, reduced);
      }
    };
  };

  // ───────────── bottle counter: the wall in miniature ─────────────

  // The grid flows in columns (see .counter__grid), so DOM order is fill order.
  let counterCells = [];
  function buildCounter(collected, goal) {
    const grid = document.querySelector(".counter__grid");
    const frag = document.createDocumentFragment();
    counterCells = [];
    for (let i = 0; i < goal; i++) {
      const s = document.createElement("i");
      frag.appendChild(s);
      counterCells.push(s);
    }
    grid.appendChild(frag);
    const fig = document.getElementById("counter");
    fig.setAttribute("aria-label", `${collected} of ${goal} bottles collected`);
  }
  function animateCounter(collected, goal, reduced) {
    const n = Math.min(collected, goal);
    const lastCell = counterCells[n - 1];
    if (reduced) {
      for (let k = 0; k < n; k++) counterCells[k].className = "on";
      if (lastCell) lastCell.className = "on last";
      return;
    }
    const dur = 1400, t0 = performance.now();
    let done = 0;
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      const target = Math.round(n * (1 - Math.pow(1 - p, 3)));
      for (; done < target; done++) counterCells[done].className = "on";
      if (p < 1) requestAnimationFrame(tick);
      else if (lastCell) lastCell.className = "on last";
    })(t0);
  }

  // ───────────── checklist ─────────────

  function setupChecklist(root) {
    const key = root.dataset.checklist;
    const boxes = [...root.querySelectorAll("input[type=checkbox]")];
    const leds = [...root.querySelectorAll(".checklist__leds i")];
    const count = root.querySelector(".checklist__count");
    const saved = store(key) || {};
    boxes.forEach((b) => (b.checked = !!saved[b.value]));

    function update(save) {
      const state = {};
      let k = 0;
      boxes.forEach((b) => { state[b.value] = b.checked; if (b.checked) k++; });
      leds.forEach((l, i) => l.classList.toggle("on", i < k));
      count.textContent = `${k} of ${boxes.length} done`;
      root.classList.toggle("checklist--done", k === boxes.length);
      if (save) store(key, state);
    }
    root.addEventListener("change", () => update(true));
    root.querySelector(".checklist__reset").addEventListener("click", () => {
      if (!boxes.some((b) => b.checked)) return;
      if (!window.confirm("Clear every tick on this checklist?")) return;
      boxes.forEach((b) => (b.checked = false));
      update(true);
    });
    update(false);
  }

  // ───────────── season arc ─────────────

  function setupArc(root) {
    const track = root.querySelector(".arc__track");
    const eps = [...track.children];
    const dots = [...root.querySelectorAll(".arc__dot")];
    let active = 0;

    function go(i) {
      i = Math.max(0, Math.min(eps.length - 1, i));
      const target = eps[i];
      track.scrollTo({ left: target.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft || 0), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    function setActive(i) {
      active = i;
      dots.forEach((d, k) => {
        d.classList.toggle("is-active", k === i);
        d.classList.toggle("is-past", k < i);
        if (k === i) d.setAttribute("aria-current", "step");
        else d.removeAttribute("aria-current");
      });
    }
    dots.forEach((d) => d.addEventListener("click", () => go(+d.dataset.go)));
    root.querySelectorAll(".arc__arrow").forEach((a) => a.addEventListener("click", () => go(active + +a.dataset.step)));
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
    });

    let ticking = false;
    track.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const x = track.scrollLeft;
        let best = 0, bestD = Infinity;
        eps.forEach((ep, k) => {
          const d = Math.abs(ep.offsetLeft - track.offsetLeft - x - parseFloat(getComputedStyle(track).paddingLeft || 0));
          if (d < bestD) { bestD = d; best = k; }
        });
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) best = eps.length - 1;
        if (best !== active) setActive(best);
      });
    }, { passive: true });
    setActive(0);
  }

  // ───────────── experiments ─────────────

  function setupExperiments(root) {
    const items = [...root.querySelectorAll(".exp")];
    const count = root.querySelector(".exps__count");
    function apply() {
      const cat = root.querySelector("input[name=exp-cat]:checked").value;
      const lvl = root.querySelector("input[name=exp-lvl]:checked").value;
      let k = 0;
      items.forEach((it) => {
        const show = (!cat || it.dataset.cat === cat) && (!lvl || it.dataset.lvl === lvl);
        it.hidden = !show;
        if (show) k++;
      });
      count.textContent = k === items.length ? `All ${k} experiments` : k === 0 ? "No experiments match these filters." : `Showing ${k} of ${items.length}`;
    }
    root.addEventListener("change", apply);
    apply();
  }

  // ───────────── table of contents ─────────────

  function setupToc(parts) {
    const current = document.getElementById("toc-current");
    const details = document.getElementById("toc-mobile");
    const links = [...document.querySelectorAll("[data-toc]")];
    const titles = {};
    parts.forEach((p) => p.items.forEach((i) => (titles[i.id] = i.num + " " + i.title)));

    function mark(id) {
      links.forEach((a) => {
        if (a.dataset.toc === id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
      current.textContent = titles[id] ? titles[id] : "";
    }
    document.querySelectorAll("#toc-mobile-nav a").forEach((a) => a.addEventListener("click", () => { details.open = false; }));

    const secs = [...document.querySelectorAll(".sec")];
    const visible = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
        const first = secs.find((s) => visible.get(s.id));
        if (first) mark(first.id);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    secs.forEach((s) => io.observe(s));
    mark(secs[0] && secs[0].id);
  }
})();
