// Ember Pact boot and input: title screen, card selection, the reveal beat,
// and the win/loss overlays. Keyboard: 1-5 select, Enter plays, M mutes,
// R restarts, H shows the rules. ?shot=start|play|win|loss stages a scene
// for screenshots instead of starting an interactive game.

import { chooseCard, shownTell } from './ai.js';
import { playCard, playDefeat, playLoseRound, playSelect, playVictory, playWinRound, setMuted, isMuted } from './audio.js';
import { newGame, playRound, clashLines } from './engine.js';
import { clearPlayed, hideOverlay, renderAll, showOverlay, showPlayed } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '20261122');

const state = newGame(seed);
const ui = {
  selectedUid: null, tell: '', logLine: 'The pact is sealed. Choose your first card.',
  clashDetail: 'Pick a card to duel', chainLabel: '', lastReport: null,
  onSelect: (card) => selectCard(card),
};
let busy = false;
let selectedCard = null;

function refresh() { renderAll(state, ui); }

function selectCard(card) {
  if (busy || state.phase !== 'play' || state.winner) return;
  selectedCard = card;
  ui.selectedUid = card.uid;
  playSelect();
  ui.clashDetail = `Selected: ${card.name} — press Enter to play`;
  refresh();
}

function playSelected() {
  if (busy || state.phase !== 'play' || !selectedCard) return;
  busy = true;
  const youCard = selectedCard;
  selectedCard = null;
  ui.selectedUid = null;
  const foeCard = chooseCard(state, state.rng);
  ui.tell = shownTell(foeCard, state.rng);
  playCard();
  refresh();
  window.setTimeout(() => {
    const report = playRound(state, youCard, foeCard);
    report.lines = clashLines(report);
    ui.logLine = report.lines[0];
    ui.lastReport = report;
    showPlayed(state, report, ui);
    if (report.winner === 'you') playWinRound();
    else if (report.winner === 'foe') playLoseRound();
    window.setTimeout(() => {
      busy = false;
      ui.tell = '';
      if (state.winner) {
        state.phase = 'over';
        if (state.winner === 'you') { playVictory(); showOverlay('win', state); }
        else if (state.winner === 'foe') { playDefeat(); showOverlay('loss', state); }
        else showOverlay('win', state);
      } else {
        clearPlayed();
        ui.clashDetail = 'Pick a card to duel';
        refresh();
      }
    }, 1400);
  }, 650);
}

function restart() {
  const fresh = newGame(seed + state.roundsPlayed + 1);
  Object.assign(state, fresh);
  selectedCard = null;
  busy = false;
  ui.selectedUid = null;
  ui.tell = '';
  ui.logLine = 'A new pact is sealed. Choose your first card.';
  ui.clashDetail = 'Pick a card to duel';
  clearPlayed();
  state.phase = 'play';
  hideOverlay();
  refresh();
}

document.getElementById('overlayBtn').addEventListener('click', () => {
  if (state.phase === 'title') { state.phase = 'play'; hideOverlay(); refresh(); return; }
  if (state.phase === 'over') { restart(); return; }
  hideOverlay();
});
document.getElementById('helpBtn').addEventListener('click', () => showOverlay('rules', state));
document.getElementById('muteBtn').addEventListener('click', (event) => {
  setMuted(!isMuted());
  event.currentTarget.textContent = isMuted() ? '🔇 Muted' : '🔊 Sound';
});
document.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '5') {
    const card = state.you.hand[Number(event.key) - 1];
    if (card) selectCard(card);
  } else if (event.key === 'Enter') {
    if (state.phase === 'title' || state.phase === 'over') { document.getElementById('overlayBtn').click(); }
    else playSelected();
  } else if (event.key === 'm' || event.key === 'M') {
    document.getElementById('muteBtn').click();
  } else if (event.key === 'r' || event.key === 'R') {
    restart();
  } else if (event.key === 'h' || event.key === 'H') {
    showOverlay('rules', state);
  }
});

if (shotName) {
  setMuted(true);
  const scene = stageShot(shotName, state, ui);
  state.phase = scene === 'title' ? 'title' : 'play';
  refresh();
  if (scene === 'play' && ui.lastReport) showPlayed(state, ui.lastReport, ui);
  if (scene === 'win') { if (ui.lastReport) showPlayed(state, ui.lastReport, ui); showOverlay('win', state); }
  if (scene === 'loss') { if (ui.lastReport) showPlayed(state, ui.lastReport, ui); showOverlay('loss', state); }
  if (scene === 'title') showOverlay('title', state);
  document.title = `Ember Pact — ${scene}`;
} else {
  refresh();
  showOverlay('title', state);
}
