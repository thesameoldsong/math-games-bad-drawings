// Two-device play over WebRTC (Trystero, Nostr relays for signaling — no server of our own).
//
// Host creates a room → shares link/QR/code → guest joins. Host is seat 0, guest seat 1.
// Games exchange their own messages via session.send(type, payload) / session.on(type, fn).
// Convention: host is authoritative — on 'peer-join' the host sends the full game state.
//
//   import { mountOnline } from '../../shared/net.js';
//   mountOnline({ slug: 'dots-and-boxes', button: el, onSession(session) { ... } });
import { joinRoom } from '../vendor/trystero.js';
import qrcode from '../vendor/qrcode.js';
import { t, addStrings, applyI18n } from './i18n.js';

const APP_ID = 'math-games-with-bad-drawings';

// Trystero logs a normal peer close (reload, rejected third player) as a console error; drop just that one.
const consoleError = console.error.bind(console);
console.error = (...a) => {
  if (/peer error/.test(String(a[0])) && /User-Initiated Abort|Close called/.test(String(a[1]?.message ?? a[1]))) return;
  consoleError(...a);
};
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
const cleanCode = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

// Stable per-tab id, so a guest who reloads is recognised and not mistaken for a third player.
const clientId = sessionStorage.getItem('mg-client-id') || Math.random().toString(36).slice(2, 12);
sessionStorage.setItem('mg-client-id', clientId);

// Low-level session. Events: 'status' (waiting|connected|lost), 'peer-join', 'peer-leave', 'full', plus game message types.
// Handshake: guest → '_hello' {clientId}; host → '_welcome' (seat taken) or '_full' (room already has two players).
export function createSession({ slug, code, host }) {
  const room = joinRoom({ appId: APP_ID }, `${slug}:${code}`);
  const action = room.makeAction('msg');
  const handlers = {};
  let peer = null, peerClient = null, status = 'waiting';

  const emit = (type, payload) => (handlers[type] || []).forEach((fn) => fn(payload));
  const setStatus = (s) => { status = s; emit('status', s); };
  const sys = (type, target, payload) => action.send({ type, payload }, { target });
  const accept = (id) => { peer = id; setStatus('connected'); emit('peer-join'); };

  room.onPeerJoin = (id) => { if (!host) sys('_hello', id, { clientId }); };
  room.onPeerLeave = (id) => {
    if (id !== peer) return;
    peer = null;
    setStatus('lost');
    emit('peer-leave');
  };
  action.onMessage = (msg, { peerId }) => {
    switch (msg.type) {
      case '_hello': {
        if (!host) return; // guests ignore each other
        const same = peerId === peer || msg.payload?.clientId === peerClient;
        if (peer && !same) return sys('_full', peerId);
        peerClient = msg.payload?.clientId;
        sys('_welcome', peerId);
        return accept(peerId);
      }
      case '_welcome': if (!host && !peer) accept(peerId); return;
      case '_full': if (!host && !peer) { status = 'full'; emit('full'); } return;
      default: if (peerId === peer) emit(msg.type, msg.payload);
    }
  };

  return {
    slug, code, host,
    seat: host ? 0 : 1,
    get status() { return status; },
    get connected() { return status === 'connected'; },
    link: () => `${location.origin}${location.pathname}?room=${code}`,
    send(type, payload) { if (peer) action.send({ type, payload }, { target: peer }); },
    on(type, fn) { (handlers[type] ||= []).push(fn); return this; },
    async leave() { await room.leave(); },
  };
}

// ---------- UI: button + dialog ----------
const storeKey = (slug) => `mg-net-${slug}`;
// Trystero needs WebCrypto, which browsers only expose on https:// (or localhost).
export const onlineSupported = () => window.isSecureContext && !!globalThis.crypto?.subtle && 'RTCPeerConnection' in window;

