import Phaser from 'phaser';
import { StatsSystem } from '../systems/StatsSystem.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';

const MOVE_SPEED = 160;

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.stats = new StatsSystem();
    this.weapons = new WeaponSystem();
    this.lastAttackAt = 0;
    this.facing = 'down';

    this.sprite = scene.add.rectangle(x, y, 26, 34, 0x5ac8fa);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);

    this.weaponIndicator = scene.add.rectangle(x, y, 8, 8, this.weapons.equipped.color);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D');
    this.attackKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, enemies, onHitEnemy) {
    const body = this.sprite.body;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) { vx = -1; this.facing = 'left'; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { vx = 1; this.facing = 'right'; }
    if (this.cursors.up.isDown || this.wasd.W.isDown) { vy = -1; this.facing = 'up'; }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { vy = 1; this.facing = 'down'; }

    const len = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / len) * MOVE_SPEED, (vy / len) * MOVE_SPEED);

    this.weaponIndicator.x = this.sprite.x + (this.facing === 'left' ? -18 : this.facing === 'right' ? 18 : 0);
    this.weaponIndicator.y = this.sprite.y + (this.facing === 'up' ? -18 : this.facing === 'down' ? 18 : 0);
    this.weaponIndicator.fillColor = this.weapons.equipped.color;

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.tryAttack(time, enemies, onHitEnemy);
    }
  }

  tryAttack(time, enemies, onHitEnemy) {
    if (time - this.lastAttackAt < this.weapons.attackCooldownMs) return;
    this.lastAttackAt = time;

    const range = this.weapons.attackRange;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist <= range) {
        const isCrit = Math.random() < this.weapons.critChance;
        const rawDamage = this.weapons.attackDamage + this.stats.totalAtk - enemy.def;
        const damage = Math.max(1, Math.round(isCrit ? rawDamage * 1.8 : rawDamage));
        onHitEnemy(enemy, damage, isCrit);
      }
    }
  }

  equipWeapon(weapon) {
    this.weapons.equip(weapon);
  }
}
