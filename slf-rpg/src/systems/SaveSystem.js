const SAVE_KEY = 'slf-rpg-save-v1';

// Système de sauvegarde simple basé sur localStorage. Toutes les méthodes
// sont défensives (try/catch) car localStorage peut être indisponible
// (navigation privée, quota dépassé, etc.) sans que ça doive planter le jeu.
export class SaveSystem {
  static hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  static save(player) {
    try {
      const payload = {
        version: 1,
        savedAt: Date.now(),
        stats: {
          level: player.stats.level,
          xp: player.stats.xp,
          xpToNext: player.stats.xpToNext,
          hp: player.stats.hp
        },
        weapons: {
          equipped: player.weapons.equipped,
          inventory: player.weapons.inventory
        },
        position: { x: player.x, y: player.y }
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('Sauvegarde impossible :', e);
      return false;
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Lecture de la sauvegarde impossible :', e);
      return null;
    }
  }

  static clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('Suppression de la sauvegarde impossible :', e);
    }
  }

  // Applique une sauvegarde chargée sur un Player déjà construit.
  // Le niveau/XP/inventaire sont restaurés ; les PV sont bornés au
  // maxHp recalculé (au cas où le solde des stats aurait changé).
  static applyTo(player, save) {
    if (!save) return;

    if (save.stats) {
      player.stats.level = save.stats.level ?? player.stats.level;
      player.stats.xp = save.stats.xp ?? player.stats.xp;
      player.stats.xpToNext = save.stats.xpToNext ?? player.stats.xpToNext;
      player.stats.hp = Math.min(save.stats.hp ?? player.stats.hp, player.stats.maxHp);
    }

    if (save.weapons) {
      player.weapons.inventory = Array.isArray(save.weapons.inventory) ? save.weapons.inventory : [];
      if (save.weapons.equipped) player.weapons.equipped = save.weapons.equipped;
    }

    if (save.position && typeof save.position.x === 'number' && typeof save.position.y === 'number') {
      player.sprite.setPosition(save.position.x, save.position.y);
    }
  }
}
