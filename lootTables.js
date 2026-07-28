import { createWeapon } from '../data/weapons.js';

export class WeaponSystem {
  constructor() {
    this.inventory = [];
    this.equipped = null;
    // Starting gear: the "trash weapon you're stuck with" trope.
    this.equip(createWeapon('epee_rouillee', 'TROUVAILLE'));
  }

  addToInventory(weapon) {
    this.inventory.push(weapon);
    return weapon;
  }

  equip(weapon) {
    this.equipped = weapon;
  }

  equipFromInventory(weaponId) {
    const weapon = this.inventory.find((w) => w.id === weaponId);
    if (weapon) this.equip(weapon);
    return weapon || null;
  }

  removeFromInventory(weaponId) {
    this.inventory = this.inventory.filter((w) => w.id !== weaponId);
  }

  get attackDamage() {
    if (!this.equipped) return 1;
    return this.equipped.atk;
  }

  get attackRange() {
    return this.equipped ? this.equipped.range : 28;
  }

  get critChance() {
    return this.equipped ? this.equipped.crit : 0.05;
  }

  get attackCooldownMs() {
    const speed = this.equipped ? this.equipped.speed : 1.0;
    return Math.round(500 / speed);
  }
}