export function mountOnline({ slug, button, onSession, onEnd }) {
  injectDialog();
  const dlg = document.getElementById('mg-online');
  let session = null;

  const remember = (s) => sessionStorage.setItem(storeKey(slug), JSON.stringify({ code: s.code, host: s.host }));

  function start(code, host) {
    end(true);
    if (!onlineSupported()) { renderDialog(); dlg.querySelector('.mg-on-error').textContent = t('net.insecure'); return; }
    session = createSession({ slug, code, host });
    session.startedAt = Date.now();
    remember(session);
    const me = session; // ignore late events from a session we already left
    session.on('status', () => { if (session !== me) return; renderDialog(); syncButton(); if (me.connected) dlg.close(); });
    session.on('full', () => {
      if (session !== me) return;
      end();
      renderDialog();
      dlg.querySelector('.mg-on-error').textContent = t('net.full', { code });
      if (!dlg.open) dlg.showModal();
    });
    const url = new URL(location.href);
    url.searchParams.set('room', code);
    history.replaceState(null, '', url);
    onSession(session);
    renderDialog();
    syncButton();
  }

  function end(silent) {
    if (!session) return;
    session.leave();
    session = null;
    sessionStorage.removeItem(storeKey(slug));
    const url = new URL(location.href);
    url.searchParams.delete('room');
    history.replaceState(null, '', url);
    syncButton();
    if (!silent && onEnd) onEnd();
  }

  function syncButton() {
    button.classList.toggle('online-on', !!session);
    button.dataset.status = session ? session.status : '';
    (button.querySelector('.lbl') || button).textContent = session ? t(session.connected ? 'net.btn.on' : 'net.btn.wait') : t('net.btn');
  }

  function renderDialog() {
    const body = dlg.querySelector('.mg-on-body');
    dlg.querySelector('.mg-on-error').textContent = '';
    if (!session) {
      body.innerHTML = `
        <p data-i18n="net.intro"></p>
        <button class="btn primary" data-act="host" data-i18n="net.create"></button>
        <div class="mg-on-or" data-i18n="net.or"></div>
        <form class="mg-on-join">
          <input type="text" name="code" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" data-i18n-placeholder="net.code.ph">
          <button class="btn" data-i18n="net.join"></button>
        </form>`;
    } else if (!session.connected) {
      const qr = qrcode(0, 'M');
      qr.addData(session.link());
      qr.make();
      body.innerHTML = `
        <p data-i18n="${session.host ? 'net.share' : 'net.joining'}"></p>
        ${session.host ? `<div class="mg-on-qr">${qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>` : ''}
        <div class="mg-on-code">${session.code}</div>
        ${session.host ? `<button class="btn" data-act="copy" data-i18n="net.copy"></button>` : ''}
        <p class="mg-on-status hand"><span class="mg-on-spin"></span> <span data-i18n="${session.status === 'lost' ? 'net.lost' : 'net.waiting'}"></span></p>
        ${Date.now() - session.startedAt > 20000 ? '<p class="mg-on-hint" data-i18n="net.slow"></p>' : ''}
        <button class="btn" data-act="leave" data-i18n="net.leave"></button>`;
    } else {
      body.innerHTML = `
        <p class="hand mg-on-ok" data-i18n="net.connected"></p>
        <div class="mg-on-code">${session.code}</div>
        <button class="btn" data-act="leave" data-i18n="net.leave"></button>`;
    }
    applyI18n(dlg);
  }

  dlg.addEventListener('click', async (e) => {
    if (e.target === dlg) return dlg.close();
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'host') start(newCode(), true);
    if (act === 'leave') { end(); renderDialog(); }
    if (act === 'close') dlg.close();
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(session.link()); e.target.textContent = t('net.copied'); }
      catch { prompt(t('net.copy'), session.link()); }
    }
  });
  dlg.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = cleanCode(new FormData(e.target).get('code'));
    if (code.length === 5) start(code, false);
    else dlg.querySelector('.mg-on-error').textContent = t('net.badcode');
  });

  button.addEventListener('click', () => {
    renderDialog();
    if (!onlineSupported()) dlg.querySelector('.mg-on-error').textContent = t('net.insecure');
    dlg.showModal();
  });
  // While waiting, re-render occasionally so the "taking too long" hint can appear.
  setInterval(() => { if (dlg.open && session && !session.connected) { const err = dlg.querySelector('.mg-on-error').textContent; renderDialog(); dlg.querySelector('.mg-on-error').textContent = err; } }, 5000);
  document.addEventListener('mg:lang', () => { syncButton(); if (dlg.open) renderDialog(); });

  // Resume after reload, or join from a shared link (?room=CODE).
  const fromUrl = cleanCode(new URLSearchParams(location.search).get('room'));
  const saved = JSON.parse(sessionStorage.getItem(storeKey(slug)) || 'null');
  if (saved && (!fromUrl || fromUrl === saved.code)) start(saved.code, saved.host);
  else if (fromUrl.length === 5) start(fromUrl, false);
  if ((session && !session.connected) || (fromUrl && !session)) {
    if (!session) renderDialog();
    if (!onlineSupported()) dlg.querySelector('.mg-on-error').textContent = t('net.insecure');
    dlg.showModal();
  }
  syncButton();

  return { get session() { return session; }, end };
}

