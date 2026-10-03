// Runs the computer's thinking off the main thread (the exact solver can take a moment on big purses).
import { PW } from './engine.js';

onmessage = (e) => {
  const { id, st, level } = e.data;
  const move = PW.aiMove(st, level);
  // After a hard move, tell the page whether the computer now knows it has a forced win (for a smug remark).
  let sure = false;
  if (level === 'hard' && move && PW.aliveCount(st) === 2) {
    const c = PW.clone(st);
    PW.apply(c, move);
    sure = !PW.isOver(c) && PW.solve(c) === false;
  }
  postMessage({ id, move, sure });
};
