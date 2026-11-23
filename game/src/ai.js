// Mira, the Ember Witch: the opponent brain. She reads the table, not your hand.
// She favours the element that beats your last play, saves her pact cards for
// losing positions, and sometimes bluffs — her "tell" hints at her element, and
// the hint is right about two times in three, so a careful player can counter her.

import { ELEMENTS, elementAdvantage } from './cards.js';

const TELLS = {
  ember: ['Mira hums a crackling tune…', 'Mira warms her hands…', 'A spark jumps from Mira’s sleeve…'],
  tide: ['Mira taps a rain rhythm…', 'Mira smells of sea spray…', 'Droplets bead on Mira’s cards…'],
  thorn: ['Mira brushes a leaf from her hair…', 'Mira smells of cut grass…', 'A vine curls around Mira’s wrist…'],
  pact: ['Mira smiles and says nothing…', 'Mira shuffles slowly, watching you…', 'Mira’s eyes flick to her pact cards…'],
};

export function pickTell(card, rng) {
  const key = card.kind === 'pact' ? 'pact' : card.element;
  const lines = TELLS[key] || TELLS.pact;
  return lines[Math.floor(rng() * lines.length)];
}

/** Mira's true tell most of the time; a bluff the rest, pointing at another element. */
export function shownTell(card, rng) {
  if (rng() < 0.67) return pickTell(card, rng);
  const others = Object.keys(ELEMENTS).filter((el) => el !== card.element);
  const bluff = others[Math.floor(rng() * others.length)];
  const lines = TELLS[bluff];
  return lines[Math.floor(rng() * lines.length)];
}

function scoreCard(card, state, rng) {
  const foe = state.foe;
  let score = card.power + rng() * 2;
  // Element edge against what you played last round.
  if (state.lastYouCard && card.element) {
    score += elementAdvantage(card, state.lastYouCard);
  }
  // Pact cards are for trouble: heal when hurt, ward when you are ahead on power.
  if (card.kind === 'pact') {
    if (card.id === 'mend' && foe.hp <= 14) score += 9;
    if (card.id === 'ward' && state.lastYouCard && state.lastYouCard.power >= 6) score += 8;
    if (card.id === 'surge' && card.power >= 4) score += 5;
    if (card.id === 'snatch' && foe.hp > state.you.hp) score += 4;
    if (foe.hp > 22 && card.id === 'mend') score -= 6;
  }
  // She holds her biggest cards when she is comfortably ahead.
  if (card.power >= 8 && foe.hp > state.you.hp + 8) score -= 3;
  return score;
}

/** Choose one card from Mira's hand. Returns the card object. */
export function chooseCard(state, rng) {
  let best = state.foe.hand[0];
  let bestScore = -Infinity;
  for (const card of state.foe.hand) {
    const score = scoreCard(card, state, rng);
    if (score > bestScore) { bestScore = score; best = card; }
  }
  return best;
}
