import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.jsx';
import { LootSystem } from '../systems/LootSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { EventBus } from '../EventBus.js';
import { WORLD_W, WORLD_H, TOWN, TOWN_CENTER, BUILDINGS, GATES, ZONES } from '../data/zones.js';

const HUB_LINE_COLOR = 0xffd23d;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Expose la définition de la ville à d'autres systèmes (DecorSystem, etc.)
    this.TOWN = TOWN;
    this.TOWN_CENTER = TOWN_CENTER;

    this.add.grid(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 40, 40, 0x14141f, 1, 0x1e1e2c, 1);

    // Safe zone (Havre-du-Départ) : seul endroit où sauvegarder, manuellement (touche F).
    this.safeZone = { x: TOWN_CENTER.x, y: TOWN_CENTER.y, radius: 120 };
    this.inSafeZone = false;
    const saveBuilding = BUILDINGS.find((b) => b.savePoint);
    this.savePoint = saveBuilding || null;
    this.saveRadius = 96;

    // Marchand : positionné à l'intérieur de son propre bâtiment
    const merchantBuilding = BUILDINGS.find((b) => b.id === 'marchand' || b.id === 'boutique' || b.id === 'shop');
    const merchantX = merchantBuilding ? merchantBuilding.x : TOWN_CENTER.x + 150;
    const merchantY = merchantBuilding ? merchantBuilding.y : TOWN_CENTER.y;
    
    this.merchant = { x: merchantX, y: merchantY, radius: 45 };
    this.nearMerchant = false;
    this.merchantPanelOpen = false;
    this.inventoryOpen = false;
    this.enterableBuildings = BUILDINGS;
    
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

    // --- Écouteurs d'événements globaux unifiés ---
    EventBus.on('equip-weapon', (weaponId) => {
      const weapon = this.player.weapons.equipFromInventory(weaponId);
      if (weapon) this.emitStatsUpdate();
    });

    EventBus.on('buy-item', (item) => {
      this.buyItem(item);
    });

    EventBus.on('sell-weapon', (weaponId) => {
      const value = this.player.weapons.sellWeapon(weaponId);
      if (value > 0) {
        this.player.gold += value;
        EventBus.emit('loot-log', { type: 'pickup', text: `Vendu pour ${value} or.` });
        this.emitStatsUpdate();
      }
    });

    EventBus.on('repair-weapon', (weaponId) => {
      this.repairWeapon(weaponId);
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

    // --- États des panneaux (Forge & Commerçant) ---
    this.isForgeOpen = false;
    this.forgeMode = 'repair';

    EventBus.on('forge-craft-panel', ({ open, mode }) => {
      this.isForgeOpen = open;
      if (mode) this.forgeMode = mode;
    });

    EventBus.on('forge-tab', (mode) => {
      this.forgeMode = mode;
    });

    this.isMerchantOpen = false;
    this.merchantMode = 'buy';

    EventBus.on('merchant-shop-panel', ({ open, mode }) => {
      this.isMerchantOpen = open;
      if (mode) this.merchantMode = mode;
    });

    EventBus.on('merchant-tab', (mode) => {
      this.merchantMode = mode;
    });

    this.emitStatsUpdate();
  }

  emitStatsUpdate() {
    EventBus.emit('stats-updated', this.buildStatePayload());
  }

  // --- LOGIQUE DE RÉPARATION (Pour la Forge) ---
  repairWeapon(weaponId) {
    const weapon = this.player.weapons.inventory.find(w => w.id === weaponId) || 
                   (this.player.weapons.equipped && this.player.weapons.equipped.id === weaponId ? this.player.weapons.equipped : null);
    
    if (!weapon) {
      EventBus.emit('loot-log', { type: 'kill', text: "Arme introuvable pour la réparation." });
      return;
    }

    const repairCost = 15;
    if (this.player.gold < repairCost) {
      EventBus.emit('loot-log', { type: 'kill', text: "Pas assez d'or pour réparer cette arme !" });
      return;
    }

    this.player.gold -= repairCost;
    weapon.durability = weapon.maxDurability || 100;
    
    EventBus.emit('loot-log', { type: 'pickup', text: `Arme réparée pour ${repairCost} or !` });
    this.emitStatsUpdate();
  }

  // --- LOGIQUE D'ACHAT (Pour le Commerçant - Onglet Achat) ---
  buyItem(itemTemplate) {
    const cost = itemTemplate.cost || 50;
    if (this.player.gold < cost) {
      EventBus.emit('loot-log', { type: 'kill', text: "Vous n'avez pas assez d'or pour acheter ceci." });
      return;
    }

    this.player.gold -= cost;
    this.player.weapons.addToInventory(itemTemplate);
    
    EventBus.emit('loot-log', { type: 'pickup', text: `Achat réussi : ${itemTemplate.name} !` });
    this.emitStatsUpdate();
  }
  
  // Dessine les régions du monde
  drawWorldMap() {
    const g = this.add.graphics();

    for (const zone of ZONES) {
      g.lineStyle(2, HUB_LINE_COLOR, 0.25);
      g.beginPath();
      g.moveTo(TOWN_CENTER.x, TOWN_CENTER.y);
      g.lineTo(zone.x, zone.y);
      g.strokePath();
    }

    for (const zone of ZONES) {
      g.fillStyle(zone.color, zone.locked ? 0.12 : 0.22);
      g.fillEllipse(zone.x, zone.y, zone.radiusX * 2, zone.radiusY * 2);
      g.lineStyle(2, zone.color, zone.locked ? 0.3 : 0.55);
      g.strokeEllipse(zone.x, zone.y, zone.radiusX * 2, zone.radiusY * 2);

      const label = this.add.text(zone.x, zone.y - 12, zone.label, {
        fontSize: '20px', color: zone.locked ? '#888888' : '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0.85);

      const subLabel = zone.locked ? zone.lockedReason : zone.flavor;
      this.add.text(zone.x, zone.y + 14, subLabel, {
        fontSize: '13px', color: zone.locked ? '#666666' : '#cccccc', fontFamily: 'monospace'
      }).setOrigin(0.5).setAlpha(0.75);
    }

    this.add.text(TOWN_CENTER.x, TOWN_CENTER.y - 120 - 22, TOWN.label, {
      fontSize: '18px', color: '#ffd23d', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  drawSafeZone() {
    const g = this.safeZoneGfx;
    const { x, y, radius } = this.safeZone;
    g.clear();
    g.fillStyle(0xffb200, 0.08);
    g.fillCircle(x, y, radius);
    g.lineStyle(2, 0xffb200, 0.6);
    g.strokeCircle(x, y, radius);

    g.fillStyle(0x5a4632, 1);
    g.fillRect(x - 10, y + 6, 20, 4);
    g.fillStyle(0xff8c00, 1);
    g.fillTriangle(x - 7, y + 6, x + 7, y + 6, x, y - 10);
    g.fillStyle(0xffd23d, 1);
    g.fillTriangle(x - 3, y + 6, x + 3, y + 6, x, y - 3);
  }

  drawTown() {
    const g = this.add.graphics();
    const w = TOWN.x2 - TOWN.x1;
    const h = TOWN.y2 - TOWN.y1;

    g.fillStyle(0x2a2a1f, 1);
    g.fillRect(TOWN.x1, TOWN.y1, w, h);

    g.fillStyle(0x5e5037, 1);
    g.fillRect(TOWN_CENTER.x - 30, TOWN.y1, 60, h);
    g.fillRect(TOWN.x1, TOWN_CENTER.y - 28, w, 56);
    g.fillCircle(TOWN_CENTER.x, TOWN_CENTER.y, 44);
    g.fillStyle(0x4f432f, 1);
    g.fillCircle(TOWN_CENTER.x, TOWN_CENTER.y, 34);

    g.fillStyle(0x60462e, 1);
    const benchY = TOWN_CENTER.y - 120;
    for (let dx of [-120, 120]) {
      g.fillRect(TOWN_CENTER.x + dx - 22, benchY, 44, 8);
      g.fillRect(TOWN_CENTER.x + dx - 18, benchY - 18, 4, 18);
      g.fillRect(TOWN_CENTER.x + dx + 14, benchY - 18, 4, 18);
    }

    g.fillStyle(0x3c2c20, 1);
    for (let i = 0; i < 4; i++) {
      const px = TOWN_CENTER.x - 180 + i * 120;
      g.fillRect(px - 3, TOWN_CENTER.y - 250, 6, 80);
      g.fillStyle(0xffd86a, 0.75);
      g.fillCircle(px, TOWN_CENTER.y - 254, 10);
      g.fillStyle(0x3c2c20, 1);
    }

    const roadWidth = 18;
    for (const b of BUILDINGS) {
      if (b.isDecor) continue;
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

    const fx = TOWN_CENTER.x;
    const fy = TOWN_CENTER.y;

    g.fillStyle(0x5b616b, 1);
    g.fillCircle(fx, fy, 95);
    g.lineStyle(4, 0x3d4249, 1);
    g.strokeCircle(fx, fy, 95);

    g.fillStyle(0x1d6a96, 1);
    g.fillCircle(fx, fy, 82);

    g.fillStyle(0x6e7681, 1);
    g.fillCircle(fx, fy, 56);
    g.fillStyle(0x288bc4, 1);
    g.fillCircle(fx, fy, 46);

    g.fillStyle(0x8c95a1, 1);
    g.fillCircle(fx, fy, 30);
    g.fillStyle(0x4fbbf7, 1);
    g.fillCircle(fx, fy, 22);

    g.fillStyle(0xa5d6ff, 1);
    g.fillCircle(fx, fy - 4, 12);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(fx, fy - 6, 6);

    this.add.text(fx, fy + 105, 'Grande Fontaine', {
      fontSize: '13px', color: '#8be9fd', fontFamily: 'monospace', fontStyle: 'bold', backgroundColor: '#000000aa', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    for (const b of BUILDINGS) {
      if (b.isDecor) continue;

      const bw = 140;
      const bh = 96;
      g.fillStyle(b.color, 1);
      g.fillRect(b.x - bw / 2, b.y - bh / 2 + 8, bw, bh - 8);
      g.fillStyle(0x1a1a14, 1);
      g.fillTriangle(b.x - (bw / 2 + 6), b.y - bh / 2 + 8, b.x + (bw / 2 + 6), b.y - bh / 2 + 8, b.x, b.y - bh / 2 - 30);
      g.fillStyle(0x272218, 1);
      g.fillRect(b.x - Math.round(bw * 0.175), b.y - Math.round(bh * 0.08), Math.round(bw * 0.35), Math.round(bh * 0.65));
      g.fillStyle(0x5c4d3b, 1);
      g.fillRect(b.x - Math.round(bw * 0.475), b.y + Math.round(bh * 0.04), Math.round(bw * 0.125), Math.round(bh * 0.1));
      g.fillRect(b.x + Math.round(bw * 0.325), b.y + Math.round(bh * 0.04), Math.round(bw * 0.125), Math.round(bh * 0.1));
      g.fillStyle(0xe1c278, 1);
      g.fillRect(b.x - Math.round(bw * 0.325), b.y - Math.round(bh * 0.125), Math.round(bw * 0.15), Math.round(bh * 0.125));
      g.fillRect(b.x + Math.round(bw * 0.175), b.y - Math.round(bh * 0.125), Math.round(bw * 0.15), Math.round(bh * 0.125));
      g.fillStyle(0x42341f, 1);
      g.fillRect(b.x - Math.round(bw * 0.12), b.y + Math.round(bh * 0.08), Math.round(bw * 0.24), Math.round(bh * 0.2));
      g.fillStyle(0x593e2d, 1);
      g.fillRect(b.x - Math.round(bw * 0.285), b.y - Math.round(bh * 0.2), Math.round(bw * 0.57), Math.round(bh * 0.1));
      g.fillStyle(0x3a2c20, 1);
      g.fillRect(b.x - Math.round(bw * 0.075), b.y - Math.round(bh * 0.23), Math.round(bw * 0.15), Math.round(bh * 0.06));
      g.fillStyle(0x4b3424, 1);
      g.fillRect(b.x - Math.round(bw * 0.025), b.y - Math.round(bh * 0.16), Math.round(bw * 0.05), Math.round(bh * 0.07));
      if (b.id === 'taverne') {
        g.fillStyle(0x3f2b2b, 1);
        g.fillRect(b.x - Math.round(bw * 0.34), b.y - Math.round(bh * 0.62), Math.round(bw * 0.68), Math.round(bh * 0.14));
        g.fillStyle(0xffd23d, 1);
        g.fillRect(b.x - Math.round(bw * 0.2), b.y - Math.round(bh * 0.56), Math.round(bw * 0.4), Math.round(bh * 0.03));
      }

      this.add.text(b.x, b.y + Math.round(bh * 0.4), b.label, {
        fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(b.x, b.y + Math.round(bh * 0.6), b.desc, {
        fontSize: '11px', color: '#cccccc', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }
  } 

  drawMerchant() {
    const g = this.merchantGfx;
    if (!g) return;
    g.clear();
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

  randomPositionInZone(zone) {
    let x, y;
    let attempts = 0;
    do {
      if (zone) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random();
        x = zone.x + Math.cos(angle) * zone.radiusX * r;
        y = zone.y + Math.sin(angle) * zone.radiusY * r;
      } else {
        x = Phaser.Math.Between(100, WORLD_W - 100);
        y = Phaser.Math.Between(100, WORLD_H - 100);
      }
      attempts++;
    } while (
      Phaser.Math.Distance.Between(x, y, this.safeZone.x, this.safeZone.y) < this.safeZone.radius + 40 &&
      attempts < 20
    );
    return { x, y };
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
      if (zone.locked) continue;
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

      // 1. Gestion de l'XP du joueur
      const leveledUp = this.player.stats.gainXp(enemy.xp);
      EventBus.emit('loot-log', { type: 'kill', text: `${enemy.typeKey} vaincu (+${enemy.xp} XP)` });
      if (leveledUp) EventBus.emit('level-up', this.player.stats.level);

      // 2. Gestion de l'XP de l'arme équipée
      if (this.player.weapons && typeof this.player.weapons.addWeaponXp === 'function') {
        const weaponLevelUp = this.player.weapons.addWeaponXp(enemy.xp);
        if (weaponLevelUp) {
          EventBus.emit('loot-log', { 
            type: 'pickup', 
            text: `Ton arme (${weaponLevelUp.name}) est passée niveau ${weaponLevelUp.level} !` 
          });
        }
      }

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

  isInTown(x, y) {
    return (
      x >= TOWN.x1 &&
      x <= TOWN.x2 &&
      y >= TOWN.y1 &&
      y <= TOWN.y2
    );
  }

  pushOutOfTown(x, y) {
    const distLeft = Math.abs(x - TOWN.x1);
    const distRight = Math.abs(x - TOWN.x2);
    const distTop = Math.abs(y - TOWN.y1);
    const distBottom = Math.abs(y - TOWN.y2);

    const min = Math.min(distLeft, distRight, distTop, distBottom);

    if (min === distLeft) return { x: TOWN.x1 - 10, y };
    if (min === distRight) return { x: TOWN.x2 + 10, y };
    if (min === distTop) return { x, y: TOWN.y1 - 10 };
    return { x, y: TOWN.y2 + 10 };
  }
  
  update(time) {
    if (this.playerIsDead) return;

    if (this.decorSystem) this.decorSystem.update(time);

    this.player.update(time, this.enemies, (enemy, dmg, crit) => this.onHitEnemy(enemy, dmg, crit));
    for (const enemy of this.enemies) {
      enemy.update(time, this.player.x, this.player.y, (amount) => this.damagePlayer(amount), this.inSafeZone);
    }

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (this.isInTown(enemy.x, enemy.y)) {
        const { x, y } = this.pushOutOfTown(enemy.x, enemy.y);
        enemy.sprite.setPosition(x, y);
        enemy.sprite.body.setVelocity(0, 0);
      }
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

    const distToSafeZone = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.safeZone.x, this.safeZone.y);
    const inZoneNow = distToSafeZone <= this.safeZone.radius;
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
