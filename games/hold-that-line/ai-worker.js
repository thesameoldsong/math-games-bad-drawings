// Runs the computer's search off the main thread so the page stays responsive.
import { HTL } from './engine.js';

onmessage = (e) => {
  const { id, st, level } = e.data;
  postMessage({ id, move: HTL.aiMove(st, level) });
};
