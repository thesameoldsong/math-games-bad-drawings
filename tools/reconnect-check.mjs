// Reconnect scenarios for a game's online mode (2 seats): guest reload, double reload, guest reopening the
// link in a new tab (now and after 8 s), host reload, and an extra player who must be turned away.
//
//   node tools/reconnect-check.mjs <slug> [--seats N]
//
// Checks connectivity only; whether the *match* survives (e.g. host reload keeps the board) is game-specific —
// pass --probe "<js expr>" returning a short state string; it is printed before and after each scenario.
import { launch, BASE, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const slug = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const probe = opt('--probe', `document.querySelector('#status')?.textContent || ''`);
const url = `${BASE}/games/${slug}/index.html`;
const status = (X) => X.ev(`document.querySelector('#online')?.dataset.status || '-'`);
const view = async (X) => `${await status(X)} | ${await X.ev(probe).catch(() => '?')}`;

async function waitConnected(list, ms = 40000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await Promise.all(list.map(status));
    if (s.every((x) => x === 'connected')) return `OK in ${((Date.now() - t0) / 1000).toFixed(1)}s`;
    await sleep(500);
  }
  return 'TIMEOUT';
}

async function room() {
  const A = await launch(), B = await launch();
  await A.nav(url, 2000);
  await A.ev(`localStorage.setItem('mg-seen-${slug}-how', '1'); document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.querySelector('#online').click()`);
  await sleep(300);
  await A.ev(`document.querySelector('[data-act=host]').click()`);
  await sleep(800);
  const code = await A.ev(`document.querySelector('.mg-on-code').textContent`);
  await B.nav(`${url}?room=${code}`, 1500);
  await waitConnected([A, B]);
  await A.ev(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
  return { A, B, code };
}

const results = {};
for (const v of ['guest-reload', 'guest-double-reload', 'guest-new-tab', 'guest-new-tab-8s', 'host-reload', 'extra-player']) {
  const { A, B, code } = await room();
  const before = { host: await view(A), guest: await view(B) };
  let G = B, X = null;
  if (v === 'guest-reload') await B.send('Page.reload', {});
  if (v === 'guest-double-reload') { await B.send('Page.reload', {}); await sleep(700); await B.send('Page.reload', {}); }
  if (v.startsWith('guest-new-tab')) { await B.close(); if (v.endsWith('8s')) await sleep(8000); G = await launch(); await G.nav(`${url}?room=${code}`, 300); }
  if (v === 'host-reload') await A.send('Page.reload', {});
  if (v === 'extra-player') { X = await launch(); await X.nav(`${url}?room=${code}`, 300); }
  await sleep(1500);
  const r = { connect: await waitConnected([A, G]), before };
  await sleep(1000);
  r.after = { host: await view(A), guest: await view(G) };
  if (X) { await sleep(17000); r.extra = await X.ev(`document.querySelector('.mg-on-error')?.textContent || '(no error shown)'`); r.stillConnected = await waitConnected([A, G], 3000); await X.close(); }
  r.errors = [A, G].flatMap((b) => b.errors.filter((e) => !/WebSocket connection to 'wss:/.test(e)));
  results[v] = r;
  await A.close(); await G.close();
}
const ok = Object.values(results).every((r) => r.connect.startsWith('OK') && !r.errors.length && (!r.extra || /\S/.test(r.extra) && r.stillConnected.startsWith('OK')));
console.log(JSON.stringify({ slug, ok, results }, null, 2));
process.exit(0);
