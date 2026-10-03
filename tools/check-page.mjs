// Smoke check for a game page: console errors, screenshots (mobile + desktop, every popup), online handshake.
//
//   node tools/check-page.mjs <slug> [--out /tmp/mg-<slug>] [--lang ru|en] [--theme light|dark] [--no-online]
//
// Needs the dev server: uv run --no-project python tools/serve.py
// Prints a JSON summary; look at the screenshots with the Read tool.
import { mkdirSync } from 'node:fs';
import { launch, BASE, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const slug = args[0];
if (!slug) { console.error('usage: node tools/check-page.mjs <slug>'); process.exit(2); }
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = opt('--out', `/tmp/mg-${slug}`);
const lang = opt('--lang', 'ru');
const theme = opt('--theme', 'light');
mkdirSync(out, { recursive: true });
const url = `${BASE}/games/${slug}/index.html`;
const summary = { url, shots: [], errors: {}, online: null };

async function fresh(b) {
  await b.nav(url, 400);
  await b.ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('mg-lang', '${lang}'); localStorage.setItem('mg-theme', '${theme}')`);
  await b.nav(url, 1800);
}

for (const [tag, w, h, mobile] of [['mobile', 390, 844, true], ['narrow', 360, 740, true], ['desktop', 1280, 860, false]]) {
  const b = await launch({ width: w, height: h, mobile });
  await fresh(b);
  summary.shots.push(await b.shot(`${out}/${tag}-1-first-visit.png`));
  await b.ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  await sleep(300);
  summary.shots.push(await b.shot(`${out}/${tag}-2-board.png`));
  if (tag !== 'narrow') {
    const sheets = await b.ev(`[...document.querySelectorAll('[data-sheet]')].map(x => x.dataset.sheet)`);
    for (const s of sheets) {
      await b.ev(`document.querySelector('[data-sheet=${s}]').click()`);
      await sleep(350);
      summary.shots.push(await b.shot(`${out}/${tag}-sheet-${s}.png`));
      await b.ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
    }
  }
  summary.errors[tag] = b.errors;
  await b.close();
}

// Solo games have no online button.
const probe = await launch();
await probe.nav(url, 1500);
const hasOnline = await probe.ev(`!!document.querySelector('#online') && !document.querySelector('#online').hidden`);
await probe.close();

if (!args.includes('--no-online') && hasOnline) {
  const A = await launch(), B = await launch();
  await fresh(A); await fresh(B);
  await A.ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.querySelector('#online').click()`);
  await sleep(300);
  await A.ev(`document.querySelector('[data-act=host]').click()`);
  await sleep(800);
  const code = await A.ev(`document.querySelector('.mg-on-code')?.textContent`);
  await B.nav(`${url}?room=${code}`, 1500);
  const status = (X) => X.ev(`document.querySelector('#online').dataset.status`);
  let ok = false;
  for (let i = 0; i < 60 && !ok; i++) { ok = (await status(A)) === 'connected' && (await status(B)) === 'connected'; if (!ok) await sleep(500); }
  await sleep(1000);
  summary.online = {
    code, connected: ok,
    host: await A.shot(`${out}/online-host.png`),
    guest: await B.shot(`${out}/online-guest.png`),
    errors: { host: A.errors, guest: B.errors },
  };
  await A.close(); await B.close();
}

// Dead public Nostr relays are expected noise (Trystero picks several, some are always down).
const RELAY = /WebSocket connection to 'wss:/;
const split = (list) => ({ real: list.filter((e) => !RELAY.test(e)), relay: list.filter((e) => RELAY.test(e)).length });
for (const k of Object.keys(summary.errors)) summary.errors[k] = split(summary.errors[k]).real;
if (summary.online) {
  const h = split(summary.online.errors.host), g = split(summary.online.errors.guest);
  summary.online.errors = { host: h.real, guest: g.real };
  summary.online.deadRelayWarnings = h.relay + g.relay;
}
summary.ok = Object.values(summary.errors).every((e) => !e.length) &&
  (!summary.online || (summary.online.connected && !summary.online.errors.host.length && !summary.online.errors.guest.length));
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