function injectDialog() {
  if (document.getElementById('mg-online')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="mg-online" class="mg-dialog">
      <button class="mg-dialog-x" data-act="close" aria-label="close">×</button>
      <h3 data-i18n="net.title"></h3>
      <div class="mg-on-body"></div>
      <p class="mg-on-error"></p>
    </dialog>`);
}

addStrings('ru', {
  'net.btn': 'по сети',
  'net.btn.wait': 'ждём…',
  'net.btn.on': 'онлайн',
  'net.title': 'Играть на двух устройствах',
  'net.intro': 'Каждый играет со своего телефона или компьютера. Создайте комнату и покажите код второму игроку.',
  'net.create': 'создать комнату',
  'net.or': '— или —',
  'net.code.ph': 'код',
  'net.join': 'войти',
  'net.share': 'Пусть второй игрок отсканирует код или откроет ссылку:',
  'net.joining': 'Подключаемся к комнате',
  'net.copy': 'скопировать ссылку',
  'net.copied': 'скопировано ✓',
  'net.waiting': 'ждём второго игрока…',
  'net.lost': 'соперник отключился, ждём…',
  'net.connected': 'Соединились! Играем.',
  'net.leave': 'выйти из комнаты',
  'net.full': 'В комнате {code} уже играют двое. Создайте свою комнату или введите другой код.',
  'net.badcode': 'Код — 5 букв и цифр.',
  'net.you': 'вы',
  'net.insecure': 'Игра по сети работает только по https:// — откройте сайт по защищённому адресу.',
  'net.slow': 'Долго? Проверьте, что у обоих есть интернет и код совпадает. Иногда мобильный интернет не пропускает прямое соединение — попробуйте общий Wi-Fi.',
});
addStrings('en', {
  'net.btn': 'online',
  'net.btn.wait': 'waiting…',
  'net.btn.on': 'connected',
  'net.title': 'Play on two devices',
  'net.intro': 'Each player uses their own phone or computer. Create a room and show the code to the other player.',
  'net.create': 'create a room',
  'net.or': '— or —',
  'net.code.ph': 'code',
  'net.join': 'join',
  'net.share': 'Have the other player scan the code or open the link:',
  'net.joining': 'Joining room',
  'net.copy': 'copy link',
  'net.copied': 'copied ✓',
  'net.waiting': 'waiting for the other player…',
  'net.lost': 'opponent disconnected, waiting…',
  'net.connected': 'Connected! Let’s play.',
  'net.leave': 'leave room',
  'net.full': 'Room {code} already has two players. Create your own room or enter another code.',
  'net.badcode': 'The code is 5 letters/digits.',
  'net.you': 'you',
  'net.insecure': 'Online play needs https:// — open the site via a secure address.',
  'net.slow': 'Taking long? Check that both devices are online and the code matches. Some mobile networks block direct connections — try shared Wi-Fi.',
});
