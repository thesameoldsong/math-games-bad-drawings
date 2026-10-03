// Minimal i18n: t(key, vars), data-i18n / data-i18n-html attributes, RU/EN toggle.
const dict = { ru: {}, en: {} };
let lang = localStorage.getItem('mg-lang') || ((navigator.language || '').startsWith('ru') ? 'ru' : 'en');

export const getLang = () => lang;
export const addStrings = (l, obj) => Object.assign(dict[l], obj);

// Array values pick a random variant (handy for speech bubbles).
export function t(key, vars) {
  let s = dict[lang][key] ?? dict.en[key] ?? key;
  if (Array.isArray(s)) s = s[Math.floor(Math.random() * s.length)];
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => vars[v]);
  return s;
}

// ru: [one, few, many]; en: [one, other]
export function plural(n, key) {
  const forms = dict[lang][key] ?? dict.en[key];
  if (lang !== 'ru') return `${n} ${n === 1 ? forms[0] : forms[1]}`;
  const m10 = n % 10, m100 = n % 100;
  const i = m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2;
  return `${n} ${forms[i]}`;
}

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  document.querySelectorAll('.lang-toggle button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
}

// Fires 'mg:lang' on document so pages can re-render dynamic text.
export function setLang(l) {
  lang = l;
  localStorage.setItem('mg-lang', l);
  applyI18n();
  document.dispatchEvent(new CustomEvent('mg:lang'));
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('.lang-toggle button');
  if (b) setLang(b.dataset.lang);
});

addStrings('ru', {
  'site.title': 'Математические игры с плохими рисунками',
  'site.subtitle': 'Интерактивный компаньон к книге Бена Орлина',
  'site.home': '← Все игры',
  'site.credit':
    'Игры — из книги Бена Орлина <i>«Math Games with Bad Drawings»</i> (2022): 75¼ игр, рисунки автора и рассказ о том, почему это всё важно. Это фанатский интерактив, он не заменяет книгу — <a href="https://mathwithbaddrawings.com/" target="_blank" rel="noopener">загляните к автору</a>.',
  'site.soon': 'скоро',
  'site.players': ['игрок', 'игрока', 'игроков'],
  'ui.how': 'правила',
  'ui.tips': 'хитрости',
  'ui.origin': 'история',
  'ui.settings': 'опции',
  'ui.settings.title': 'Настройки',
  'ui.undo': 'отмена',
  'ui.restart': 'заново',
  'ui.close': 'понятно!',
});
addStrings('en', {
  'site.title': 'Math Games with Bad Drawings',
  'site.subtitle': 'An interactive companion to the book by Ben Orlin',
  'site.home': '← All games',
  'site.credit':
    'Games come from Ben Orlin’s book <i>Math Games with Bad Drawings</i> (2022): 75¼ games, the author’s own drawings, and why it all matters. This is a fan-made companion, not a substitute — <a href="https://mathwithbaddrawings.com/" target="_blank" rel="noopener">visit the author</a>.',
  'site.soon': 'soon',
  'site.players': ['player', 'players'],
  'ui.how': 'rules',
  'ui.tips': 'tricks',
  'ui.origin': 'history',
  'ui.settings': 'settings',
  'ui.settings.title': 'Settings',
  'ui.undo': 'undo',
  'ui.restart': 'restart',
  'ui.close': 'got it!',
});
