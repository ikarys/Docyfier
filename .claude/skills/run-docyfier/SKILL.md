---
name: run-docyfier
description: Launch Docyfier and look at it — dev server, a headless browser, screenshots of a real document. Use when asked to run or start the app, to screenshot the editor, or to confirm a rendering change works in the product rather than in a test. Covers the port collision, the demo documents worth shooting, and when to hand over to docyfier-lab instead.
---

# Running Docyfier

Two ways to see the app, and the first question is which one you need.

- **A look** — does this render, did the layout break, what does the toolbar
  say. Dev server plus a short Playwright script. Everything below.
- **A verdict** — did the AI answer well, did the export keep the tables, is
  the design sound. That is `../docyfier-lab`, a bench built for it. Do not
  rebuild any of it here: see [Hand it to the lab](#hand-it-to-the-lab).

## The dev server

```sh
npm run dev > /tmp/dev.log 2>&1 &
timeout 60 bash -c 'until curl -sf -o /dev/null http://localhost:3000; do sleep 1; done'
```

**Read the log for the port.** Something else usually holds 3000 on this
machine, and Next moves to **3001** without failing. The poll above then
succeeds against the other process and everything after it is a lie:

```sh
grep -oE 'http://localhost:[0-9]+' /tmp/dev.log | head -1
```

Stop it by the port, not by name — `pkill -f` can match the agent's own
command line:

```sh
lsof -ti:3001 -sTCP:LISTEN | xargs -r kill
```

Auth is off unless credentials were saved (STEP 4 made it opt-in), so there is
normally nothing to sign in to. If `/login` answers, the lab's
`DocyfierApp.signIn` is the shortest way through.

## The browser

There is no `chromium-cli` on this machine and **Playwright is not a Docyfier
dependency** — it belongs to the lab, and Docyfier's `package.json` must stay
that way. The browsers are already downloaded in `~/.cache/ms-playwright`, so
install the package into a scratch directory and run from there:

```sh
npm i --prefix "$SCRATCH" --no-save playwright
cd "$SCRATCH" && node shoot.mjs
```

A script that opens a document, does something, and shoots:

```js
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto("http://localhost:3001/doc/u2-demo", { waitUntil: "networkidle" });
await page.waitForSelector(".doc-sheet", { timeout: 20000 });
await page.waitForTimeout(1200);          // the editor mounts after hydration
await page.screenshot({ path: "shot.png" });

console.log("ERRORS", errors.length ? errors : "none");
await browser.close();
```

**Look at the image.** A screenshot nobody read proves the server answered,
nothing more — the truncated `<select>` fixed in `65e64a3` typechecked, tested
and shipped clean, and was obvious the moment anyone looked at it.

### Documents worth shooting

| Route | What is in it |
| --- | --- |
| `/doc/u2-demo` | the rendering tour: cover, table of contents, stat row, cards, callouts, a chart, a page break, an image, a step list. The one to use for anything about layout or theming. |
| `/doc/chart-demo` | charts on their own |
| `/` | the picker and the templates gallery |

`u2-demo` references an upload this checkout does not have, so
`/api/uploads/u2-demo-gradient.png` answers **500** and the image falls back to
a gradient. Pre-existing; not the change under test.

### Measuring, not just looking

Computed values say what a screenshot only suggests — and they are what catches
a rule that applied to the wrong element:

```js
const box = await page.locator(".doc-sheet").boundingBox();
const font = await page.locator(".doc-shell").evaluate((el) => getComputedStyle(el).fontSize);
const align = await page.evaluate(() => ({
  sheet: Math.round(document.querySelector(".doc-sheet").getBoundingClientRect().top),
  panel: Math.round(document.querySelector(".ai-panel")?.getBoundingClientRect().top ?? 0),
}));
```

Reference numbers at a 1600px viewport with the assistant panel open:
Wide 856px · A4 754px · Full 1208px; the shell's font is `16px × zoom` and
`--doc-gutter` follows it, because the sheet's own spacing is in `em`
(`page-view.ts`). Sheet and panel both start at y=127.

## Hand it to the lab

`../docyfier-lab` drives a running instance from outside and judges what comes
back. It already has Playwright, a `DocyfierApp` page object, a session helper
and twelve suites. Anything below is its job, not a script written here:

```sh
cd ../docyfier-lab
npm run checks       # its own rules — no app, no model, instant
npm run bench:http   # generate, caret, transform, pretty, ascii-diagram, export
npm run bench:ui     # selection, block actions, import, image, compose, design
```

Point `LAB_APP_URL` at the port the dev server actually took — it defaults to
`http://localhost:3000`, which is the wrong one whenever Next has moved.

The lab needs an LLM server for every suite that asks the app to write. A
rendering change does not, and that is the case this skill exists for.
