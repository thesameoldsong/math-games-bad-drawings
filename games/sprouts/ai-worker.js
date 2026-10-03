// Runs the computer's thinking off the main thread so drawing animations stay smooth.
import { SPR } from './engine.js';

onmessage = (e) => {
  const { id, type, st, level } = e.data;
  let res = null;
  if (type === 'ai') res = SPR.aiMove(st, level);
  else if (type === 'can') res = SPR.canDraw(st);
  postMessage({ id, res });
};
