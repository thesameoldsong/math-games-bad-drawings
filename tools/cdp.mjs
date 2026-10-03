// Tiny headless-Chrome driver over the DevTools protocol (no deps). Safe to run many in parallel:
// each browser gets a free port and its own temp profile.
//
//   import { launch, BASE } from './cdp.mjs';
//   const b = await launch({ width: 390, height: 844, mobile: true });
//   await b.nav(`${BASE}/games/dots-and-boxes/`);
//   await b.ev(`document.title`);   await b.click('#new');   await b.tap(x, y);
//   await b.shot('/tmp/x.png');      console.log(b.errors);    await b.close();
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const BASE = process.env.MG_BASE || 'https://localhost:8443';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 390, height = 844, mobile = true, lang = 'ru' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'mg-chrome-'));
  const ch = spawn('google-chrome-stable', [
    '--headless=new', '--disable-gpu', '--ignore-certificate-errors', '--no-first-run',
    '--remote-debugging-port=0', `--user-data-dir=${dir}`, `--lang=${lang}`, 'about:blank',
  ], { stdio: 'ignore' });
  const portFile = join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  let list;
  for (let i = 0; i < 50; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.some((t) => t.type === 'page')) break; } catch {}
    await sleep(100);
  }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  const pend = {}, errors = [], logs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend[d.id]) { pend[d.id](d.result ?? d.error); delete pend[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') {
      const x = d.params.exceptionDetails;
      errors.push(x.exception?.description || x.text);
    }
    if (d.method === 'Runtime.consoleAPICalled') {
      const text = d.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      (d.params.type === 'error' ? errors : logs).push(text);
    }
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error' && !/favicon\.ico/.test(d.params.entry.url || '')) {
      errors.push(`${d.params.entry.text} ${d.params.entry.url || ''}`);
    }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r?.result?.value;
  };
  return {
    send, ev, errors, logs,
    async nav(url, wait = 1500) { await send('Page.navigate', { url }); await sleep(wait); },
    async shot(file) { const r = await send('Page.captureScreenshot'); writeFileSync(file, Buffer.from(r.data, 'base64')); return file; },
    click: (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).click()`),
    // Real input events at viewport coordinates (CSS px).
    async tap(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    },
    async close() { try { ws.close(); } catch {} ch.kill(); await sleep(200); rmSync(dir, { recursive: true, force: true }); },
  };
}
