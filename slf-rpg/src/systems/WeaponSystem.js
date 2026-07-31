import { createWeaponByName, createFistsWeapon } from '../data/weapons.js';

export class WeaponSystem {
  constructor() {
    this.inventory = [];
    this.equipped = null;
    // Arme de départ : une épée commune, dans l'esprit "équipement pourri
    // au démarrage" façon Shangri-La Frontier.
    this.equip(createWeaponByName('Épée de Fer Rouillée'));
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
    return this.equipped ? this.equipped.speedMs : 500;
  }

  get isRanged() {
    return this.equipped ? !!this.equipped.ranged : false;
  }

  // À appeler une fois par attaque réellement exécutée (touche ou pas,
  // corps-à-corps ou tir). Consomme un point de durabilité sur l'arme
  // équipée ; si elle casse, elle est retirée et remplacée automatiquement
  // (par la prochaine arme de l'inventaire, ou les poings si l'inventaire
  // est vide — le joueur n'est jamais totalement désarmé).
  registerAttackUse() {
    if (!this.equipped || this.equipped.durability === Infinity) {
      return { broke: false };
    }

    this.equipped.durability -= 1;

    if (this.equipped.durability <= 0) {
      const broken = this.equipped;
      this.inventory = this.inventory.filter((w) => w.id !== broken.id);
      const next = this.inventory[0] || createFistsWeapon();
      this.equip(next);
      return {
        broke: true,
        brokenName: `${broken.rarityLabel} ${broken.name}`.trim(),
        newEquippedName: `${next.rarityLabel} ${next.name}`.trim()
      };
    }

    return { broke: false };
  }
}
