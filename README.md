import { RARITY_ORDER } from './weapons.js';

// Each tier gives weights across the rarity ladder. Higher tiers shift
// probability mass toward the rarer end without ever guaranteeing it —
// staying true to the "grind for garbage that occasionally isn't" feel.
const TIER_WEIGHTS = {
  low:  { TROUVAILLE: 55, COMMUNE: 32, RARE: 11, EPIQUE: 2,  LEGENDAIRE: 0,   MYTHIQUE: 0 },
  mid:  { TROUVAILLE: 35, COMMUNE: 35, RARE: 20, EPIQUE: 8,  LEGENDAIRE: 2,   MYTHIQUE: 0 },
  high: { TROUVAILLE: 15, COMMUNE: 25, RARE: 30, EPIQUE: 20, LEGENDAIRE: 8,   MYTHIQUE: 2 },
  boss: { TROUVAILLE: 0,  COMMUNE: 10, RARE: 25, EPIQUE: 30, LEGENDAIRE: 25,  MYTHIQUE: 10 }
};

const DROP_CHANCE_BY_TIER = { low: 0.45, mid: 0.6, high: 0.85, boss: 1.0 };

const WEAPON_TYPE_KEYS = ['epee_rouillee', 'dague_ebrechee', 'lance_bambou', 'hache_bucheron', 'arc_branches'];

function weightedPick(weights) {
  const entries = RARITY_ORDER.map((key) => [key, weights[key] || 0]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    if (roll < w) return key;
    roll -= w;
  }
  return entries[entries.length - 1][0];
}

// Returns { typeKey, rarityKey } or null if nothing dropped this time.
export function rollLoot(lootTier) {
  const dropChance = DROP_CHANCE_BY_TIER[lootTier] ?? 0.4;
  if (Math.random() > dropChance) return null;

  const rarityKey = weightedPick(TIER_WEIGHTS[lootTier] || TIER_WEIGHTS.low);
  if (!rarityKey) return null;

  const typeKey = WEAPON_TYPE_KEYS[Math.floor(Math.random() * WEAPON_TYPE_KEYS.length)];
  return { typeKey, rarityKey };
}
