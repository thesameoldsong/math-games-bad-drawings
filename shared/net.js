// Multi-device play over WebRTC (Trystero, Nostr relays for signaling — no server of our own).
//
// Host creates a room → shares link/QR/code → guests join. Host is seat 0; guests get seats 1..maxPlayers-1
// (a guest who reloads gets the same seat back). Star topology: guests only talk to the host.
// Games exchange their own messages via session.send(type, payload, {to}) / session.on(type, (payload, {seat}) => …).
// Convention: host is authoritative — on 'peer-join' the host sends the (per-seat redacted) game state.
//
//   import { mountOnline } from '../../shared/net.js';
//   mountOnline({ slug: 'pig', button: el, maxPlayers: () => cfg.players, onSession(session) { ... } });
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

// Low-level session.
// Events: 'status' (waiting|connected|lost), 'peer-join' {seat}, 'peer-leave' {seat}, 'roster', 'full',
// plus game message types: handler(payload, {seat}) where seat is the sender (guests only ever hear the host: seat 0).
// Handshake: guest → '_hello' {clientId}; host → '_welcome' {seat, maxPlayers} or '_full' (no free seat).
export function createSession({ slug, code, host, maxPlayers = 2 }) {
  const room = joinRoom({ appId: APP_ID }, `${slug}:${code}`);
  const action = room.makeAction('msg');
  const handlers = {};
  let status = 'waiting', seat = host ? 0 : 1, hostPeer = null;
  const guests = new Map(); // host side: seat → { peerId, clientId, connected }

  const emit = (type, payload, meta) => (handlers[type] || []).forEach((fn) => fn(payload, meta));
  const setStatus = (st) => { if (st !== status) { status = st; emit('status', st); } };
  const sys = (type, target, payload) => action.send({ type, payload }, { target });
  const seatOfPeer = (id) => { for (const [k, g] of guests) if (g.connected && g.peerId === id) return k; return -1; };
  const hostStatus = () => setStatus([...guests.values()].some((g) => g.connected) ? 'connected' : guests.size ? 'lost' : 'waiting');

  room.onPeerJoin = (id) => { if (!host) sys('_hello', id, { clientId }); };
  room.onPeerLeave = (id) => {
    if (host) {
      const k = seatOfPeer(id);
      if (k < 0) return;
      guests.get(k).connected = false; // seat stays reserved for this clientId
      hostStatus();
      emit('peer-leave', { seat: k });
      emit('roster');
    } else if (id === hostPeer) {
      hostPeer = null;
      setStatus('lost');
      emit('peer-leave', { seat: 0 });
    }
  };
  action.onMessage = (msg, { peerId }) => {
    switch (msg.type) {
      case '_hello': {
        if (!host) return; // guests ignore each other
        const cid = msg.payload?.clientId;
        let k = [...guests].find(([, g]) => g.clientId === cid)?.[0];
        if (k === undefined) {
          for (let i = 1; i < maxPlayers; i++) if (!guests.has(i)) { k = i; break; }
          // a seat whose owner left can go to someone new once every seat is taken
          if (k === undefined) k = [...guests].find(([, g]) => !g.connected)?.[0];
        }
        if (k === undefined) return sys('_full', peerId);
        guests.set(k, { peerId, clientId: cid, connected: true });
        sys('_welcome', peerId, { seat: k, maxPlayers });
        hostStatus();
        emit('peer-join', { seat: k });
        emit('roster');
        return;
      }
      case '_welcome':
        if (host || hostPeer) return;
        hostPeer = peerId;
        seat = msg.payload?.seat ?? 1;
        maxPlayers = msg.payload?.maxPlayers ?? maxPlayers;
        setStatus('connected');
        emit('peer-join', { seat: 0 });
        return;
      case '_full': if (!host && !hostPeer) { status = 'full'; emit('full'); } return;
      default:
        if (host) { const k = seatOfPeer(peerId); if (k > 0) emit(msg.type, msg.payload, { seat: k }); }
        else if (peerId === hostPeer) emit(msg.type, msg.payload, { seat: 0 });
    }
  };

  return {
    slug, code, host,
    get seat() { return seat; },
    get maxPlayers() { return maxPlayers; },
    get status() { return status; },
    get connected() { return status === 'connected'; },
    // Seats with a live device (host included). For the host: who is actually at the table.
    seats() {
      if (!host) return hostPeer ? [0, seat] : [seat];
      return [0, ...[...guests].filter(([, g]) => g.connected).map(([k]) => k)].sort((x, y) => x - y);
    },
    // Host only: change how many seats the room offers (e.g. the game's player-count setting).
    setMaxPlayers(n) { if (host) { maxPlayers = n; emit('roster'); } },
    link: () => `${location.origin}${location.pathname}?room=${code}`,
    // Host: broadcast to every guest, or {to: seat}. Guest: always to the host.
    send(type, payload, { to } = {}) {
      if (!host) { if (hostPeer) action.send({ type, payload }, { target: hostPeer }); return; }
      const targets = [...guests].filter(([k, g]) => g.connected && (to === undefined || k === to)).map(([, g]) => g.peerId);
      if (targets.length) action.send({ type, payload }, { target: targets });
    },
    on(type, fn) { (handlers[type] ||= []).push(fn); return this; },
    async leave() { await room.leave(); },
  };
}

