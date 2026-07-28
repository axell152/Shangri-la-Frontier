import { rollLoot } from '../data/lootTables.js';
import { createWeapon } from '../data/weapons.js';

export class LootSystem {
  // Returns a weapon instance, or null if the enemy dropped nothing.
  static rollForEnemy(lootTier) {
    const roll = rollLoot(lootTier);
    if (!roll) return null;
    return createWeapon(roll.typeKey, roll.rarityKey);
  }
}
