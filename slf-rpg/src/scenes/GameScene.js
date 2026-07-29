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

    this.add.grid(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 40, 40, 0x14141f, 1, 0x1e1e2c, 1);

    this.enemies = [];
    this.enemyGroup = this.physics.add.group();
    this.spawnEnemies();

    this.lootDrops = [];
    this.arrows = [];

    this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    this.physics.add.overlap(this.player.sprite, this.enemyGroup, (playerSprite, enemySprite) =>
      this.handleEnemyContact(enemySprite), null, this);

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
    EventBus.emit('loot-log', { type: 'kill', text: 'Tu es mort — recharge la page pour recommencer.' });
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

    // Gestion des flèches en vol
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      
      // Utilisation directe d'une vitesse en pixels/frame (ex: 12 pixels par frame)
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;
      
      // Mise à jour de la position visuelle
      if (arrow.sprite && arrow.sprite.setActive) {
        arrow.sprite.setPosition(arrow.x, arrow.y);
      }
      
      arrow.life--;

      // Collision avec les ennemis
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const dist = Phaser.Math.Distance.Between(arrow.x, arrow.y, enemy.x, enemy.y);
        if (dist < 18) {
          const enemyDamage = Math.max(1, arrow.damage - enemy.def);
          this.onHitEnemy(enemy, enemyDamage, arrow.isCrit);
          arrow.sprite.destroy();
          this.arrows.splice(i, 1);
          break;
        }
      }

      // Destruction si la flèche expire
      if (arrow.life <= 0) {
        if (arrow.sprite) arrow.sprite.destroy();
        this.arrows.splice(i, 1);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E))) {
      this.tryPickupLoot();
    }
  }

  spawnArrow(x, y, angle, damage, isCrit, color) {
    const speed = 12;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const gfx = this.add.graphics();
    gfx.setPosition(x, y);
    gfx.setRotation(angle);
    gfx.setDepth(10); // Force la flèche à s'afficher au premier plan

    // Hampe
    gfx.fillStyle(0x8b5a2b, 1);
    gfx.fillRect(-10, -1.5, 16, 3);
    
    // Pointe
    gfx.fillStyle(color, 1);
    gfx.fillTriangle(6, -4, 6, 4, 13, 0);

    // Empennage
    gfx.fillStyle(0xcccccc, 1);
    gfx.fillTriangle(-10, -3, -10, 3, -14, 0);

    this.arrows.push({
      sprite: gfx,
      x,
      y,
      vx,
      vy,
      damage,
      isCrit,
      life: 60
    });
  }
}
