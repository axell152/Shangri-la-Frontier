import { rollLootTier } from '../data/lootTables.js';
import { createRandomWeaponForTier } from '../data/weapons.js';

export class LootSystem {
  // Renvoie une instance d'arme concrète, ou null si l'ennemi n'a rien lâché.
  static rollForEnemy(lootTier) {
    const tierKey = rollLootTier(lootTier);
    if (!tierKey) return null;
    return createRandomWeaponForTier(tierKey);
  }
}
