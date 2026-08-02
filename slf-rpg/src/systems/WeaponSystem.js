import { createWeaponByName, createFistsWeapon, createUpgradeWeapon } from '../data/weapons.js';
import { RARITY_ORDER } from '../data/rarity.js';

// Prix de vente de base par palier de rareté (avant application de l'état
// de l'arme). Le coût de fusion est ce qu'il en coûte en plus des 3 armes
// identiques pour obtenir le palier supérieur.
const SELL_VALUE_BY_TIER = {
  COMMUNE: 5, PEU_COMMUNE: 15, RARE: 40, EPIQUE: 100, LEGENDAIRE: 300, MYTHIQUE: 900, RELIQUE_DIVINE: 3000
};
const MERGE_COST_BY_TIER = {
  COMMUNE: 30, PEU_COMMUNE: 80, RARE: 200, EPIQUE: 500, LEGENDAIRE: 1500, MYTHIQUE: 5000
};

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

  // À appeler une fois par attaque réellement exécutée. Consomme un point
  // de durabilité sur l'arme équipée ; si elle casse, elle est remplacée
  // automatiquement (inventaire, ou poings si l'inventaire est vide).
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

  // --- Marchand : vente ---

  getSellValue(weapon) {
    const base = SELL_VALUE_BY_TIER[weapon.tierKey] ?? 5;
    const durabilityFraction = isFinite(weapon.durability) ? weapon.durability / weapon.maxDurability : 1;
    return Math.max(1, Math.round(base * (0.4 + durabilityFraction * 0.6)));
  }

  // Vend une arme de l'inventaire. Si c'était l'arme équipée, une autre
  // prend automatiquement sa place (jamais désarmé). Renvoie le montant
  // obtenu, ou 0 si l'arme n'existe pas.
  sellWeapon(weaponId) {
    const weapon = this.inventory.find((w) => w.id === weaponId);
    if (!weapon) return 0;

    const value = this.getSellValue(weapon);
    this.inventory = this.inventory.filter((w) => w.id !== weaponId);

    if (this.equipped && this.equipped.id === weaponId) {
      this.equip(this.inventory[0] || createFistsWeapon());
    }

    return value;
  }

  // --- Marchand : fusion ---

  // Regroupe l'inventaire par nom exact ; ne renvoie que les groupes ayant
  // au moins 3 exemplaires (fusionnables), avec le coût en argent associé.
  getMergeableGroups() {
    const byName = new Map();
    for (const weapon of this.inventory) {
      if (!byName.has(weapon.name)) byName.set(weapon.name, []);
      byName.get(weapon.name).push(weapon);
    }

    const groups = [];
    for (const [name, weapons] of byName.entries()) {
      if (weapons.length < 3) continue;
      const sample = weapons[0];
      groups.push({
        name,
        category: sample.category,
        tierKey: sample.tierKey,
        rarityLabel: sample.rarityLabel,
        color: sample.color,
        count: weapons.length,
        cost: MERGE_COST_BY_TIER[sample.tierKey] ?? 999999,
        weaponIds: weapons.slice(0, 3).map((w) => w.id)
      });
    }
    return groups;
  }

  // Consomme 3 armes du même nom pour en produire une du palier supérieur
  // (même catégorie, choisie au hasard parmi celles de ce palier).
  // Renvoie la nouvelle arme, ou null si la fusion n'est pas possible.
  mergeByName(name) {
    const matching = this.inventory.filter((w) => w.name === name);
    if (matching.length < 3) return null;

    const sample = matching[0];
    const upgraded = createUpgradeWeapon(sample.category, sample.tierKey);
    if (!upgraded) return null; // déjà au palier maximum pour cette catégorie

    const idsToRemove = new Set(matching.slice(0, 3).map((w) => w.id));
    this.inventory = this.inventory.filter((w) => !idsToRemove.has(w.id));
    this.inventory.push(upgraded);

    return upgraded;
  }
}
