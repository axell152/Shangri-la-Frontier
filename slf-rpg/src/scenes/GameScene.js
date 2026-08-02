import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { LootSystem } from '../systems/LootSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { EventBus } from '../EventBus.js';
import { WorldGenerator } from '../world/WorldGenerator.js';
import { WORLD_CONFIG } from '../world/worldConfig.js';
import { createPoiInteraction } from '../world/poi/poiSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.worldGenerator = new WorldGenerator(WORLD_CONFIG);
    this.worldState = this.worldGenerator.generate();

    this.physics.world.setBounds(0, 0, this.worldState.worldWidth, this.worldState.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldState.worldWidth, this.worldState.worldHeight);

    this.buildWorld();

    this.enemies = [];
    this.enemyGroup = this.physics.add.group();
    this.spawnEnemies();

    this.lootDrops = [];
    this.projectiles = [];
    this.inventoryOpen = false;

    const spawn = this.getInitialSpawn();
    this.player = new Player(this, spawn.x, spawn.y);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // Prevent player from walking on non-road tiles
    if (this.obstacleGroup) {
      this.physics.add.collider(this.player.sprite, this.obstacleGroup);
    }

    const save = SaveSystem.load();
    if (save) {
      SaveSystem.applyTo(this.player, save);
      EventBus.emit('loot-log', { type: 'pickup', text: 'Sauvegarde chargée.' });
    }

    this.inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.pickupKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Merchant buy handler
    EventBus.on('buy-weapon', (weaponId) => this.handleBuyWeapon(weaponId));
    EventBus.on('merchant-open', (inventory) => { this.currentMerchantInventory = inventory || null; });

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

  buildWorld() {
    this.worldTiles = [];
    const tileSize = this.worldState.tileSize;

    this.worldBg = this.add.rectangle(0, 0, this.worldState.worldWidth, this.worldState.worldHeight, 0x071018)
      .setOrigin(0, 0)
      .setDepth(-3);

    this.worldGraphics = this.add.graphics();
    this.worldGraphics.setDepth(-2);
    this.worldBorder = this.add.graphics();
    this.worldBorder.setDepth(-1);

    this.drawWorldBorder();

    // Create obstacle group for non-traversable tiles (everything except roads and plaza)
    this.obstacleGroup = this.physics.add.staticGroup();

    for (const cell of this.worldState.cells) {
      this.drawTile(cell, tileSize);
      if (cell.district !== 'road' && cell.district !== 'plaza') {
        const ox = cell.x + tileSize / 2;
        const oy = cell.y + tileSize / 2;
        const rect = this.add.rectangle(ox, oy, tileSize, tileSize, 0x000000, 0).setOrigin(0.5);
        this.physics.add.existing(rect, true);
        // ensure body matches tile size
        if (rect.body && rect.body.setSize) rect.body.setSize(tileSize, tileSize);
        this.obstacleGroup.add(rect);
      }
    }

    this.poiMarkers = [];
    for (const poi of this.worldState.pois) {
      let marker;
      // merchant / tavern / house show a small icon + letter
      if (poi.type === 'merchant' || poi.type === 'tavern' || poi.type === 'house') {
        marker = this.add.container(poi.x, poi.y).setDepth(2);
        const bg = this.add.circle(0, 0, 8, poi.color, 0.95);
        const label = poi.type === 'merchant' ? '$' : poi.type === 'tavern' ? 'T' : 'H';
        const text = this.add.text(0, 0, label, { fontSize: '10px', color: '#041018', fontFamily: 'monospace' }).setOrigin(0.5);
        marker.add([bg, text]);
      } else {
        marker = this.add.circle(poi.x, poi.y, 6, poi.color, 0.35).setStrokeStyle(1, 0xffffff, 0.35).setDepth(1);
      }
      this.poiMarkers.push(marker);
      this.poiInteractions = this.poiInteractions || [];
      this.poiInteractions.push(createPoiInteraction(poi));
    }
  }

  drawWorldBorder() {
    const g = this.worldBorder;
    g.clear();
    g.lineStyle(3, 0x23313a, 0.8);
    g.strokeRect(0, 0, this.worldState.worldWidth, this.worldState.worldHeight);
  }

  drawTile(cell, tileSize) {
    const g = this.worldGraphics;
    const { x, y } = cell;
    const inset = 2;

    if (cell.district === 'plaza') {
      g.fillStyle(0x4b3220, 1);
      g.fillRect(x, y, tileSize, tileSize);
      g.fillStyle(0x7b5a2f, 0.9);
      g.fillRect(x + 6, y + 6, tileSize - 12, tileSize - 12);
      g.lineStyle(2, 0xf2c96d, 0.7);
      g.strokeRect(x + 8, y + 8, tileSize - 16, tileSize - 16);
      return;
    }

    if (cell.district === 'road') {
      g.fillStyle(0x2d3136, 1);
      g.fillRect(x, y, tileSize, tileSize);
      g.fillStyle(0x5e6268, 0.8);
      g.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      g.lineStyle(1, 0x8b9096, 0.25);
      g.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
      return;
    }

    if (cell.district === 'building') {
      g.fillStyle(0x2f3b49, 1);
      g.fillRect(x, y, tileSize, tileSize);
      g.fillStyle(0x4e6479, 0.95);
      g.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
      g.fillStyle(0x7f97b0, 0.7);
      g.fillRect(x + 8, y + 8, 6, tileSize - 16);
      g.fillRect(x + tileSize - 14, y + 8, 6, tileSize - 16);
      g.fillRect(x + 8, y + 8, tileSize - 16, 6);
      g.fillRect(x + 8, y + tileSize - 14, tileSize - 16, 6);
      // small door centered at bottom
      g.fillStyle(0x3e2b1f, 1);
      g.fillRect(x + tileSize / 2 - 6, y + tileSize - 18, 12, 14);
      // possible sign above door
      g.fillStyle(0x9db7c9, 0.9);
      g.fillRect(x + tileSize / 2 - 14, y + 6, 28, 6);
      return;
    }

    g.fillStyle(this.getBiomeBaseColor(cell.biome), 1);
    g.fillRect(x, y, tileSize, tileSize);

    switch (cell.biome) {
      case 'water':
        g.fillStyle(0x2b6f91, 0.7);
        g.fillCircle(x + tileSize * 0.3, y + tileSize * 0.35, tileSize * 0.18);
        g.fillCircle(x + tileSize * 0.7, y + tileSize * 0.6, tileSize * 0.12);
        break;
      case 'marsh':
        g.fillStyle(0x4b7a4a, 0.75);
        g.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2);
        break;
      case 'grass':
        g.fillStyle(0x4e8c3d, 0.85);
        g.fillCircle(x + tileSize * 0.3, y + tileSize * 0.3, tileSize * 0.15);
        g.fillCircle(x + tileSize * 0.68, y + tileSize * 0.58, tileSize * 0.12);
        break;
      case 'forest':
        g.fillStyle(0x2f5d2b, 0.95);
        g.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2);
        break;
      case 'rock':
        g.fillStyle(0x6e665b, 0.95);
        g.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2);
        break;
      default:
        break;
    }

    g.lineStyle(1, 0x11161b, 0.2);
    g.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);
  }

  getBiomeBaseColor(biome) {
    switch (biome) {
      case 'water': return 0x18344d;
      case 'marsh': return 0x3a5b39;
      case 'grass': return 0x427a35;
      case 'forest': return 0x30592d;
      case 'rock': return 0x56504a;
      default: return 0x4a7a35;
    }
  }

  getInitialSpawn() {
    const configX = Number(WORLD_CONFIG.initialPlayerSpawn?.x);
    const configY = Number(WORLD_CONFIG.initialPlayerSpawn?.y);

    const cityCell = this.worldState.cells.find((cell) => cell.district === 'plaza')
      || this.worldState.cells.find((cell) => cell.district === 'road');

    if (cityCell) {
      return {
        x: cityCell.x + this.worldState.tileSize / 2,
        y: cityCell.y + this.worldState.tileSize / 2
      };
    }

    const x = Number.isFinite(configX) && configX > 0 ? configX : this.worldState.worldWidth / 2;
    const y = Number.isFinite(configY) && configY > 0 ? configY : this.worldState.worldHeight / 2;
    return { x, y };
  }

  emitStatsUpdate() {
    EventBus.emit('stats-updated', this.buildStatePayload());
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
    const walkable = this.worldState.cells.filter((cell) => cell.biome !== 'water');
    const cell = walkable[Math.floor(Math.random() * walkable.length)] || this.worldState.cells[0];
    return {
      x: cell.x + this.worldState.tileSize / 2,
      y: cell.y + this.worldState.tileSize / 2
    };
  }

  spawnSingleEnemy(typeKey, x, y) {
    const enemy = new Enemy(this, x, y, typeKey);
    this.enemies.push(enemy);
    this.enemyGroup.add(enemy.sprite);
    return enemy;
  }

  spawnEnemies() {
    const spawnCandidates = this.worldState.cells.filter((cell) => cell.biome !== 'water' && cell.district === 'wild');
    const baseCount = Math.max(2, Math.min(4, Math.floor(spawnCandidates.length / 30)));

    for (const cell of spawnCandidates.slice(0, Math.min(spawnCandidates.length, baseCount))) {
      const biomeKey = cell.biome;
      const enemyType = this.worldState.spawnRules?.find((rule) => rule.biome === biomeKey)?.enemyType || 'slime';
      const count = 1;

      for (let i = 0; i < count; i++) {
        const { x, y } = {
          x: cell.x + this.worldState.tileSize / 2,
          y: cell.y + this.worldState.tileSize / 2
        };
        this.spawnSingleEnemy(enemyType, x, y);
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

    const spawn = this.getInitialSpawn();
    this.player.sprite.setPosition(spawn.x, spawn.y);
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
    this.updatePoiInteractions();
    for (const enemy of this.enemies) {
      enemy.update(time, this.player.x, this.player.y, (amount) => this.damagePlayer(amount), false);
    }

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
      const nearbyPoi = this.poiInteractions?.find((poi) => Phaser.Math.Distance.Between(this.player.x, this.player.y, poi.x, poi.y) < 90);
      if (nearbyPoi && (nearbyPoi.type === 'merchant' || nearbyPoi.type === 'building')) {
        this.enterPoi(nearbyPoi);
      } else {
        this.tryPickupLoot();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.inventoryOpen = !this.inventoryOpen;
      EventBus.emit('inventory-panel', this.inventoryOpen);
    }
  }

  updatePoiInteractions() {
    const nearby = this.poiInteractions?.filter((poi) => {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, poi.x, poi.y);
      return distance < 90;
    }) || [];

    if (nearby.length > 0) {
      const currentPoi = nearby[0];
      EventBus.emit('poi-nearby', currentPoi);
      // Also notify merchant prompt separately for UI
      EventBus.emit('merchant-nearby', ['merchant', 'building'].includes(currentPoi.type));
    } else {
      EventBus.emit('poi-nearby', null);
    }
  }

  enterPoi(poi) {
    if (!poi) return;
    const returnPos = { x: poi.x, y: poi.y };
    // Fade camera then launch interior for smooth transition
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.launch('Interior', { poi, returnPos });
      this.scene.pause();
    });
    // Track current merchant inventory for buy operations
    this.currentMerchantInventory = poi.meta?.inventory || null;
  }

  handleBuyWeapon(weaponId) {
    if (!this.currentMerchantInventory) {
      EventBus.emit('loot-log', { type: 'kill', text: 'Aucun marchand disponible.' });
      return;
    }

    const idx = this.currentMerchantInventory.findIndex((w) => w.id === weaponId);
    if (idx === -1) {
      EventBus.emit('loot-log', { type: 'kill', text: 'Article introuvable.' });
      return;
    }

    const weapon = this.currentMerchantInventory[idx];
    const baseSell = this.player.weapons.getSellValue(weapon);
    const price = Math.max(1, Math.round(baseSell * 2.5));

    if (this.player.gold < price) {
      EventBus.emit('loot-log', { type: 'kill', text: 'Pas assez d\'or.' });
      return;
    }

    this.player.gold -= price;
    this.player.weapons.addToInventory(weapon);
    // remove from merchant stock
    this.currentMerchantInventory.splice(idx, 1);

    EventBus.emit('loot-log', { type: 'pickup', text: `Acheté : ${weapon.rarityLabel} ${weapon.name} pour ${price} or` });
    EventBus.emit('merchant-open', this.currentMerchantInventory);
    this.emitStatsUpdate();
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
