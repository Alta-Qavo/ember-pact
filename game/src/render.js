// Ember Pact rendering: turns engine state into DOM, with card slides and HP bars.
// Every card is a real DOM element with a readable power, element and cost text,
// so the game stays legible at thumbnail size in a screenshot.

import { ELEMENTS, describeCard } from './cards.js';

const $ = (id) => document.getElementById(id);

export function cardElement(card, opts = {}) {
  const el = document.createElement('div');
  el.className = `card ${card.kind === 'pact' ? 'el-pact' : `el-${card.element}`}`;
  el.dataset.uid = card.uid;
  const element = card.element ? ELEMENTS[card.element] : null;
  el.innerHTML = `
    <span class="cost">${card.kind === 'pact' ? '✦ PACT' : `⚡ ${card.power}`}</span>
    <span class="power">${card.power}</span>
    <span class="element">${element ? element.glyph : '✦'}</span>
    <span class="elname">${element ? element.name : 'Pact'}</span>
    <span class="cardname">${card.name}</span>
    <span class="cardtext">${card.text}</span>`;
  if (opts.onClick) el.addEventListener('click', () => opts.onClick(card, el));
  if (opts.selected) el.classList.add('selected');
  if (opts.played) el.classList.add('played');
  return el;
}

export function cardBackElement() {
  const el = document.createElement('div');
  el.className = 'card back';
  el.innerHTML = '<span class="back-mark">🔥</span>';
  return el;
}

export function renderAll(state, ui) {
  $('roundLabel').textContent = `Round ${state.round}`;
  $('deckLabel').textContent = `Deck ${state.deck.length}`;
  $('youHpFill').style.width = `${(state.you.hp / 30) * 100}%`;
  $('foeHpFill').style.width = `${(state.foe.hp / 30) * 100}%`;
  $('youHpText').textContent = `${state.you.hp} / 30 HP`;
  $('foeHpText').textContent = `${state.foe.hp} / 30 HP`;
  $('youScore').textContent = `Rounds won: ${state.you.wins}`;
  $('foeScore').textContent = `Rounds won: ${state.foe.wins}`;
  $('youStatus').textContent = state.you.ward ? '🛡️ Ward up — next damage blocked'
    : state.you.chainCount >= 2 ? `⛓ Chain x${state.you.chainCount} ${ELEMENTS[state.you.chainElement].name} — +2 next round` : '';
  $('foeStatus').textContent = state.foe.ward ? '🛡️ Ward up — next damage blocked'
    : state.foe.chainCount >= 2 ? `⛓ Chain x${state.foe.chainCount} ${ELEMENTS[state.foe.chainElement].name} — +2 next round` : '';
  $('foeTell').textContent = ui.tell || '';

  const youHand = $('youHand');
  youHand.innerHTML = '';
  state.you.hand.forEach((card, index) => {
    const el = cardElement(card, {
      selected: ui.selectedUid === card.uid,
      onClick: (c, node) => ui.onSelect(c, node, index),
    });
    el.title = `${describeCard(card)} — press ${index + 1} to select`;
    youHand.appendChild(el);
  });

  const foeHand = $('foeHand');
  foeHand.innerHTML = '';
  state.foe.hand.forEach(() => foeHand.appendChild(cardBackElement()));

  $('log').textContent = ui.logLine || '';
  $('clashDetail').textContent = ui.clashDetail || 'Pick a card to duel';
  $('chainLabel').textContent = ui.chainLabel || '';
  $('status').textContent = ui.logLine || '';
}

export function showPlayed(state, report, ui) {
  const foeSlot = $('playedFoe');
  const youSlot = $('playedYou');
  foeSlot.innerHTML = '';
  youSlot.innerHTML = '';
  foeSlot.appendChild(cardElement(report.foeCard, { played: true }));
  youSlot.appendChild(cardElement(report.youCard, { played: true }));
  const winnerEl = report.winner === 'you' ? youSlot.firstChild : report.winner === 'foe' ? foeSlot.firstChild : null;
  if (winnerEl) winnerEl.classList.add('winner-glow');
  $('clashDetail').textContent = `${report.youPower} vs ${report.foePower} — ${report.winner === 'you' ? 'You take the round!' : report.winner === 'foe' ? 'Mira takes the round!' : 'Dead heat!'}`;
  ui.logLine = report.lines ? report.lines[0] : '';
  renderAll(state, ui);
}

export function clearPlayed() {
  $('playedFoe').innerHTML = '<span class="slot-hint">Mira plays here</span>';
  $('playedYou').innerHTML = '<span class="slot-hint">You play here</span>';
}

export function showOverlay(kind, state) {
  const overlay = $('overlay');
  const btn = $('overlayBtn');
  overlay.classList.remove('hidden');
  if (kind === 'title') {
    $('overlayKicker').textContent = 'A DUEL OF ELEMENTAL CARDS';
    $('overlayTitle').textContent = '🔥 EMBER PACT';
    $('overlayText').textContent = 'Ember burns Thorn. Thorn drinks Tide. Tide douses Ember. Play one card a round against Mira, the Ember Witch — higher power wins the round, the loser takes the damage. Chain the same element twice for +2, and spend Pact cards to heal, ward, surge or snatch.';
    $('overlayStats').innerHTML = '30 HP each &nbsp;•&nbsp; 5-card hands &nbsp;•&nbsp; First to 0 HP loses<br>Click a card or press 1–5, then Enter to play it.';
    btn.textContent = '▶ Start the duel';
  } else if (kind === 'rules') {
    $('overlayKicker').textContent = 'HOW TO PLAY';
    $('overlayTitle').textContent = 'THE PACT';
    $('overlayText').textContent = 'Each round you and Mira each play one card. Elemental edge is worth +3: Ember beats Thorn, Thorn beats Tide, Tide beats Ember. The higher total wins and the loser takes damage equal to the gap. Pact cards: Mend heals 6, Ward blocks the next hit, Surge doubles your power, Snatch draws 2 cards if you win. Win twice in a row with one element to build a Chain (+2). Watch Mira’s tell — it hints at her card, and it is right about two times in three.';
    $('overlayStats').innerHTML = 'Keyboard: 1–5 select • Enter plays • M mutes • R restarts';
    btn.textContent = 'Got it — back to the table';
  } else if (kind === 'win') {
    $('overlayKicker').textContent = '🏆 VICTORY';
    $('overlayTitle').textContent = 'THE PACT IS YOURS!';
    $('overlayText').textContent = `Mira bows, her embers fading to gold. You won the duel in ${state.roundsPlayed} rounds with ${state.you.hp} HP to spare.`;
    $('overlayStats').innerHTML = `Rounds won: ${state.you.wins} &nbsp;•&nbsp; Mira: ${state.foe.wins}<br>Deck left: ${state.deck.length} cards`;
    btn.textContent = '↻ Duel again';
  } else {
    $('overlayKicker').textContent = '💀 DEFEAT';
    $('overlayTitle').textContent = 'MIRA PREVAILS';
    $('overlayText').textContent = `The witch's embers close over the table. Mira won the duel in ${state.roundsPlayed} rounds — she had ${state.foe.hp} HP left. Study her tells and chain your elements next time.`;
    $('overlayStats').innerHTML = `Rounds won: ${state.you.wins} &nbsp;•&nbsp; Mira: ${state.foe.wins}<br>Deck left: ${state.deck.length} cards`;
    btn.textContent = '↻ Duel again';
  }
}

export function hideOverlay() {
  $('overlay').classList.add('hidden');
}
