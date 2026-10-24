# Design plan — "Our building is a video game"

One page, two states: **the Wall** (a loud, warm, night-time moment) and
**the Plan** (a calm lab notebook). All boldness goes into the wall; the plan
stays disciplined so the founders can actually work from it on a phone.

## Subject and mood

A real Tunisian residential block at night. Concrete facade, rooftop water
tanks and satellite dishes, an AC unit dripping onto a balcony, one window lit
by a TV. On the second-floor balcony, a frame of 512 plastic bottles glows and
plays Snake. A sodium street lamp paints the pavement orange; someone in the
street holds up a phone. Neighbourly and a bit mischievous, not a startup hero.

## Direction (October 2026 restyle)

Moved toward the look of wondermakers.games: near-black, one acid-lime accent,
one geometric sans set very large, grain, tactile buttons. The aim is a page
that feels made by hand rather than generated:

- **Pixels only where real pixels exist.** The LED wall and its score are
  pixels; nothing else on the page is. No dot-matrix type.
- **One loud colour.** Lime is the LED colour and the only UI accent. Warm
  sodium stays inside the street scene.
- **Real bottles.** The wall shows bottle bottoms (the LEDs sit in the necks):
  ribbed water bottles, five-footed soda bottles, the odd brown one, each a
  little crooked, in a treated-wood frame with a cable taped down the facade.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--night` | `#000000` | wall background |
| `--paper` | `#000000` | plan background (name kept from the paper version) |
| `--panel` | `#0b0b0b` | section panels, 20 px radius, 8 px apart |
| `--sky` | `#121212` | raised surfaces: counter cells, tags, flow nodes |
| `--snake` | `#d4fb08` | LED lime: snake, buttons, accents, headline gradient |
| `--snake-2` | `#8ef03a` | green end of the headline gradient |
| `--food` | `#ff4d3d` | food LED, "verify" tags (thin outline, never a fill) |
| `--sodium` | `#f2a65a` | street lamp, lit windows (scene only) |
| `--ink` | `#f2f2ee` | plan text |
| `--ink-soft` | `#9a9a96` | secondary text |

Big headlines use `--lime-text`, a lime → green → lime gradient clipped to
the text. Text on lime is `--on-lime` (`#0a0a0a`).

## Type

- **Urbanist** (Google Fonts) for everything: headlines at weight 500 with
  tight tracking (−0.045em) and 0.9 line height, body at 500. A free
  stand-in for Codec Pro, the face Wonder Games uses.
- **IBM Plex Sans Arabic** as the fallback, so Derja / Arabic copy still
  renders properly.
- Sentence case everywhere. No uppercase labels, no letter-spaced eyebrows.
- Body line length capped at ~68ch.

## The wall (canvas)

- One `<canvas>`, sized with `devicePixelRatio` (capped at 2).
- The static scene (sky, building, unlit bottles, street, lamp, person) is
  drawn once per resize into an offscreen canvas. Each frame only blits that
  and draws lit bottles from pre-rendered sprites: a glow sprite (additive
  blending, bleeds ~2 cells onto the facade) and a body sprite (capsule with a
  highlight, so it reads as plastic). Cost per frame ≈ lit cells × 2 drawImage.
- Every bottle has a brightness that rises fast and decays slowly, like a real
  LED behind diffusing plastic, so the snake leaves a short warm trail.
- Sequence: dark facade → one bottle lights (bottom-left area) → a beat → a
  ripple lights the rest outward from that bottle → whole-wall flash → it
  decays into a self-playing Snake (BFS to food, flood-fill safety check).
- The text lives in HTML over the canvas (title + one line at the top, prompt +
  "Play Snake" at the bottom). The canvas positions the wall in the space left
  between them, so nothing overlaps on a 360 px phone.

```
 ┌───────────────────────────┐  phone, portrait
 │ Our building is a         │  ← Doto title
 │ video game                │
 │ "We turned 512 empty…"    │  ← one line
 │ ░ ▓▓ ░  roof, water tank  │
 │ ▢  ▣   ▢   windows        │
 │ ┌───────────────────────┐ │
 │ │ ∘∘∘∘∘∘●●●●∘∘∘∘∘∘∘∘∘∘∘ │ │  ← 32 × 16 bottles on the balcony
 │ │ ∘∘∘∘∘∘∘∘∘●∘∘∘∘∘∘∘✱∘∘∘ │ │
 │ └───────────────────────┘ │
 │ ▢ café door ▢    lamp ┐   │
 │ ─────────────── 🧍📱 ─────│  ← street, sodium glow
 │ ● Tap the wall to open    │
 │   the plan.  [Play Snake] │
 └───────────────────────────┘
```

## The transition (wall → plan)

Zoom into one bottle (the one tapped, or the snake's head when opened with
the keyboard). As the camera dives in, that bottle's LED warms to full white
and then to the paper colour; at the end the bottle fills the screen and *is*
the plan's paper. The plan's first heading fades up on it. "Back to the wall"
plays the same move in reverse: the paper shrinks back into a bottle.
With reduced motion: a 200 ms crossfade, and the wall is shown fully lit with a
static Snake frame.

## The plan

```
 desktop                                   phone
 ┌──────────┬─────────────────────────┐    ┌──────────────────────┐
 │ ◂ wall   │  bottle counter 312/512 │    │ ◂ wall  Sections ▾   │ sticky
 │          │                         │    ├──────────────────────┤
 │ The wall │  01 The idea in one line│    │ 01 The idea…         │
 │  01 …    │  02 Why people care     │    │ …                    │
 │  02 …    │  05 Season arc ───────▸ │    │ timeline → scrolls   │
 │ Bigger   │     Ep0 Ep1 … Ep6       │    │                      │
 │  14 …    │  11 Costs + running sum │    │                      │
 │ (sticky) │  12 Checklist ☐ ☑       │    │                      │
 └──────────┴─────────────────────────┘    └──────────────────────┘
```

- Lab-notebook paper with a faint grid, numbered sections (01…21) like lab
  notes, grouped as "The bottle wall" and "The bigger plan".
- Components each have their own shape instead of identical cards:
  - **Bottle counter**: a 32 × 16 grid of 512 cells, the wall in miniature,
    filling from bottom-left; number from `content.js`.
  - **Season arc**: horizontal snap-scrolling track with an LED rail, Ep 0→6,
    hook and payoff per episode, dot buttons to jump.
  - **Costs**: table with low / high / running total, plus a thin range bar
    per line.
  - **Checklist**: real checkboxes stored in `localStorage`, progress as ten
    LED dots.
  - **Experiment index**: compact list, filter by category and level.
  - **How the wall works**: a small flow strip phone → server → ESP32 → bottles.
- `(verify)` becomes a small outlined red "verify" tag with its note; a legend
  at the top says these are not facts yet.
- `___` blanks render as fill-in slots, so they read as "to be filled".

## Check against Part 2

- Memorable thing is the wall, plan is calm: yes.
- No gradient washes (the only gradients are light: lamp glow and LED glow).
- No identical rounded cards, no SaaS stat blocks, no arrows on links.
- Sentence case, Doto + Plex Sans Arabic, palette as given.
- Reduced motion, keyboard (wall is a focusable button), canvas text
  description, mobile-first: all planned.
