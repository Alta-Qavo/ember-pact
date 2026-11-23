// Ember Pact rules engine: pure state, no DOM. A duel is a series of rounds.
// Each round both sides play one card face up. Power plus the elemental edge
// (+3 when your element beats theirs) decides the clash; the loser takes damage
// equal to the gap, at least 1 when the gap is 0. Win two rounds in a row with
// the same element and the Chain bonus adds +2 next round. First to 0 HP loses;
// an empty deck ends the duel on HP. Pact cards bend the rules: Mend heals,
// Ward blocks the next hit, Surge doubles power, Snatch draws on a win.

import { buildDeck, elementAdvantage, makeRng } from './cards.js';

export const START_HP = 30;
export const HAND_SIZE = 5;

export function newGame(seed = 20261122) {
  const rng = makeRng(seed);
  const deck = buildDeck(rng);
  const state = {
    seed, rng,
    round: 1,
    phase: 'title',
    you: { hp: START_HP, hand: [], wins: 0, ward: false, chainElement: null, chainCount: 0 },
    foe: { hp: START_HP, hand: [], wins: 0, ward: false, chainElement: null, chainCount: 0 },
    deck, discard: [],
    lastYouCard: null, lastFoeCard: null,
    log: [], winner: null, roundsPlayed: 0,
  };
  for (let i = 0; i < HAND_SIZE; i += 1) {
    state.you.hand.push(state.deck.pop());
    state.foe.hand.push(state.deck.pop());
  }
  return state;
}

export function drawCard(state, side) {
  const hand = state[side].hand;
  if (state.deck.length === 0) return null;
  const card = state.deck.pop();
  hand.push(card);
  return card;
}

function applyPactBeforeClash(state, side, card) {
  const fighter = state[side];
  if (card.kind !== 'pact') return { power: card.power, surge: false };
  if (card.id === 'mend') fighter.hp = Math.min(START_HP, fighter.hp + 6);
  if (card.id === 'ward') fighter.ward = true;
  return { power: card.power, surge: card.id === 'surge' };
}

function effectivePower(state, side, card, pact) {
  let power = pact.power;
  if (pact.surge) power *= 2;
  const fighter = state[side];
  if (fighter.chainCount >= 2 && fighter.chainElement === card.element && card.element) power += 2;
  return power;
}

function dealDamage(state, side, amount) {
  const fighter = state[side];
  if (amount <= 0) return 0;
  if (fighter.ward) {
    fighter.ward = false;
    return 0;
  }
  fighter.hp = Math.max(0, fighter.hp - amount);
  return amount;
}

/** Resolve one round. Both cards must be in their owner's hand. Returns a report. */
export function playRound(state, youCard, foeCard) {
  const youPact = applyPactBeforeClash(state, 'you', youCard);
  const foePact = applyPactBeforeClash(state, 'foe', foeCard);
  let youPower = effectivePower(state, 'you', youCard, youPact);
  let foePower = effectivePower(state, 'foe', foeCard, foePact);
  youPower += elementAdvantage(youCard, foeCard);
  foePower += elementAdvantage(foeCard, youCard);

  const report = {
    youCard, foeCard, youPower, foePower,
    youDamage: 0, foeDamage: 0, winner: null, lines: [],
  };
  if (youPower > foePower) {
    report.winner = 'you';
    report.foeDamage = dealDamage(state, 'foe', youPower - foePower);
    state.you.wins += 1;
    if (youCard.id === 'snatch') { drawCard(state, 'you'); drawCard(state, 'you'); }
  } else if (foePower > youPower) {
    report.winner = 'foe';
    report.youDamage = dealDamage(state, 'you', foePower - youPower);
    state.foe.wins += 1;
    if (foeCard.id === 'snatch') { drawCard(state, 'foe'); drawCard(state, 'foe'); }
  } else {
    report.winner = 'tie';
    report.youDamage = dealDamage(state, 'you', 1);
    report.foeDamage = dealDamage(state, 'foe', 1);
  }

  // Chain tracking: same element as the previous round's win keeps the chain.
  for (const side of ['you', 'foe']) {
    const card = side === 'you' ? youCard : foeCard;
    const fighter = state[side];
    if (report.winner === side && card.element) {
      fighter.chainCount = fighter.chainElement === card.element ? fighter.chainCount + 1 : 1;
      fighter.chainElement = card.element;
    } else {
      fighter.chainCount = 0;
      fighter.chainElement = null;
    }
  }

  state.lastYouCard = youCard;
  state.lastFoeCard = foeCard;
  state.discard.push(youCard, foeCard);
  state.you.hand = state.you.hand.filter((c) => c.uid !== youCard.uid);
  state.foe.hand = state.foe.hand.filter((c) => c.uid !== foeCard.uid);
  drawCard(state, 'you');
  drawCard(state, 'foe');
  state.roundsPlayed += 1;
  state.round += 1;

  if (state.you.hp <= 0 && state.foe.hp <= 0) state.winner = state.you.hp === state.foe.hp ? 'tie' : (state.you.wins >= state.foe.wins ? 'you' : 'foe');
  else if (state.foe.hp <= 0) state.winner = 'you';
  else if (state.you.hp <= 0) state.winner = 'foe';
  else if (state.deck.length === 0 && (state.you.hand.length === 0 || state.foe.hand.length === 0)) {
    state.winner = state.you.hp > state.foe.hp ? 'you' : state.foe.hp > state.you.hp ? 'foe' : 'tie';
  }
  if (state.winner) state.phase = 'over';
  return report;
}

export function clashLines(report) {
  const lines = [];
  if (report.youPower > report.foePower) {
    lines.push(report.foeDamage === 0
      ? `Your ${report.youCard.name} (${report.youPower}) beats Mira's ${report.foeCard.name} (${report.foePower}) — but her Ward blocks it all!`
      : `Your ${report.youCard.name} (${report.youPower}) overpowers Mira's ${report.foeCard.name} (${report.foePower}) — Mira takes ${report.foeDamage}.`);
  } else if (report.foePower > report.youPower) {
    lines.push(report.youDamage === 0
      ? `Mira's ${report.foeCard.name} (${report.foePower}) beats your ${report.youCard.name} (${report.youPower}) — but your Ward blocks it all!`
      : `Mira's ${report.foeCard.name} (${report.foePower}) overpowers your ${report.youCard.name} (${report.youPower}) — you take ${report.youDamage}.`);
  } else {
    lines.push(`A dead heat at ${report.youPower} — both sides take 1.`);
  }
  return lines;
}
