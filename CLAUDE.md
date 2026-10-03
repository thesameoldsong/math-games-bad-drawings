# Math Games with Bad Drawings — interactive companion

## Stack (decided — don't change without asking)
- Static site for GitHub Pages. No build step, no framework, no bundler at runtime.
- Vanilla JS, native ES modules (`<script type="module">`). Needs an HTTP server (no `file://`).
- SVG for all boards and drawings. CSS for layout. Fonts: Caveat (hand) + PT Serif (body), self-hosted in vendor/fonts/.
- Third-party libs are vendored as single ESM files in `vendor/` (see `vendor/README.md`). No CDNs for JS.
- Online play: WebRTC P2P via Trystero (Nostr relays for signaling) — no backend of our own.
- Node (built-in `node:test` / plain scripts) for engine tests; headless Chrome via CDP for UI checks.
- Python only via `uv` (`uv run --no-project python ...`), never bare `python3`/`pip`.
- Preview: `uv run --no-project python tools/serve.py` → https://<lan-ip>:8443/ (self-signed HTTPS; online play needs a secure context, plain http on a LAN IP breaks WebRTC/crypto.subtle)

## Layout
- `index.html` — catalog; reads `shared/games.js`.
- `shared/style.css` — palette (CSS vars), sketchy buttons, **game page layout** (`body.game`, `.arena`, `.player`, `.toolbar`, `.tool`), popups (`.mg-dialog`), result card, online dialog.
- `shared/sketch.js` — `line`, `circle`, `scribble`, `figureSVG({color, mood, pose, face, seed})`, `PALETTE`, `injectDefs()` (crayon/marker SVG filters; call once per page).
- `shared/i18n.js` — `addStrings(lang, {...})`, `t(key, vars)` (array value → random pick), `plural(n, key)`, `getLang()`, `applyI18n()`, `data-i18n` / `data-i18n-html` / `data-i18n-placeholder`, `mg:lang` event. RU + EN required for every string. Shared UI labels: `ui.*`.
- `shared/ui.js` — `icon(name)`, `mountTools()` (fills `.tool[data-icon][data-label]`), `mountSheets()` (`[data-sheet=x]` opens `dialog#sheet-x`), `showOnce('how', slug)`.
- `shared/net.js` — `mountOnline({slug, button, onSession, onEnd})`; session: `seat` (host 0 / guest 1), `host`, `connected`, `send(type, payload)`, `on(type, fn)`; events `status`, `peer-join`, `peer-leave`.
- `shared/games.js` — registry of the book's featured + short games (54); the orchestrator adds slugs to `READY` (game agents don't edit it).
- `games/<slug>/` — one folder per game: `index.html`, `strings.js`, `engine.js` (pure logic + AI, no DOM, `export const X = {...}`), `game.js` (UI, module entry), `style.css` (board-only styles).
  **`games/dots-and-boxes/` is the reference implementation — copy its page structure, toolbar, dialogs and online wiring.**

## Game page UX (mobile first, desktop must look good too)
- Screen = title bar + two player cards + board + status line. Nothing else visible by default.
- Rules / tips / history / settings live in popups (`dialog.mg-dialog#sheet-*`), opened from toolbar icons:
  mobile → fixed bottom bar; desktop (≥900px) → icon columns left and right of the board.
- Rules sheet auto-opens on the first visit (`showOnce`).
- Toolbar: info group (how, tips, origin) + play group (settings, online, undo, restart).

## Visual style (match the book's look, draw everything ourselves)
- White paper, two players = blue `#1ea5cf` vs red `#ec3a4a`, dark ink `#3b3b44`.
- Marker-like wobbly strokes (`line`, round caps), crayon-textured fills (`filter="url(#mg-crayon)"`), handwritten Caveat font.
- Stick-figure players react to events (mood/pose + speech bubbles).
- Cache random wobble per element so redraws don't jitter.

## Testing tools
- `node tools/check-page.mjs <slug>` — console errors, screenshots (390/360/1280 px, every popup) and an online handshake between two browsers; prints JSON (`ok`, screenshot paths). View PNGs with the Read tool.
- `tools/cdp.mjs` — `launch({width, height, mobile})` → `{nav, ev, click, tap, shot, errors, close}` for custom gameplay scripts (many can run in parallel).
- Engine tests: `games/<slug>/engine.test.mjs` with `node:test` → `node --test games/<slug>/`.
- Rules source: the book PDF in the repo root (`pdftotext -f <p> -l <p> -layout *.pdf -`). Read it for rules only — never copy its text or images.

## Online protocol convention
- Host is authoritative: on `peer-join` the host sends full `state`; guest replaces its state.
- Moves: `move` with a move counter; on mismatch guest sends `resync`, host re-sends `state`.
- `name` for player names. Restart (`new`) and settings changes are host-only; the guest's restart button is disabled and the result card says who starts the next game. Undo and vs-computer are disabled online.
- Games with hidden information: host keeps secrets and only sends each side what it may see.

## Content rules
- Never copy text or images from the book PDF. Rules, tips, history are written in our own words; drawings are our own SVG.
- Every game page includes the `site.credit` block (in the history popup and page footer).
- Russian UI text: avoid gendered past-tense verbs with player names ("Побеждает {name}", not "{name} победил").

## Each game must have
- Hot-seat mode; vs-computer where it makes sense (at least easy + a decent level); online two-device mode.
- Undo, restart, settings persisted in localStorage (`mg-<slug>`), touch + mouse, works at 360px wide.
- Win/tie overlay. No console errors.
- Engine testable under node: `import { X } from './engine.js'`.
