// Rarity tiers, from "junk you'd never equip" to "absurdly overtuned".
// Multipliers scale the weapon's base stats.
export const RARITY = {
  TROUVAILLE: { label: 'Trouvaille', color: 0x9d9d9d, mult: 1.0 },
  COMMUNE:    { label: 'Commune',    color: 0xffffff, mult: 1.25 },
  RARE:       { label: 'Rare',       color: 0x3d9dff, mult: 1.6 },
  EPIQUE:     { label: 'Épique',     color: 0xb14dff, mult: 2.1 },
  LEGENDAIRE: { label: 'Légendaire', color: 0xffb200, mult: 2.8 },
  MYTHIQUE:   { label: 'Mythique',   color: 0xff3d5a, mult: 3.6 }
};

export const RARITY_ORDER = ['TROUVAILLE', 'COMMUNE', 'RARE', 'EPIQUE', 'LEGENDAIRE', 'MYTHIQUE'];

// Weapon archetypes: base stats before rarity multiplier is applied.
export const WEAPON_TYPES = {
  epee_rouillee: {
    name: 'Épée rouillée',
    kind: 'sword',
    baseAtk: 6,
    baseSpeed: 1.0,
    baseCrit: 0.05,
    range: 34,
    flavor: "Elle a l'air prête à casser, mais elle mord encore."
  },
  dague_ebrechee: {
    name: 'Dague ébréchée',
    kind: 'dagger',
    baseAtk: 4,
    baseSpeed: 1.6,
    baseCrit: 0.15,
    range: 24,
    flavor: 'Rapide, fragile, parfaite pour les lâches efficaces.'
  },
  lance_bambou: {
    name: 'Lance en bambou',
    kind: 'spear',
    baseAtk: 8,
    baseSpeed: 0.75,
    baseCrit: 0.04,
    range: 46,
    flavor: 'Portée correcte, cadence désastreuse.'
  },
  hache_bucheron: {
    name: 'Hache de bûcheron',
    kind: 'axe',
    baseAtk: 11,
    baseSpeed: 0.55,
    baseCrit: 0.08,
    range: 30,
    flavor: "Faite pour le bois. S'en sort étonnamment bien sur les monstres."
  },
  arc_branches: {
    name: 'Arc de branches',
    kind: 'bow',
    baseAtk: 5,
    baseSpeed: 1.1,
    baseCrit: 0.1,
    range: 90,
    flavor: 'Tire des flèches taillées à la va-vite.'
  }
};

// Builds an actual weapon instance from a type key + rarity key.
export function createWeapon(typeKey, rarityKey) {
  const type = WEAPON_TYPES[typeKey];
  const rarity = RARITY[rarityKey];
  if (!type || !rarity) throw new Error(`Type/rareté d'arme invalide: ${typeKey}/${rarityKey}`);

  return {
    id: `${typeKey}_${rarityKey}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    typeKey,
    rarityKey,
    name: type.name,
    kind: type.kind,
    range: type.range,
    flavor: type.flavor,
    rarityLabel: rarity.label,
    color: rarity.color,
    atk: Math.round(type.baseAtk * rarity.mult),
    speed: +(type.baseSpeed * (1 + (rarity.mult - 1) * 0.15)).toFixed(2),
    crit: +Math.min(0.75, type.baseCrit * rarity.mult).toFixed(2)
  };
}
