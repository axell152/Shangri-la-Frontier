// src/systems/WeaponSystem.js
import { createWeapon } from '../data/weapons.js';

export class WeaponSystem {
  constructor() {
    // Arme de départ et inventaire initial
    this.equipped = createWeapon('dague_ebrechee', 'TROUVAILLE');
    this.inventory = [this.equipped]; 
  }

  // Ajoute une arme ramassée à l'inventaire
  addToInventory(weapon) {
    this.inventory.push(weapon);
  }

  // Équipe une arme en fonction de son ID unique dans l'inventaire
  equipFromInventory(weaponId) {
    const found = this.inventory.find(w => w.id === weaponId);
    if (found) {
      this.equipped = found;
      return found;
    }
    return null;
  }

  equip(weaponInstance) {
    // Sécurité : si l'arme n'est pas dans l'inventaire, on l'ajoute
    if (!this.inventory.some(w => w.id === weaponInstance.id)) {
      this.inventory.push(weaponInstance);
    }
    this.equipped = weaponInstance;
  }

  get attackCooldownMs() {
    return Math.round(600 / this.equipped.speed);
  }

  get attackRange() {
    return this.equipped.range;
  }

  get attackDamage() {
    return this.equipped.atk;
  }

  get critChance() {
    return this.equipped.crit;
  }

  get weaponType() {
    return this.equipped.kind;
  }

  get color() {
    return this.equipped.color;
  }
}
