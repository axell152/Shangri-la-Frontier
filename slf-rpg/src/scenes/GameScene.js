import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { LootSystem } from '../systems/LootSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { EventBus } from '../EventBus.js';

const WORLD_W = 1600;
const WORLD_H = 1200;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.add.grid(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 40, 40, 0x14141f, 1, 0x1e1e2c, 1);

    // Safe zone : seul endroit où sauvegarder, manuellement (touche F).
    // Définie avant le spawn des ennemis pour qu'ils l'évitent dès le départ.
    this.safeZone = { x: WORLD_W / 2, y: WORLD_H / 2, radius: 90 };
    this.inSafeZone = false;

    // Marchand : à l'intérieur de la safe zone, vente et fusion d'armes (touche T).
    this.merchant = { x: WORLD_W / 2 + 45, y: WORLD_H / 2 - 20, radius: 45 };
    this.nearMerchant = false;
    this.merchantPanelOpen = false;
    this.inventoryOpen = false;

    this.enemies = [];
    this.enemyGroup = this.physics.add.group();
    this.spawnEnemies();

    this.lootDrops = [];
    this.projectiles = [];

    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    const save = SaveSystem.load();
    if (save) {
      SaveSystem.applyTo(this.player, save);
      EventBus.emit('loot-log', { type: 'pickup', text: 'Sauvegarde chargée.' });
    }

    this.saveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.talkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.pickupKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.safeZoneGfx = this.add.graphics();
    this.drawSafeZone();
    this.merchantGfx = this.add.graphics();
    this.drawMerchant();

    this.physics.add.overlap(this.player.sprite, this.enemyGroup, (playerSprite, enemySprite) =>
      this.handleEnemyContact(enemySprite), null, this);

    EventBus.on('equip-weapon', (weaponId) => {
      const weapon = this.player.weapons.equipFromInventory(weaponId);
      if (weapon) this.emitStatsUpdate();
    });

    EventBus.on('sell-weapon', (weaponId) => {
      const value = this.player.weapons.sellWeapon(weaponId);
      if (value > 0) {
        this.player.gold += value;
        EventBus.emit('loot-log', { type: 'pickup', text: `Vendu pour ${value} or.` });
        this.emitStatsUpdate();
      }
    });

    EventBus.on('merge-weapons', (name) => {
      const groups = this.player.weapons.getMergeableGroups();
      const group = groups.find((g) => g.name === name);
      if (!group || this.player.gold < group.cost) {
        EventBus.emit('loot-log', { type: 'kill', text: "Fusion impossible (pas assez d'or ou d'exemplaires)." });
        return;
      }
      const upgraded = this.player.weapons.mergeByName(name);
      if (upgraded) {
        this.player.gold -= group.cost;
        EventBus.emit('loot-log', { type: 'pickup', text: `Fusion réussie : ${upgraded.rarityLabel} ${upgraded.name} !` });
        this.emitStatsUpdate();
      } else {
        EventBus.emit('loot-log', { type: 'kill', text: 'Cette arme est déjà au palier maximum.' });
      }
    });

    EventBus.on('respawn-request', () => this.respawnPlayer());

    EventBus.on('reset-save-request', () => {
      SaveSystem.clear();
      window.location.reload();
    });

    this.emitStatsUpdate();
  }

  emitStatsUpdate() {
    EventBus.emit('stats-updated', this.buildStatePayload());
  }

  drawSafeZone() {
    const g = this.safeZoneGfx;
    const { x, y, radius } = this.safeZone;
    g.clear();
    g.fillStyle(0xffb200, 0.08);
    g.fillCircle(x, y, radius);
    g.lineStyle(2, 0xffb200, 0.6);
    g.strokeCircle(x, y, radius);

    // Petit feu de camp au centre, purement décoratif
    g.fillStyle(0x5a4632, 1);
    g.fillRect(x - 10, y + 6, 20, 4);
    g.fillStyle(0xff8c00, 1);
    g.fillTriangle(x - 7, y + 6, x + 7, y + 6, x, y - 10);
    g.fillStyle(0xffd23d, 1);
    g.fillTriangle(x - 3, y + 6, x + 3, y + 6, x, y - 3);
  }

  drawMerchant() {
    const g = this.merchantGfx;
    const { x, y } = this.merchant;
    g.clear();
    // Silhouette simple façon marchand (robe + capuche)
    g.fillStyle(0x6b4f2a, 1);
    g.fillTriangle(x - 12, y + 16, x + 12, y + 16, x, y - 10);
    g.fillStyle(0xd9c39a, 1);
    g.fillCircle(x, y - 16, 7);
    g.fillStyle(0x3a2a1a, 1);
    g.fillTriangle(x - 9, y - 14, x + 9, y - 14, x, y - 26);
    // Étal (petite table)
    g.fillStyle(0x5a4632, 1);
    g.fillRect(x - 18, y + 18, 36, 5);
    g.fillRect(x - 16, y + 23, 3, 8);
    g.fillRect(x + 13, y + 23, 3, 8);
  }

  manualSave() {
    const ok = SaveSystem.save(this.player);
    EventBus.emit('loot-log', {
      type: ok ? 'pickup' : 'kill',
      text: ok ? 'Progression sauvegardée.' : 'Échec de la sauvegarde.'
    });
    if (ok) EventBus.emit('save-flash');
  }

  randomSpawnPosition() {
    let x, y;
    do {
      x = Phaser.Math.Between(100, WORLD_W - 100);
      y = Phaser.Math.Between(100, WORLD_H - 100);
    } while (Phaser.Math.Distance.Between(x, y, this.safeZone.x, this.safeZone.y) < this.safeZone.radius + 40);
    return { x, y };
  }

  spawnSingleEnemy(typeKey, x, y) {
    const enemy = new Enemy(this, x, y, typeKey);
    this.enemies.push(enemy);
    this.enemyGroup.add(enemy.sprite);
    return enemy;
  }

  spawnEnemies() {
    const layout = [
      { type: 'slime', count: 5 },
      { type: 'gobelin', count: 4 },
      { type: 'golem_debris', count: 2 },
      { type: 'gardien_rouille', count: 1 }
    ];

    for (const group of layout) {
      for (let i = 0; i < group.count; i++) {
        const { x, y } = this.randomSpawnPosition();
        this.spawnSingleEnemy(group.type, x, y);
      }
    }
  }

  handleEnemyContact(enemySprite) {
    const enemy = this.enemies.find((e) => e.sprite === enemySprite);
    if (!enemy || enemy.dead) return;
    this.damagePlayer(enemy.atk);
  }

  // Point d'entrée unique pour tous les dégâts subis par le joueur
  // (contact avec un ennemi, ou impact d'une charge de boss télégraphiée).
  damagePlayer(amount) {
    if (this.player.stats.hp <= 0) return;
    const result = this.player.takeDamage(amount, this.time.now);
    if (!result) return; // encore invulnérable, coup ignoré

    EventBus.emit('player-hit', { damage: result.damage });
    this.emitStatsUpdate();

    if (result.died) this.handlePlayerDeath();
  }

  handlePlayerDeath() {
    if (this.playerIsDead) return;
    this.playerIsDead = true;
    this.player.sprite.body.setVelocity(0, 0);
    EventBus.emit('loot-log', { type: 'kill', text: 'Tu es mort.' });
  }

  // La mort ramène à la DERNIÈRE sauvegarde manuelle (niveau, inventaire,
  // or, tout). S'il n'y a jamais eu de sauvegarde, le personnage repart
  // complètement de zéro — sauvegarder régulièrement est donc important.
  respawnPlayer() {
    this.playerIsDead = false;

    const save = SaveSystem.load();
    if (save) {
      SaveSystem.applyTo(this.player, save);
      this.player.stats.hp = this.player.stats.maxHp;
      EventBus.emit('loot-log', { type: 'kill', text: 'Progression perdue depuis ta dernière sauvegarde.' });
    } else {
      this.player.resetFresh();
      EventBus.emit('loot-log', { type: 'kill', text: 'Aucune sauvegarde trouvée — nouveau départ.' });
    }

    this.player.sprite.setPosition(WORLD_W / 2, WORLD_H / 2);
    this.player.invulnerableUntil = this.time.now + 1200;
    this.player.hitFlashUntil = 0;
    this.emitStatsUpdate();
  }

  onHitEnemy(enemy, damage, isCrit) {
    const killed = enemy.takeDamage(damage);
    this.showDamagePopup(enemy.x, enemy.y, damage, isCrit);

    if (killed) {
      const weapon = LootSystem.rollForEnemy(enemy.lootTier);
      if (weapon) this.spawnLootDrop(enemy.x, enemy.y, weapon);

      const leveledUp = this.player.stats.gainXp(enemy.xp);
      EventBus.emit('loot-log', { type: 'kill', text: `${enemy.typeKey} vaincu (+${enemy.xp} XP)` });
      if (leveledUp) EventBus.emit('level-up', this.player.stats.level);

      const typeKey = enemy.typeKey;
      const isBoss = enemy.isBoss;
      const respawnDelayMs = isBoss ? 5 * 60 * 1000 : 30 * 1000;

      this.time.delayedCall(1500, () => {
        this.enemyGroup.remove(enemy.sprite, true, false);
        enemy.destroy();
        this.enemies = this.enemies.filter((e) => e !== enemy);
      });

      this.time.delayedCall(respawnDelayMs, () => {
        const { x, y } = this.randomSpawnPosition();
        this.spawnSingleEnemy(typeKey, x, y);
        if (isBoss) {
          EventBus.emit('loot-log', { type: 'kill', text: 'Le Gardien Rouille est réapparu quelque part sur la carte.' });
        }
      });
    }

    this.emitStatsUpdate();
  }

  showDamagePopup(x, y, damage, isCrit) {
    const text = this.add.text(x, y - 30, isCrit ? `${damage}!` : `${damage}`, {
      fontSize: isCrit ? '20px' : '14px',
      color: isCrit ? '#ffb200' : '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 700,
      onComplete: () => text.destroy()
    });
  }

  spawnLootDrop(x, y, weapon) {
    const sprite = this.add.rectangle(x, y, 12, 12, weapon.color).setStrokeStyle(2, 0xffffff);
    this.tweens.add({ targets: sprite, y: y - 6, yoyo: true, repeat: -1, duration: 500 });
    this.lootDrops.push({ sprite, weapon });
    EventBus.emit('loot-log', { type: 'drop', text: `${weapon.rarityLabel} — ${weapon.name} au sol` });
  }

  tryPickupLoot() {
    const pickupRange = 60;
    const nearby = this.lootDrops.find(
      (drop) => Phaser.Math.Distance.Between(this.player.x, this.player.y, drop.sprite.x, drop.sprite.y) < pickupRange
    );
    if (!nearby) return;

    this.player.weapons.addToInventory(nearby.weapon);
    EventBus.emit('loot-log', { type: 'pickup', text: `Récupéré: ${nearby.weapon.rarityLabel} ${nearby.weapon.name}` });
    nearby.sprite.destroy();
    this.lootDrops = this.lootDrops.filter((d) => d !== nearby);
    this.emitStatsUpdate();
  }

  buildStatePayload() {
    const { stats, weapons, gold } = this.player;
    return {
      level: stats.level,
      hp: stats.hp,
      maxHp: stats.maxHp,
      xp: stats.xp,
      xpToNext: stats.xpToNext,
      atk: stats.totalAtk,
      def: stats.totalDef,
      equipped: weapons.equipped,
      inventory: weapons.inventory,
      gold,
      mergeGroups: weapons.getMergeableGroups()
    };
  }

  update(time) {
    if (this.playerIsDead) return;

    this.player.update(time, this.enemies, (enemy, dmg, crit) => this.onHitEnemy(enemy, dmg, crit));
    for (const enemy of this.enemies) {
      enemy.update(time, this.player.x, this.player.y, (amount) => this.damagePlayer(amount), this.inSafeZone);
    }

    // Barrière invisible : aucun ennemi ne peut entrer dans la safe zone
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const distToZone = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.safeZone.x, this.safeZone.y);
      if (distToZone < this.safeZone.radius) {
        const angle = Phaser.Math.Angle.Between(this.safeZone.x, this.safeZone.y, enemy.x, enemy.y);
        enemy.sprite.setPosition(
          this.safeZone.x + Math.cos(angle) * this.safeZone.radius,
          this.safeZone.y + Math.sin(angle) * this.safeZone.radius
        );
        enemy.sprite.body.setVelocity(0, 0);
      }
    }

    // Gestion des projectiles en vol (arc, bâton, arme futuriste...)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.sprite && proj.sprite.setPosition) proj.sprite.setPosition(proj.x, proj.y);
      proj.life--;

      const traveled = Phaser.Math.Distance.Between(proj.startX, proj.startY, proj.x, proj.y);
      if (traveled >= proj.maxRange) {
        if (proj.sprite) proj.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y);
        if (dist < 18) {
          const enemyDamage = Math.max(1, proj.damage - enemy.def);
          this.onHitEnemy(enemy, enemyDamage, proj.isCrit);
          if (proj.sprite) proj.sprite.destroy();
          this.projectiles.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;

      if (proj.life <= 0) {
        if (proj.sprite) proj.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.pickupKey)) {
      this.tryPickupLoot();
    }

    // Safe zone : détecte l'entrée/sortie et gère la sauvegarde manuelle (touche F)
    const distToSafeZone = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.safeZone.x, this.safeZone.y);
    const inZoneNow = distToSafeZone <= this.safeZone.radius;
    if (inZoneNow !== this.inSafeZone) {
      this.inSafeZone = inZoneNow;
      EventBus.emit('safe-zone-status', this.inSafeZone);
    }
    if (this.inSafeZone && Phaser.Input.Keyboard.JustDown(this.saveKey)) {
      this.manualSave();
    }

    // Marchand : détecte l'entrée/sortie et gère l'ouverture du panneau (touche T)
    const distToMerchant = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.merchant.x, this.merchant.y);
    const nearMerchantNow = distToMerchant <= this.merchant.radius;
    if (nearMerchantNow !== this.nearMerchant) {
      this.nearMerchant = nearMerchantNow;
      EventBus.emit('merchant-nearby', this.nearMerchant);
      if (!this.nearMerchant && this.merchantPanelOpen) {
        this.merchantPanelOpen = false;
        EventBus.emit('merchant-panel', false);
      }
    }
    if (this.nearMerchant && Phaser.Input.Keyboard.JustDown(this.talkKey)) {
      this.merchantPanelOpen = !this.merchantPanelOpen;
      EventBus.emit('merchant-panel', this.merchantPanelOpen);
      if (this.merchantPanelOpen) this.emitStatsUpdate();
    }

    // Inventaire : touche I pour ouvrir/fermer
    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.inventoryOpen = !this.inventoryOpen;
      EventBus.emit('inventory-panel', this.inventoryOpen);
    }
  }

  // Tir générique : le visuel change selon le "kind" de l'arme (flèche pour
  // un arc, bille magique pour un bâton, projectile à énergie pour une arme
  // futuriste). Toute arme "ranged" future n'a qu'à ajouter un cas ici.
  spawnProjectile(x, y, angle, damage, isCrit, color, maxRange, kind) {
    const speed = 12;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const gfx = this.add.graphics();
    gfx.setPosition(x, y);
    gfx.setRotation(angle);
    gfx.setDepth(10);

    if (kind === 'staff') {
      gfx.fillStyle(color, 0.25);
      gfx.fillCircle(0, 0, 8);
      gfx.fillStyle(color, 1);
      gfx.fillCircle(0, 0, 4);
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(-1, -1, 1.5);
    } else if (kind === 'gun') {
      gfx.fillStyle(color, 0.3);
      gfx.fillRect(-8, -3, 16, 6);
      gfx.fillStyle(color, 1);
      gfx.fillRect(-6, -1.5, 12, 3);
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillRect(4, -1, 4, 2);
    } else {
      gfx.fillStyle(0x8b5a2b, 1);
      gfx.fillRect(-10, -1.5, 16, 3);
      gfx.fillStyle(color, 1);
      gfx.fillTriangle(6, -4, 6, 4, 13, 0);
      gfx.fillStyle(0xcccccc, 1);
      gfx.fillTriangle(-10, -3, -10, 3, -14, 0);
    }

    this.projectiles.push({
      sprite: gfx,
      x,
      y,
      startX: x,
      startY: y,
      maxRange: maxRange || 200,
      vx,
      vy,
      damage,
      isCrit,
      life: 90
    });
  }
}
