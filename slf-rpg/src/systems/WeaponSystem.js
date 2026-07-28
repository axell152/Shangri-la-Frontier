// src/systems/WeaponSystem.js
import { createWeapon } from '../data/weapons.js';

export class WeaponSystem {
  constructor() {
    // Par défaut, on équipe une dague ébréchée de rareté TROUVAILLE au démarrage
    this.equipped = createWeapon('dague_ebrechee', 'TROUVAILLE');
  }

  equip(weaponInstance) {
    this.equipped = weaponInstance;
  }

  // Convertit la vitesse de l'arme en millisecondes pour le cooldown du joueur
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
    return this.equipped.kind; // 'sword', 'dagger', 'spear', 'axe', 'bow'
  }

  get color() {
    return this.equipped.color;
  }
}
