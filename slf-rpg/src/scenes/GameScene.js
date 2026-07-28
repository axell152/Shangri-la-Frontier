import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { LootSystem } from '../systems/LootSystem.js';
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

    // Simple ground so the world doesn't feel like a void.
    this.add.grid(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 40, 40, 0x14141f, 1, 0x1e1e2c, 1);

    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    this.enemies = [];
    this.spawnEnemies();

    this.lootDrops = []; // { sprite, weapon }

    this.physics.add.overlap(this.player.sprite, this.enemies.map((e) => e.sprite), null, null, this);

    this.input.keyboard.on('keydown-E', () => this.tryPickupLoot());

    EventBus.on('equip-weapon', (weaponId) => {
      const weapon = this.player.weapons.equipFromInventory(weaponId);
      if (weapon) EventBus.emit('stats-updated', this.buildStatePayload());
    });

    EventBus.emit('stats-updated', this.buildStatePayload());
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
        const x = Phaser.Math.Between(100, WORLD_W - 100);
        const y = Phaser.Math.Between(100, WORLD_H - 100);
        this.enemies.push(new Enemy(this, x, y, group.type));
      }
    }
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

    // Ajoute l'arme à l'inventaire du joueur au lieu de l'équiper de force
    this.player.weapons.addToInventory(nearby.weapon);
    
    EventBus.emit('loot-log', { type: 'pickup', text: `Inventaire + : ${nearby.weapon.rarityLabel} ${nearby.weapon.name}` });
    
    nearby.sprite.destroy();
    this.lootDrops = this.lootDrops.filter((d) => d !== nearby);
    
    // Met à jour l'interface / les stats globales
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
    this.player.update(time, this.enemies, (enemy, dmg, crit) => this.onHitEnemy(enemy, dmg, crit));
    
    for (const enemy of this.enemies) {
      enemy.update(time, this.player.x, this.player.y);
    }

    // Vérification en continu de l'appui sur la touche E dans l'update
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E))) {
      this.tryPickupLoot();
    }
  }
}
