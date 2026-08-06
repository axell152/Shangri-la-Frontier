import { ENEMY_TYPES } from '../../data/enemies.js';

export const SPAWN_RULES = {
  marsh: [
    { type: 'slime', weight: 0.7 },
    { type: 'gobelin', weight: 0.3 }
  ],
  grass: [
    { type: 'slime', weight: 0.5 },
    { type: 'gobelin', weight: 0.5 }
  ],
  forest: [
    { type: 'gobelin', weight: 0.6 },
    { type: 'golem_debris', weight: 0.4 }
  ],
  rock: [
    { type: 'golem_debris', weight: 0.7 },
    { type: 'gardien_rouille', weight: 0.3 }
  ],
  water: []
};

export function pickEnemyForBiome(biomeKey, rand) {
  const rules = SPAWN_RULES[biomeKey] || SPAWN_RULES.grass;
  if (!rules.length) return null;

  const roll = rand();
  let cumulative = 0;
  for (const rule of rules) {
    cumulative += rule.weight;
    if (roll <= cumulative) return rule.type;
  }

  return rules[rules.length - 1].type;
}

export function getBiomeThreatLevel(biomeKey) {
  switch (biomeKey) {
    case 'rock':
      return 'high';
    case 'forest':
      return 'mid';
    case 'marsh':
      return 'low';
    default:
      return 'mid';
  }
}

export function getBiomeEnemyCount(biomeKey, baseCount) {
  const factor = {
    water: 0,
    marsh: 0.8,
    grass: 1,
    forest: 1.2,
    rock: 1.4
  }[biomeKey] ?? 1;
  return Math.max(0, Math.round(baseCount * factor));
}
