// Shared page chrome: hand-drawn icons, toolbar buttons, popup sheets.
//
// Markup: <button class="tool" data-sheet="how">…</button> + <dialog class="mg-dialog" id="sheet-how">…</dialog>
// mountSheets() wires every [data-sheet] button; showOnce('how', slug) opens it on the first visit.

const ICONS = {
  how: '<path d="M8.6 8.6c0-4.4 7.2-4.6 7.2-.3 0 2.7-3.7 3.1-3.8 6.4"/><circle cx="12" cy="18.6" r="1.1" fill="currentColor"/>',
  tips: '<path d="M12 3.2c-3.5 0-6 2.6-6 5.7 0 2.2 1.3 3.5 2.4 4.6.7.7.9 1.4.9 2.3h5.4c0-.9.2-1.6.9-2.3 1.1-1.1 2.4-2.4 2.4-4.6 0-3.1-2.5-5.7-6-5.7z"/><path d="M9.4 18.4h5.2M10.3 21h3.4"/>',
  origin: '<path d="M3.8 5.4c3-1.2 6-1 8.2 1 2.2-2 5.2-2.2 8.2-1v13.2c-3-1.1-6-.9-8.2 1.1-2.2-2-5.2-2.2-8.2-1.1z"/><path d="M12 6.4v13.1"/>',
  settings: '<path d="M4 7h9.5M17.5 7H20M15.5 4.6v4.8M4 17h3.5M11.5 17H20M9.5 14.6v4.8"/>',
  online: '<rect x="2.8" y="5" width="7.4" height="13.5" rx="1.6"/><rect x="13.8" y="5" width="7.4" height="13.5" rx="1.6"/><path d="M5.6 15.8h1.8M16.6 15.8h1.8"/>',
  undo: '<path d="M8.6 6.4 4.2 10.6l4.4 4.2"/><path d="M4.6 10.6h9.6a5 5 0 0 1 0 10h-3"/>',
  hint: '<circle cx="10.4" cy="10.4" r="6.2"/><path d="M15 15l5.2 5.2"/>',
  restart: '<path d="M19.2 12.4a7.2 7.2 0 1 1-2.2-5.4"/><path d="M18.4 3.6v4.2h-4.2"/>',
};

export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

// Fills <button class="tool" data-icon="how" data-label="ui.how"> with icon + label span.
export function mountTools(root = document) {
  root.querySelectorAll('.tool[data-icon]').forEach((b) => {
    if (b.querySelector('.icon')) return;
    b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon));
    if (b.dataset.label) b.insertAdjacentHTML('beforeend', `<span class="lbl" data-i18n="${b.dataset.label}"></span>`);
  });
}

export function openSheet(id) {
  const d = document.getElementById('sheet-' + id);
  if (d && !d.open) d.showModal();
}

export function mountSheets() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sheet]');
    if (b) return openSheet(b.dataset.sheet);
    const d = e.target.closest('dialog.mg-dialog');
    // click on the backdrop (outside the content box) or on a close button
    if (d && (e.target === d || e.target.closest('[data-close]'))) d.close();
  });
  document.querySelectorAll('dialog.mg-dialog').forEach((d) => {
    if (!d.querySelector('.mg-dialog-x')) d.insertAdjacentHTML('afterbegin', '<button class="mg-dialog-x" data-close aria-label="close">×</button>');
  });
}

export function showOnce(id, slug) {
  const k = `mg-seen-${slug}-${id}`;
  if (localStorage.getItem(k)) return;
  localStorage.setItem(k, '1');
  openSheet(id);
}
