// Light/dark theme. Classic (non-module) script, loaded in <head> so the page never flashes the wrong theme.
// Default follows the system; the toggle stores an explicit choice in localStorage 'mg-theme'.
(function () {
  var root = document.documentElement;
  var saved = localStorage.getItem('mg-theme');
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

  var system = window.matchMedia('(prefers-color-scheme: dark)');
  function current() { return root.dataset.theme || (system.matches ? 'dark' : 'light'); }

  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M19.6 14.6A7.8 7.8 0 0 1 9.4 4.4a7.8 7.8 0 1 0 10.2 10.2z"/></svg>';

  // The button shows where a click will take you: a sun in dark mode, a moon in light mode.
  function paint() {
    var dark = current() === 'dark';
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.innerHTML = dark ? SUN : MOON;
      b.setAttribute('aria-label', dark ? 'light theme' : 'dark theme');
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.theme-toggle')) return;
    var next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('mg-theme', next);
    paint();
    document.dispatchEvent(new CustomEvent('mg:theme'));
  });
  system.addEventListener('change', function () { paint(); document.dispatchEvent(new CustomEvent('mg:theme')); });
  document.addEventListener('DOMContentLoaded', paint);
})();
