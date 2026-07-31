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
    this.safeZoneGfx = this.add.graphics();
    this.drawSafeZone();

    this.physics.add.overlap(this.player.sprite, this.enemyGroup, (playerSprite, enemySprite) =>
      this.handleEnemyContact(enemySprite), null, this);

    EventBus.on('equip-weapon', (weaponId) => {
      const weapon = this.player.weapons.equipFromInventory(weaponId);
      if (weapon) EventBus.emit('stats-updated', this.buildStatePayload());
    });

    EventBus.on('respawn-request', () => this.respawnPlayer());

    EventBus.on('reset-save-request', () => {
      SaveSystem.clear();
      window.location.reload();
    });

    EventBus.emit('stats-updated', this.buildStatePayload());
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

  manualSave() {
    const ok = SaveSystem.save(this.player);
    EventBus.emit('loot-log', {
      type: ok ? 'pickup' : 'kill',
      text: ok ? 'Progression sauvegardée.' : 'Échec de la sauvegarde.'
    });
    if (ok) EventBus.emit('save-flash');
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
        let x, y;
        do {
          x = Phaser.Math.Between(100, WORLD_W - 100);
          y = Phaser.Math.Between(100, WORLD_H - 100);
        } while (Phaser.Math.Distance.Between(x, y, this.safeZone.x, this.safeZone.y) < this.safeZone.radius + 40);

        const enemy = new Enemy(this, x, y, group.type);
        this.enemies.push(enemy);
        this.enemyGroup.add(enemy.sprite);
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
    EventBus.emit('stats-updated', this.buildStatePayload());

    if (result.died) this.handlePlayerDeath();
  }

  handlePlayerDeath() {
    if (this.playerIsDead) return;
    this.playerIsDead = true;
    this.player.sprite.body.setVelocity(0, 0);
    EventBus.emit('loot-log', { type: 'kill', text: 'Tu es mort.' });
  }

  respawnPlayer() {
    this.playerIsDead = false;
    this.player.stats.hp = this.player.stats.maxHp;
    this.player.sprite.setPosition(WORLD_W / 2, WORLD_H / 2);
    this.player.invulnerableUntil = this.time.now + 1200;
    this.player.hitFlashUntil = 0;
    EventBus.emit('loot-log', { type: 'pickup', text: 'Respawn effectué.' });
    EventBus.emit('stats-updated', this.buildStatePayload());
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

      this.time.delayedCall(1500, () => {
        this.enemyGroup.remove(enemy.sprite, true, false);
        enemy.destroy();
        this.enemies = this.enemies.filter((e) => e !== enemy);
      });
    }

    EventBus.emit('stats-updated', this.buildStatePayload());
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
    EventBus.emit('stats-updated', this.buildStatePayload());
  }

  buildStatePayload() {
    const { stats, weapons } = this.player;
    return {
      level: stats.level,
      hp: stats.hp,
      maxHp: stats.maxHp,
      xp: stats.xp,
      xpToNext: stats.xpToNext,
      atk: stats.totalAtk,
      def: stats.totalDef,
      equipped: weapons.equipped,
      inventory: weapons.inventory
    };
  }

  update(time) {
    if (this.playerIsDead) return;

    this.player.update(time, this.enemies, (enemy, dmg, crit) => this.onHitEnemy(enemy, dmg, crit));
    for (const enemy of this.enemies) {
      enemy.update(time, this.player.x, this.player.y, (amount) => this.damagePlayer(amount));
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

    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E))) {
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
      // Bille d'énergie avec un léger halo
      gfx.fillStyle(color, 0.25);
      gfx.fillCircle(0, 0, 8);
      gfx.fillStyle(color, 1);
      gfx.fillCircle(0, 0, 4);
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(-1, -1, 1.5);
    } else if (kind === 'gun') {
      // Projectile à énergie allongé
      gfx.fillStyle(color, 0.3);
      gfx.fillRect(-8, -3, 16, 6);
      gfx.fillStyle(color, 1);
      gfx.fillRect(-6, -1.5, 12, 3);
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillRect(4, -1, 4, 2);
    } else {
      // Flèche (par défaut, notamment pour "bow")
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
