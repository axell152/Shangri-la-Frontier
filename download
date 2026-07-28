import Phaser from 'phaser';
import { ENEMY_TYPES } from '../data/enemies.js';

export class Enemy {
  constructor(scene, x, y, typeKey) {
    this.scene = scene;
    this.typeKey = typeKey;
    const def = ENEMY_TYPES[typeKey];
    this.def = def.def;
    this.atk = def.atk;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.xp = def.xp;
    this.lootTier = def.lootTier;
    this.speed = def.speed;
    this.dead = false;

    this.sprite = scene.add.rectangle(x, y, def.size, def.size, def.color);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);

    this.hpBarBg = scene.add.rectangle(x, y - def.size / 2 - 8, 30, 4, 0x000000).setOrigin(0.5);
    this.hpBar = scene.add.rectangle(x, y - def.size / 2 - 8, 30, 4, 0xff3d5a).setOrigin(0.5);

    this.wanderTarget = { x, y };
    this.nextWanderAt = 0;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, playerX, playerY) {
    if (this.dead) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const body = this.sprite.body;

    if (distToPlayer < 140) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    } else {
      if (time > this.nextWanderAt) {
        this.wanderTarget = {
          x: this.x + Phaser.Math.Between(-80, 80),
          y: this.y + Phaser.Math.Between(-80, 80)
        };
        this.nextWanderAt = time + Phaser.Math.Between(1500, 3500);
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y);
      body.setVelocity(Math.cos(angle) * this.speed * 0.4, Math.sin(angle) * this.speed * 0.4);
    }

    this.hpBarBg.x = this.x;
    this.hpBarBg.y = this.y - 26;
    this.hpBar.x = this.x - (30 - Math.max(0, (this.hp / this.maxHp) * 30)) / 2;
    this.hpBar.y = this.y - 26;
    this.hpBar.width = Math.max(0, (this.hp / this.maxHp) * 30);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      this.sprite.body.setVelocity(0, 0);
      this.sprite.setVisible(false);
      this.hpBar.setVisible(false);
      this.hpBarBg.setVisible(false);
      return true;
    }
    return false;
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
    this.hpBarBg.destroy();
  }
}
