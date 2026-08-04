import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { LootSystem } from '../systems/LootSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { EventBus } from '../EventBus.js';
import { WORLD_W, WORLD_H, TOWN, TOWN_CENTER, BUILDINGS, GATES, ZONES } from '../data/zones.js';

const GATE_DIRECTIONS = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.add.grid(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 40, 40, 0x14141f, 1, 0x1e1e2c, 1);

    this.inSafeZone = false;
    const saveBuilding = BUILDINGS.find((b) => b.savePoint);
    this.savePoint = saveBuilding || null;
    this.saveRadius = 96;

    const merchantBuilding = BUILDINGS.find((b) => b.functional);
    this.merchant = { x: merchantBuilding.x, y: merchantBuilding.y, radius: 55 };
    this.nearMerchant = false;
    this.merchantPanelOpen = false;
    this.inventoryOpen = false;

    this.enterableBuildings = BUILDINGS.filter((b) => !b.functional);
    this.nearBuilding = null;

    this.drawWorldMap();
    this.drawTown();

    this.enemies = [];
    this.enemyGroup = this.physics.add.group();
    this.spawnAllZones();

    this.lootDrops = [];
    this.projectiles = [];

    this.player = new Player(this, TOWN_CENTER.x, TOWN_CENTER.y);
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

  // Régions sauvages (biomes) : fond coloré + libellé, dessinés une fois.
  drawWorldMap() {
    const g = this.add.graphics();
    for (const zone of ZONES) {
      g.fillStyle(zone.color, 0.16);
      g.fillEllipse(zone.x, zone.y, zone.radiusX * 2, zone.radiusY * 2);
      g.lineStyle(2, zone.color, 0.4);
      g.strokeEllipse(zone.x, zone.y, zone.radiusX * 2, zone.radiusY * 2);

      this.add.text(zone.x, zone.y - 12, zone.label, {
        fontSize: '26px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0.5);
      this.add.text(zone.x, zone.y + 18, zone.flavor, {
        fontSize: '15px', color: '#cccccc', fontFamily: 'monospace'
      }).setOrigin(0.5).setAlpha(0.4);
    }
  }

  // Ville praticable : sol distinct, bâtiments, portes vers chaque biome.
  drawTown() {
    const g = this.add.graphics();
    const w = TOWN.x2 - TOWN.x1;
    const h = TOWN.y2 - TOWN.y1;

    g.fillStyle(0x2a2a1f, 1);
    g.fillRect(TOWN.x1, TOWN.y1, w, h);

    // Chemins de terre et place centrale
    g.fillStyle(0x5e5037, 1);
    g.fillRect(TOWN_CENTER.x - 30, TOWN.y1, 60, h);
    g.fillRect(TOWN.x1, TOWN_CENTER.y - 28, w, 56);
    g.fillCircle(TOWN_CENTER.x, TOWN_CENTER.y, 44);
    g.fillStyle(0x4f432f, 1);
    g.fillCircle(TOWN_CENTER.x, TOWN_CENTER.y, 34);

    const roadWidth = 18;
    for (const b of BUILDINGS) {
      const dx = b.x - TOWN_CENTER.x;
      const dy = b.y - TOWN_CENTER.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        g.fillRect(Math.min(b.x, TOWN_CENTER.x) - roadWidth / 2, b.y - roadWidth / 2, Math.abs(dx) + roadWidth, roadWidth);
      } else {
        g.fillRect(b.x - roadWidth / 2, Math.min(b.y, TOWN_CENTER.y) - roadWidth / 2, roadWidth, Math.abs(dy) + roadWidth);
      }
    }

    g.lineStyle(3, 0xffb200, 0.5);
    g.strokeRect(TOWN.x1, TOWN.y1, w, h);

    this.add.text(TOWN_CENTER.x, TOWN.y1 - 40, TOWN.label, {
      fontSize: '24px', color: '#ffd23d', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Bâtiments décoratifs
    for (const b of BUILDINGS) {
      g.fillStyle(b.color, 1);
      g.fillRect(b.x - 40, b.y - 24, 80, 48);
      g.fillStyle(0x1a1a14, 1);
      g.fillTriangle(b.x - 46, b.y - 24, b.x + 46, b.y - 24, b.x, b.y - 58);
      g.fillStyle(0x272218, 1);
      g.fillRect(b.x - 14, b.y - 8, 28, 32);
      g.fillStyle(0x5c4d3b, 1);
      g.fillRect(b.x - 38, b.y + 4, 18, 10);
      g.fillRect(b.x + 20, b.y + 4, 18, 10);
      if (b.savePoint) {
        g.fillStyle(0xffd23d, 0.16);
        g.fillCircle(b.x, b.y, this.saveRadius - 12);
        g.fillStyle(0xffd23d, 1);
        g.fillRect(b.x - 18, b.y + 28, 36, 6);
      }

      this.add.text(b.x, b.y + 34, b.label, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(b.x, b.y + 50, b.desc, {
        fontSize: '10px', color: '#999999', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    // Portes et sentiers vers l'extérieur
    for (const gate of GATES) {
      const [dx, dy] = GATE_DIRECTIONS[gate.direction];
      const pathEnd = { x: gate.x + dx * 42, y: gate.y + dy * 42 };

      g.lineStyle(20, 0x5e5037, 1);
      g.beginPath();
      g.moveTo(gate.x, gate.y);
      g.lineTo(pathEnd.x, pathEnd.y);
      g.strokePath();

      g.fillStyle(0xffd23d, 0.8);
      g.fillCircle(gate.x, gate.y, 8);
      g.fillStyle(0x8a6d3a, 1);
      g.fillRect(pathEnd.x - 12, pathEnd.y - 6, 24, 12);

      const zone = ZONES.find((z) => z.id === gate.targetZone);
      this.add.text(gate.x + dx * 28, gate.y + dy * 28, `→ ${zone.label}`, {
        fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5);
    }
  }

  drawMerchant() {
    const g = this.merchantGfx;
    const { x, y } = this.merchant;
    g.clear();
    g.fillStyle(0x6b4f2a, 1);
    g.fillTriangle(x - 12, y + 16, x + 12, y + 16, x, y - 10);
    g.fillStyle(0xd9c39a, 1);
    g.fillCircle(x, y - 16, 7);
    g.fillStyle(0x3a2a1a, 1);
    g.fillTriangle(x - 9, y - 14, x + 9, y - 14, x, y - 26);
    g.fillStyle(0x5a4632, 1);
    g.fillRect(x - 18, y + 18, 36, 5);
    g.fillRect(x - 16, y + 23, 3, 8);
    g.fillRect(x + 13, y + 23, 3, 8);
  }

  enterBuilding(building) {
    const returnPos = { x: this.player.x, y: this.player.y };
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.launch('Interior', { building, returnPos });
      this.scene.pause();
    });
  }

  manualSave() {
    const ok = SaveSystem.save(this.player);
    EventBus.emit('loot-log', {
      type: ok ? 'pickup' : 'kill',
      text: ok ? 'Progression sauvegardée.' : 'Échec de la sauvegarde.'
    });
    if (ok) EventBus.emit('save-flash');
  }

  isInTown(x, y) {
    return x >= TOWN.x1 && x <= TOWN.x2 && y >= TOWN.y1 && y <= TOWN.y2;
  }

  isInSavePoint(x, y) {
    if (!this.savePoint) return false;
    return Phaser.Math.Distance.Between(x, y, this.savePoint.x, this.savePoint.y) <= this.saveRadius;
  }

  // Repousse un point hors de la ville, vers le bord le plus proche.
  pushOutOfTown(x, y) {
    const distLeft = x - TOWN.x1;
    const distRight = TOWN.x2 - x;
    const distTop = y - TOWN.y1;
    const distBottom = TOWN.y2 - y;
    const min = Math.min(distLeft, distRight, distTop, distBottom);

    if (min === distLeft) return { x: TOWN.x1 - 6, y };
    if (min === distRight) return { x: TOWN.x2 + 6, y };
    if (min === distTop) return { x, y: TOWN.y1 - 6 };
    return { x, y: TOWN.y2 + 6 };
  }

  randomPositionInZone(zone) {
    if (!zone) return { x: Phaser.Math.Between(100, WORLD_W - 100), y: Phaser.Math.Between(100, WORLD_H - 100) };
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    return {
      x: zone.x + Math.cos(angle) * zone.radiusX * r,
      y: zone.y + Math.sin(angle) * zone.radiusY * r
    };
  }

  spawnSingleEnemy(typeKey, x, y, zoneId) {
    const enemy = new Enemy(this, x, y, typeKey);
    enemy.zoneId = zoneId || null;
    this.enemies.push(enemy);
    this.enemyGroup.add(enemy.sprite);
    return enemy;
  }

  spawnAllZones() {
    for (const zone of ZONES) {
      for (const spawn of zone.enemyPool) {
        for (let i = 0; i < spawn.count; i++) {
          const { x, y } = this.randomPositionInZone(zone);
          this.spawnSingleEnemy(spawn.type, x, y, zone.id);
        }
      }
    }
  }

  handleEnemyContact(enemySprite) {
    const enemy = this.enemies.find((e) => e.sprite === enemySprite);
    if (!enemy || enemy.dead) return;
    this.damagePlayer(enemy.atk);
  }

  damagePlayer(amount) {
    if (this.player.stats.hp <= 0) return;
    const result = this.player.takeDamage(amount, this.time.now);
    if (!result) return;

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

    this.player.sprite.setPosition(TOWN_CENTER.x, TOWN_CENTER.y);
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
      const zoneId = enemy.zoneId;
      const zone = ZONES.find((z) => z.id === zoneId);
      const respawnDelayMs = isBoss ? 5 * 60 * 1000 : 30 * 1000;

      this.time.delayedCall(1500, () => {
        this.enemyGroup.remove(enemy.sprite, true, false);
        enemy.destroy();
        this.enemies = this.enemies.filter((e) => e !== enemy);
      });

      this.time.delayedCall(respawnDelayMs, () => {
        const { x, y } = this.randomPositionInZone(zone);
        this.spawnSingleEnemy(typeKey, x, y, zoneId);
        if (isBoss) {
          EventBus.emit('loot-log', { type: 'kill', text: `Le Gardien Rouille est réapparu dans ${zone ? zone.label : 'la zone'}.` });
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

    // Barrière invisible : aucun ennemi ne peut entrer dans la ville
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (this.isInTown(enemy.x, enemy.y)) {
        const { x, y } = this.pushOutOfTown(enemy.x, enemy.y);
        enemy.sprite.setPosition(x, y);
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

    // Bâtiments visitables : détecte la proximité et gère l'entrée (touche E),
    // prioritaire sur le ramassage de loot si les deux sont possibles au même endroit.
    const closeBuilding = this.enterableBuildings.find(
      (b) => Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y) <= 55
    );
    if (closeBuilding !== this.nearBuilding) {
      this.nearBuilding = closeBuilding || null;
      EventBus.emit('building-nearby', this.nearBuilding ? this.nearBuilding.label : null);
    }

    if (Phaser.Input.Keyboard.JustDown(this.pickupKey)) {
      if (this.nearBuilding) {
        this.enterBuilding(this.nearBuilding);
      } else {
        this.tryPickupLoot();
      }
    }

    const inZoneNow = this.isInSavePoint(this.player.x, this.player.y);
    if (inZoneNow !== this.inSafeZone) {
      this.inSafeZone = inZoneNow;
      EventBus.emit('safe-zone-status', this.inSafeZone);
    }
    if (this.inSafeZone && Phaser.Input.Keyboard.JustDown(this.saveKey)) {
      this.manualSave();
    }

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

    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.inventoryOpen = !this.inventoryOpen;
      EventBus.emit('inventory-panel', this.inventoryOpen);
    }
  }

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
