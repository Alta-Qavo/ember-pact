// Ember Pact card catalogue: every card the duel can deal, and the deck builder.
// Elements form a ring: Ember burns Thorn, Thorn drinks Tide, Tide douses Ember.
// A card that beats the other element gains +3 power in the clash.

export const ELEMENTS = {
  ember: { name: 'Ember', glyph: '🔥', beats: 'thorn', color: '#e74c3c' },
  tide: { name: 'Tide', glyph: '💧', beats: 'ember', color: '#2e86c1' },
  thorn: { name: 'Thorn', glyph: '🌿', beats: 'tide', color: '#1e8449' },
};

export const PACT_CARDS = [
  { id: 'mend', kind: 'pact', name: 'Mend Pact', power: 2, element: null, text: 'Heal 6 HP.' },
  { id: 'ward', kind: 'pact', name: 'Ward Pact', power: 3, element: null, text: 'Block next damage.' },
  { id: 'surge', kind: 'pact', name: 'Surge Pact', power: 4, element: null, text: 'Double your power.' },
  { id: 'snatch', kind: 'pact', name: 'Snatch Pact', power: 5, element: null, text: 'Win: draw 2 cards.' },
];

const ELEMENT_CARDS = [
  { name: 'Spark Imp', power: 2 }, { name: 'Cinder Fox', power: 3 },
  { name: 'Flame Drake', power: 5 }, { name: 'Ash Phoenix', power: 7 },
  { name: 'Ember Knight', power: 6 }, { name: 'Coal Sprite', power: 4 },
  { name: 'Tide Otter', power: 2 }, { name: 'Rain Heron', power: 3 },
  { name: 'Wave Serpent', power: 5 }, { name: 'Storm Whale', power: 8 },
  { name: 'Mist Kelpie', power: 6 }, { name: 'Pearl Crab', power: 4 },
  { name: 'Thorn Hare', power: 2 }, { name: 'Bramble Cat', power: 3 },
  { name: 'Vine Wolf', power: 5 }, { name: 'Oak Ancient', power: 8 },
  { name: 'Moss Badger', power: 6 }, { name: 'Seedling', power: 4 },
];

export function elementOf(card) {
  return card.element ? ELEMENTS[card.element] : null;
}

export function elementAdvantage(attacker, defender) {
  if (!attacker.element || !defender.element) return 0;
  if (ELEMENTS[attacker.element].beats === defender.element) return 3;
  if (ELEMENTS[defender.element].beats === attacker.element) return -3;
  return 0;
}

/** Small seeded RNG so screenshot scenes and replays are deterministic. */
export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

/** Build one 30-card deck: 18 element cards plus 12 pact cards, shuffled. */
export function buildDeck(rng) {
  const deck = [];
  let serial = 0;
  for (const base of ELEMENT_CARDS) {
    const element = ['Spark Imp', 'Cinder Fox', 'Flame Drake', 'Ash Phoenix', 'Ember Knight', 'Coal Sprite'].includes(base.name)
      ? 'ember'
      : (['Tide Otter', 'Rain Heron', 'Wave Serpent', 'Storm Whale', 'Mist Kelpie', 'Pearl Crab'].includes(base.name) ? 'tide' : 'thorn');
    deck.push({ uid: `c${serial++}`, kind: 'element', name: base.name, power: base.power, element, text: `Beats ${ELEMENTS[ELEMENTS[element].beats].name}.` });
  }
  for (let round = 0; round < 3; round += 1) {
    for (const pact of PACT_CARDS) {
      deck.push({ uid: `c${serial++}`, kind: 'pact', id: pact.id, name: pact.name, power: pact.power, element: null, text: pact.text });
    }
  }
  return shuffle(deck, rng);
}

export function describeCard(card) {
  if (card.kind === 'pact') return `${card.name} (Pact, power ${card.power})`;
  return `${card.name} (${ELEMENTS[card.element].name} ${card.power})`;
}
