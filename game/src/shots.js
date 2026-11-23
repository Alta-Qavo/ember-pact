// Screenshot scenes behind ?shot=start|play|win|loss. Each scene plays the real
// rules forward from a fresh game with a fixed seed, steered by an autopilot,
// so the frame is what a short game really looks like and the same seed always
// gives the same frame. The win scene's pilot plays your best answer to Mira's
// card; the loss scene's pilot plays your weakest card, as a hurried player is.

import { elementAdvantage } from './cards.js';
import { chooseCard } from './ai.js';
import { clashLines, playRound } from './engine.js';

const PLAY_ROUNDS = 7;
const MAX_ROUNDS = 60;

function bestAnswer(hand, foeCard) {
  let best = hand[0];
  let bestScore = -Infinity;
  for (const card of hand) {
    const score = card.power + elementAdvantage(card, foeCard) + (card.kind === 'pact' ? 1 : 0);
    if (score > bestScore) { bestScore = score; best = card; }
  }
  return best;
}

function weakest(hand) {
  return hand.slice().sort((a, b) => a.power - b.power)[0];
}

function strongest(hand) {
  return hand.slice().sort((a, b) => b.power - a.power)[0];
}

function runRound(state, youCard, foeCard, ui) {
  const report = playRound(state, youCard, foeCard);
  report.lines = clashLines(report);
  ui.logLine = report.lines[0];
  ui.lastReport = report;
  return report;
}

/**
 * Set `state` to the named scene and fill `ui` for the renderer.
 * Returns 'title' | 'play' | 'win' | 'loss'.
 */
export function stageShot(name, state, ui) {
  const rng = state.rng;
  if (name === 'play') {
    for (let i = 0; i < PLAY_ROUNDS; i += 1) {
      if (!state.you.hand.length || !state.foe.hand.length) break;
      const foeCard = chooseCard(state, rng);
      const youCard = bestAnswer(state.you.hand, foeCard);
      runRound(state, youCard, foeCard, ui);
      if (state.winner) break;
    }
    ui.tell = 'Mira taps a rain rhythm…';
    ui.clashDetail = `${ui.lastReport.youPower} vs ${ui.lastReport.foePower} — You take the round!`;
    return 'play';
  }
  if (name === 'win') {
    let report = null;
    for (let i = 0; i < MAX_ROUNDS && !state.winner; i += 1) {
      if (!state.you.hand.length || !state.foe.hand.length) break;
      const foeCard = chooseCard(state, rng);
      const youCard = bestAnswer(state.you.hand, foeCard);
      report = runRound(state, youCard, foeCard, ui);
    }
    ui.tell = '';
    ui.clashDetail = report ? `${report.youPower} vs ${report.foePower} — You take the round!` : '';
    return 'win';
  }
  if (name === 'loss') {
    let report = null;
    for (let i = 0; i < MAX_ROUNDS && !state.winner; i += 1) {
      if (!state.you.hand.length || !state.foe.hand.length) break;
      const youCard = weakest(state.you.hand);
      const foeCard = bestAnswer(state.foe.hand, youCard);
      report = runRound(state, youCard, foeCard, ui);
    }
    ui.tell = '';
    ui.clashDetail = report ? `${report.youPower} vs ${report.foePower} — Mira takes the round!` : '';
    return 'loss';
  }
  ui.logLine = 'The pact is sealed. Choose your first card.';
  return 'title';
}

export { strongest };