// ---------- UI: button + dialog ----------
const storeKey = (slug) => `mg-net-${slug}`;
// Trystero needs WebCrypto, which browsers only expose on https:// (or localhost).
export const onlineSupported = () => window.isSecureContext && !!globalThis.crypto?.subtle && 'RTCPeerConnection' in window;

// maxPlayers: number or () => number (read when a room is created; default 2).
export function mountOnline({ slug, button, onSession, onEnd, maxPlayers = 2 }) {
  const seatsWanted = () => (typeof maxPlayers === 'function' ? maxPlayers() : maxPlayers);
  const multi = () => (session ? session.maxPlayers : seatsWanted()) > 2;
  injectDialog();
  const dlg = document.getElementById('mg-online');
  let session = null;

  const remember = (s) => sessionStorage.setItem(storeKey(slug), JSON.stringify({ code: s.code, host: s.host }));

  function start(code, host) {
    end(true);
    if (!onlineSupported()) { renderDialog(); dlg.querySelector('.mg-on-error').textContent = t('net.insecure'); return; }
    session = createSession({ slug, code, host, maxPlayers: seatsWanted() });
    session.startedAt = Date.now();
    remember(session);
    const me = session; // ignore late events from a session we already left
    // With more than two seats the host keeps the dialog open to watch the table fill up.
    session.on('status', () => { if (session !== me) return; renderDialog(); syncButton(); if (me.connected && !(me.host && multi())) dlg.close(); });
    session.on('roster', () => { if (session === me && dlg.open) renderDialog(); });
    session.on('full', () => {
      if (session !== me) return;
      end();
      renderDialog();
      dlg.querySelector('.mg-on-error').textContent = t(multi() ? 'net.full.n' : 'net.full', { code });
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
    } else if (session.host && multi()) {
      body.innerHTML = `
        <p data-i18n="net.share.n"></p>
        <div class="mg-on-qr">${qrSvg(session.link())}</div>
        <div class="mg-on-code">${session.code}</div>
        <button class="btn" data-act="copy" data-i18n="net.copy"></button>
        <ul class="mg-on-roster">${Array.from({ length: session.maxPlayers }, (_, k) => {
          const on = session.seats().includes(k);
          return `<li class="${on ? 'on' : ''}"><span class="seat">${k + 1}</span> ${t(k === 0 ? 'net.seat.you' : on ? 'net.seat.on' : 'net.seat.free')}</li>`;
        }).join('')}</ul>
        <p class="mg-on-hint" data-i18n="net.free.hint"></p>
        <div class="actions"><button class="btn primary" data-act="close" data-i18n="net.play"></button>
        <button class="btn" data-act="leave" data-i18n="net.leave"></button></div>`;
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

function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
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
  'net.title': 'Играть на разных устройствах',
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
  'net.share.n': 'Остальные игроки сканируют код или открывают ссылку. Можно начинать в любой момент.',
  'net.seat.you': 'вы (создатель)',
  'net.seat.on': 'подключился',
  'net.seat.free': 'свободно',
  'net.free.hint': 'За свободные места играет компьютер (если в этой игре он есть).',
  'net.play': 'играем!',
  'net.full.n': 'В комнате {code} нет свободных мест. Создайте свою комнату или введите другой код.',
  'net.insecure': 'Игра по сети работает только по https:// — откройте сайт по защищённому адресу.',
  'net.slow': 'Долго? Проверьте, что у обоих есть интернет и код совпадает. Иногда мобильный интернет не пропускает прямое соединение — попробуйте общий Wi-Fi.',
});
addStrings('en', {
  'net.btn': 'online',
  'net.btn.wait': 'waiting…',
  'net.btn.on': 'connected',
  'net.title': 'Play on several devices',
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
  'net.share.n': 'Other players scan the code or open the link. You can start any time.',
  'net.seat.you': 'you (host)',
  'net.seat.on': 'joined',
  'net.seat.free': 'free',
  'net.free.hint': 'Free seats are played by the computer (if this game has one).',
  'net.play': 'let’s play!',
  'net.full.n': 'Room {code} has no free seats. Create your own room or enter another code.',
  'net.insecure': 'Online play needs https:// — open the site via a secure address.',
  'net.slow': 'Taking long? Check that both devices are online and the code matches. Some mobile networks block direct connections — try shared Wi-Fi.',
});
