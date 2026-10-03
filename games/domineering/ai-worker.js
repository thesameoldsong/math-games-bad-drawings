// Runs the computer's search off the main thread so the page stays responsive.
import { DOM } from './engine.js';

onmessage = (e) => {
  const { id, st, level } = e.data;
  postMessage({ id, move: DOM.aiMove(st, level) });
};
