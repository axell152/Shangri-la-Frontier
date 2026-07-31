// Système de rareté à 7 paliers. `weight` sert au tirage pondéré du loot
// (valeurs reprises directement des taux de drop voulus). `statMult` est un
// intervalle [min, max] : chaque arme individuelle tire une valeur précise
// dans cet intervalle (voir weapons.js), donc deux armes de même rareté
// n'ont jamais exactement les mêmes stats.
export const RARITY_TIERS = {
  COMMUNE: { key: 'COMMUNE', label: 'Commune', weight: 35, statMult: [1.0, 1.15], color: 0xd9d9d9 },
  PEU_COMMUNE: { key: 'PEU_COMMUNE', label: 'Peu Commune', weight: 20, statMult: [1.2, 1.4], color: 0x4dff8a },
  RARE: { key: 'RARE', label: 'Rare', weight: 10, statMult: [1.45, 1.75], color: 0x3d9dff },
  EPIQUE: { key: 'EPIQUE', label: 'Épique', weight: 4, statMult: [1.8, 2.2], color: 0xb14dff },
  LEGENDAIRE: { key: 'LEGENDAIRE', label: 'Légendaire', weight: 1, statMult: [2.3, 2.8], color: 0xffb200 },
  MYTHIQUE: { key: 'MYTHIQUE', label: 'Mythique', weight: 0.1, statMult: [2.9, 3.5], color: 0xff3d5a },
  RELIQUE_DIVINE: { key: 'RELIQUE_DIVINE', label: 'Relique Divine', weight: 0.01, statMult: [3.6, 4.5], color: 0x2affe0 }
};

export const RARITY_ORDER = [
  'COMMUNE',
  'PEU_COMMUNE',
  'RARE',
  'EPIQUE',
  'LEGENDAIRE',
  'MYTHIQUE',
  'RELIQUE_DIVINE'
];
