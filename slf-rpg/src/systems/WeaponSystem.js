import { createWeaponByName, createFistsWeapon, createUpgradeWeapon } from '../data/weapons.js';
import { RARITY_ORDER } from '../data/rarity.js';

// Prix de vente de base par palier de rareté
const SELL_VALUE_BY_TIER = {
  COMMUNE: 5, PEU_COMMUNE: 15, RARE: 40, EPIQUE: 100, LEGENDAIRE: 300, MYTHIQUE: 900, RELIQUE_DIVINE: 3000
};
const MERGE_COST_BY_TIER = {
  COMMUNE: 30, PEU_COMMUNE: 80, RARE: 200, EPIQUE: 500, LEGENDAIRE: 1500, MYTHIQUE: 5000
};

// Renvoie les compétences uniques de l'arme selon son nom exact
function getUniqueSkillsForWeapon(weaponName, weaponKind) {
  // Exemples de compétences ultra-personnalisées par arme unique :
  switch (weaponName) {
    case "L'Exécutrice des Âmes":
      return [
        { level: 20, id: 'soul_drain', name: 'Aspiration d\'Âme' },
        { level: 50, id: 'death_reaper', name: 'Fauchage Spectral' }
      ];
    case "Fulgurance de l'Aube":
      return [
        { level: 20, id: 'sun_flash', name: 'Éclair Solaire' },
        { level: 50, id: 'nova_burst', name: 'Nova Radiante' }
      ];
    default:
      // Si c'est une arme générique, on peut lui donner des compétences basées sur son type 
      // ou générer un effet par défaut pour les niveaux 20 et 50 :
      if (weaponKind === 'staff') {
        return [
          { level: 20, id: 'arcane_orb', name: 'Orbe Arcanique' },
          { level: 50, id: 'time_warp', name: 'Distorsion Temporelle' }
        ];
      } else {
        return [
          { level: 20, id: 'heavy_slash', name: 'Taillade Sismique' },
          { level: 50, id: 'blade_storm', name: 'Tempête de Lames' }
        ];
      }
  }
}

export class WeaponSystem {
  constructor() {
    this.inventory = [];
    this.equipped = null;
    
    // Arme de départ
    const initialWeapon = createWeaponByName('Épée de Fer Rouillée');
    this.initWeaponProgression(initialWeapon);
    this.equip(initialWeapon);
  }

  // Initialise l'XP, le niveau et les compétences d'une arme
  initWeaponProgression(weapon) {
    if (!weapon) return;
    if (weapon.level === undefined) weapon.level = 1;
    if (weapon.xp === undefined) weapon.xp = 0;
    if (weapon.xpToNext === undefined) weapon.xpToNext = 50;
    if (!weapon.unlockedSkills) weapon.unlockedSkills = [];
  }

  addToInventory(weapon) {
    this.initWeaponProgression(weapon);
    this.inventory.push(weapon);
    return weapon;
  }

  equip(weapon) {
    this.initWeaponProgression(weapon);
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
    // Bonus de dégâts selon le niveau de l'arme (+10% par niveau supplémentaire)
    const levelBonus = 1 + (this.equipped.level - 1) * 0.1;
    return Math.round(this.equipped.atk * levelBonus);
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

  // Ajoute de l'expérience à l'arme équipée lorsqu'un monstre est vaincu
  addWeaponXp(amount) {
    const weapon = this.equipped;
    if (!weapon || weapon.name === 'Poings') return null; // Pas d'XP pour les poings

    weapon.xp += amount;
    let leveledUp = false;

    // Boucle au cas où l'arme gagne assez d'XP pour prendre plusieurs niveaux d'un coup
    while (weapon.xp >= weapon.xpToNext) {
      weapon.xp -= weapon.xpToNext;
      weapon.level += 1;
      weapon.xpToNext = Math.round(weapon.xpToNext * 1.5);
      leveledUp = true;

      // Vérifie et débloque les compétences pour ce nouveau niveau
      this.checkSkillUnlock(weapon);
    }

    return leveledUp ? { level: weapon.level, name: weapon.name } : null;
  }

  // Associe des compétences uniques aux armes selon leur nom/type et les paliers 20 et 50
  checkSkillUnlock(weapon) {
    if (!weapon.unlockedSkills) {
      weapon.unlockedSkills = [];
    }

    // Récupère les compétences spécifiques de cette arme (paliers 20 et 50)
    const uniqueSkills = getUniqueSkillsForWeapon(weapon.name, weapon.kind);

    uniqueSkills.forEach(skillDef => {
      // Si l'arme atteint le niveau requis (ex: 20 ou 50) et ne l'a pas encore débloquée
      if (weapon.level === skillDef.level) {
        if (!weapon.unlockedSkills.some(s => s.id === skillDef.id)) {
          weapon.unlockedSkills.push(skillDef);
          
          // Notifie le jeu qu'une compétence a été débloquée
          EventBus.emit('loot-log', { 
            type: 'levelup', 
            text: `🔥 ${weapon.name} a atteint le niv. ${weapon.level} ! Nouvelle compétence : ${skillDef.name}` 
          });
        }
      }
    });
  }

  // Consomme un point de durabilité
  registerAttackUse() {
    if (!this.equipped || this.equipped.durability === Infinity) {
      return { broke: false };
    }

    this.equipped.durability -= 1;

    if (this.equipped.durability <= 0) {
      const broken = this.equipped;
      this.inventory = this.inventory.filter((w) => w.id !== broken.id);
      const next = this.inventory[0] || createFistsWeapon();
      this.initWeaponProgression(next);
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
    // Les armes de niveau supérieur se revendent un peu plus cher
    const levelMultiplier = 1 + (weapon.level - 1) * 0.2;
    return Math.max(1, Math.round(base * (0.4 + durabilityFraction * 0.6) * levelMultiplier));
  }

  sellWeapon(weaponId) {
    const weapon = this.inventory.find((w) => w.id === weaponId);
    if (!weapon) return 0;

    const value = this.getSellValue(weapon);
    this.inventory = this.inventory.filter((w) => w.id !== weaponId);

    if (this.equipped && this.equipped.id === weaponId) {
      const next = this.inventory[0] || createFistsWeapon();
      this.initWeaponProgression(next);
      this.equip(next);
    }

    return value;
  }

  // --- Marchand : fusion ---

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

  mergeByName(name) {
    const matching = this.inventory.filter((w) => w.name === name);
    if (matching.length < 3) return null;

    const sample = matching[0];
    const upgraded = createUpgradeWeapon(sample.category, sample.tierKey);
    if (!upgraded) return null; 

    this.initWeaponProgression(upgraded);
    const idsToRemove = new Set(matching.slice(0, 3).map((w) => w.id));
    this.inventory = this.inventory.filter((w) => !idsToRemove.has(w.id));
    this.inventory.push(upgraded);

    return upgraded;
  }
}
