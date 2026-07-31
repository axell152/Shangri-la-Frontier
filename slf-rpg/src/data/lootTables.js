import { RARITY_ORDER } from './rarity.js';

// Poids par palier de rareté (7 valeurs, dans l'ordre de RARITY_ORDER),
// différents selon la force de l'ennemi tué. Plus l'ennemi est costaud,
// plus la masse de probabilité se déplace vers les raretés hautes — sans
// jamais garantir le haut du panier, même pour le boss.
const TIER_WEIGHTS = {
  low: [55, 30, 12, 2.5, 0.5, 0, 0],
  mid: [35, 32, 20, 10, 2.5, 0.4, 0.05],
  high: [15, 25, 28, 22, 8, 1.8, 0.2],
  boss: [0, 8, 22, 30, 28, 10, 2]
};

const DROP_CHANCE_BY_TIER = { low: 0.45, mid: 0.6, high: 0.85, boss: 1.0 };

function weightedPickTier(weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    if (roll < weights[i]) return RARITY_ORDER[i];
    roll -= weights[i];
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1];
}

// Renvoie une clé de rareté (ex: 'RARE') ou null si rien ne drop cette fois.
export function rollLootTier(lootTier) {
  const dropChance = DROP_CHANCE_BY_TIER[lootTier] ?? 0.4;
  if (Math.random() > dropChance) return null;
  return weightedPickTier(TIER_WEIGHTS[lootTier] || TIER_WEIGHTS.low);
}
