import { WEAPON_CATEGORIES } from './weaponCategories.js';
import { WEAPON_CATALOG } from './weaponCatalog.js';
import { RARITY_TIERS } from './rarity.js';
import { seededRandom, seedFromString, lerp } from '../utils/rng.js';

let instanceCounter = 0;

// Construit une instance d'arme concrète à partir d'une entrée du catalogue
// (nom + rareté) et de sa catégorie. Les stats sont dérivées du nom via un
// PRNG déterministe : la même arme nommée aura toujours le même "profil"
// de stats, mais différent de toute autre arme de même rareté/catégorie.
export function createWeaponFromEntry(category, entry) {
  const categoryDef = WEAPON_CATEGORIES[category];
  const rarity = RARITY_TIERS[entry.tier];
  if (!categoryDef || !rarity) {
    throw new Error(`Catégorie/rareté invalide : ${category}/${entry.tier}`);
  }

  const rand = seededRandom(entry.name);
  const tierMult = lerp(rarity.statMult[0], rarity.statMult[1], rand());

  const atkJitter = 0.9 + rand() * 0.2;
  const speedJitter = 0.9 + rand() * 0.2;
  const durabilityJitter = 0.85 + rand() * 0.3;
  const critJitter = 0.85 + rand() * 0.3;
  const rangeJitter = 0.95 + rand() * 0.1;

  const atk = Math.max(1, Math.round(categoryDef.baseAtk * tierMult * atkJitter));
  const speedMs = Math.max(140, Math.round((categoryDef.baseSpeedMs / (1 + (tierMult - 1) * 0.12)) * speedJitter));
  const durability = Math.max(3, Math.round(categoryDef.baseDurability * tierMult * durabilityJitter));
  const crit = Math.min(0.85, +(categoryDef.baseCrit * (1 + (tierMult - 1) * 0.4) * critJitter).toFixed(3));
  const range = Math.round(categoryDef.baseRange * (1 + (tierMult - 1) * 0.06) * rangeJitter);

  instanceCounter += 1;

  return {
    id: `${category}_${seedFromString(entry.name)}_${Date.now()}_${instanceCounter}`,
    name: entry.name,
    category,
    kind: categoryDef.kind,
    ranged: categoryDef.ranged,
    tierKey: entry.tier,
    rarityLabel: rarity.label,
    color: rarity.color,
    atk,
    range,
    speedMs,
    crit,
    durability,
    maxDurability: durability,
    visualSeed: seedFromString(entry.name)
  };
}

// Cherche une arme par son nom exact dans tout le catalogue (utile pour
// l'arme de départ, ou du contenu scripté).
export function createWeaponByName(name) {
  for (const [category, entries] of Object.entries(WEAPON_CATALOG)) {
    const entry = entries.find((e) => e.name === name);
    if (entry) return createWeaponFromEntry(category, entry);
  }
  throw new Error(`Arme introuvable dans le catalogue : ${name}`);
}

// Toutes les entrées du catalogue pour une rareté donnée, toutes catégories
// confondues — utilisé par le tirage de loot (roll la rareté, puis pioche
// une arme parmi celles de cette rareté).
export function getEntriesForTier(tierKey) {
  const out = [];
  for (const [category, entries] of Object.entries(WEAPON_CATALOG)) {
    for (const entry of entries) {
      if (entry.tier === tierKey) out.push({ category, entry });
    }
  }
  return out;
}

export function createRandomWeaponForTier(tierKey) {
  const pool = getEntriesForTier(tierKey);
  if (pool.length === 0) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return createWeaponFromEntry(pick.category, pick.entry);
}

// Arme de secours indestructible : équipée automatiquement si l'arme en
// main casse et qu'il n'y a rien d'autre dans l'inventaire. Le joueur
// n'est ainsi jamais totalement désarmé.
export function createFistsWeapon() {
  return {
    id: 'fists',
    name: 'Poings Nus',
    category: 'fists',
    kind: 'fists',
    ranged: false,
    tierKey: 'COMMUNE',
    rarityLabel: '',
    color: 0xcccccc,
    atk: 2,
    range: 22,
    speedMs: 400,
    crit: 0.03,
    durability: Infinity,
    maxDurability: Infinity,
    visualSeed: 0
  };
}
