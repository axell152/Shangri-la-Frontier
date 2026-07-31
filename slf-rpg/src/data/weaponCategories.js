// Stats de base par catégorie d'arme (avant application de la rareté et
// de la variation individuelle par arme — voir weapons.js).
// - baseAtk / baseRange / baseSpeedMs / baseCrit : ressenti de combat.
// - baseDurability : nombre de coups avant que l'arme ne casse.
// - ranged : true si l'arme tire un projectile (arc, bâton, arme futuriste).
export const WEAPON_CATEGORIES = {
  sword: {
    label: 'Épée', kind: 'sword', ranged: false,
    baseAtk: 9, baseRange: 34, baseSpeedMs: 480, baseCrit: 0.06, baseDurability: 40
  },
  dagger: {
    label: 'Dague', kind: 'dagger', ranged: false,
    baseAtk: 5, baseRange: 24, baseSpeedMs: 300, baseCrit: 0.16, baseDurability: 28
  },
  bow: {
    label: 'Arc', kind: 'bow', ranged: true,
    baseAtk: 7, baseRange: 260, baseSpeedMs: 560, baseCrit: 0.10, baseDurability: 24
  },
  axe: {
    label: 'Hache', kind: 'axe', ranged: false,
    baseAtk: 14, baseRange: 30, baseSpeedMs: 680, baseCrit: 0.07, baseDurability: 34
  },
  staff: {
    label: 'Bâton', kind: 'staff', ranged: true,
    baseAtk: 6, baseRange: 230, baseSpeedMs: 620, baseCrit: 0.05, baseDurability: 20
  },
  spear: {
    label: 'Lance', kind: 'spear', ranged: false,
    baseAtk: 10, baseRange: 46, baseSpeedMs: 520, baseCrit: 0.05, baseDurability: 34
  },
  hammer: {
    label: 'Marteau', kind: 'hammer', ranged: false,
    baseAtk: 16, baseRange: 32, baseSpeedMs: 760, baseCrit: 0.04, baseDurability: 46
  },
  katana: {
    label: 'Katana', kind: 'katana', ranged: false,
    baseAtk: 11, baseRange: 36, baseSpeedMs: 420, baseCrit: 0.14, baseDurability: 30
  },
  claw: {
    label: 'Griffes', kind: 'claw', ranged: false,
    baseAtk: 6, baseRange: 26, baseSpeedMs: 260, baseCrit: 0.18, baseDurability: 26
  },
  gun: {
    label: 'Arme Futuriste', kind: 'gun', ranged: true,
    baseAtk: 8, baseRange: 300, baseSpeedMs: 380, baseCrit: 0.09, baseDurability: 20
  }
};
