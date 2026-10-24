# Our building is a video game

A single page that opens on an animated wall of 512 plastic bottles playing
Snake. Tap the wall and it zooms into one bottle, which becomes the paper of
the full plan: the season of videos, the build, the costs, the safety rules,
and the café-lab plan it belongs to.

Plain HTML, CSS and JavaScript. No build step, no framework, no images.

## Run it locally

Open `index.html` in a browser. That's it.

If you prefer a local server (closer to how it behaves once deployed):

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Edit the content

Everything you read on the page lives in **`content.js`**. Change the text,
save, reload. You never need to touch the layout files to update the plan.

Things you'll update most:

- **Bottle counter**: `bottles: { collected: 312, goal: 512 }`.
- **Costs**: the `costs` block, each row is `[item, low, high]`. The running
  total and the total line are calculated for you.
- **Checklist**: the `checklist` block. Each item needs a stable `id`; ticks
  are saved per browser under that id, so renaming the text keeps the tick,
  changing the id resets it.
- **Experiments**: the `experiments` block, each row is
  `[number, name, category, level]`. Filters are built from whatever
  categories and levels appear.

Small markup you can use inside any text:

| Write | Shows |
|---|---|
| `**bold**` | bold text |
| `{{verify}}` | a red "verify" tag: a claim we haven't checked yet |
| `{{verify: which festival}}` | the same tag with a note |
| `___` | a fill-in blank for a number we don't have yet |

Keep `{{verify}}` on anything unconfirmed. The page explains to readers that
tagged items are not facts.

## Files

| File | What it does |
|---|---|
| `index.html` | Page skeleton |
| `content.js` | All the copy |
| `styles.css` | All styling (colour tokens at the top) |
| `js/wall.js` | The canvas wall: scene, LEDs, self-playing and playable Snake, zoom |
| `js/plan.js` | Builds the plan from `content.js`: TOC, timeline, costs, checklist, counter, experiment filter |
| `js/app.js` | Switches between the wall and the plan, input, URLs |
| `DESIGN.md` | The design plan the page was built from |

## Useful URLs

- `index.html#plan`: open straight on the plan.
- `index.html#costs` (or any section id from `content.js`): open the plan at
  that section. Good for sending someone a link to one part.
- `index.html?still`: preview the reduced-motion version (lit wall, no
  animation). It's what visitors with "reduce motion" switched on get
  automatically.

## Playing Snake on the page

Press **Play Snake**. Arrow keys or W A S D on a computer; swipe on the wall or
use the on-screen arrows on a phone. The score shows on the wall itself, and
the best score is kept in this browser.

## Deploy

It's a static site, so any static host works. Upload the whole folder as is.

- **Netlify**: drag the folder onto https://app.netlify.com/drop.
- **Vercel**: `npx vercel` in this folder, accept the defaults (no build
  command, output directory is the folder itself).
- **GitHub Pages**: push the folder to a repository, then Settings → Pages →
  deploy from the branch root.

The only external request is Google Fonts (Doto and IBM Plex Sans Arabic).
Without a connection, the page falls back to system fonts and still works.

## Notes

- Checklist ticks and the Snake high score live in each visitor's own
  browser (`localStorage`). They are not shared between the three of you. If
  the team needs one shared checklist, that needs a small backend or a shared
  doc.
- The wall respects the system "reduce motion" setting: no cascade, no zoom,
  a still frame of the game instead.
