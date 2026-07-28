import Phaser from 'phaser';
import { ENEMY_TYPES } from '../data/enemies.js';

export class Enemy {
  constructor(scene, x, y, typeKey) {
    this.scene = scene;
    this.typeKey = typeKey;
    const def = ENEMY_TYPES[typeKey] || { def: 5, atk: 5, hp: 30, xp: 10, lootTier: 1, speed: 80, size: 28, color: 0x2e8b57 };
    
    this.def = def.def;
    this.atk = def.atk;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.xp = def.xp;
    this.lootTier = def.lootTier;
    this.speed = def.speed;
    this.dead = false;
    this.defSize = def.size;
    this.mainColor = def.color;

    // Rectangle invisible pour conserver la physique et les collisions existantes
    this.sprite = scene.add.rectangle(x, y, def.size, def.size, 0x000000, 0);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);

    // Objet Graphics dédié pour dessiner le monstre cubique
    this.gfx = scene.add.graphics();

    this.hpBarBg = scene.add.rectangle(x, y - def.size / 2 - 8, 30, 4, 0x000000).setOrigin(0.5);
    this.hpBar = scene.add.rectangle(x, y - def.size / 2 - 8, 30, 4, 0xff3d5a).setOrigin(0.5);

    this.wanderTarget = { x, y };
    this.nextWanderAt = 0;
    this.animFrame = 0;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, playerX, playerY) {
    if (this.dead) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const body = this.sprite.body;

    let isMoving = true;
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

    this.animFrame += 0.15;

    // Redessiner le monstre cubique et sa barre de vie
    this.drawEnemyBlocks();

    this.hpBarBg.x = this.x;
    this.hpBarBg.y = this.y - (this.defSize / 2 + 12);
    this.hpBar.x = this.x - (30 - Math.max(0, (this.hp / this.maxHp) * 30)) / 2;
    this.hpBar.y = this.y - (this.defSize / 2 + 12);
    this.hpBar.width = Math.max(0, (this.hp / this.maxHp) * 30);
  }

  drawEnemyBlocks() {
    this.gfx.clear();
    const px = this.sprite.x;
    const py = this.sprite.y;
    let swing = Math.sin(this.animFrame) * 4;

    // Utilisation de la couleur principale définie dans ton fichier data/enemies.js
    const mainColor = this.mainColor;
    const darkColor = 0x111111;

    // --- 1. JAMBES ---
    this.gfx.fillStyle(darkColor, 1);
    this.gfx.fillRect(px - 6 + swing, py + 4, 5, 12);
    this.gfx.fillRect(px + 1 - swing, py + 4, 5, 12);

    // --- 2. CORPS / TORSE ---
    this.gfx.fillStyle(mainColor, 1);
    this.gfx.fillRect(px - 10, py - 10, 20, 16);

    // --- 3. BRAS ---
    this.gfx.fillRect(px - 14 - swing, py - 10, 4, 10);
    this.gfx.fillRect(px + 10 + swing, py - 10, 4, 10);

    // --- 4. TÊTE & YEUX MENAÇANTS ---
    this.gfx.fillStyle(mainColor, 1);
    this.gfx.fillRect(px - 8, py - 22, 16, 12);

    // Petits yeux rouges/lumineux pour contraster
    this.gfx.fillStyle(0xff0000, 1);
    this.gfx.fillRect(px - 4, py - 18, 3, 3);
    this.gfx.fillRect(px + 1, py - 18, 3, 3);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      this.sprite.body.setVelocity(0, 0);
      this.sprite.setVisible(false);
      this.hpBar.setVisible(false);
      this.hpBarBg.setVisible(false);
      this.gfx.clear();
      return true;
    }
    return false;
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
    this.hpBarBg.destroy();
    this.gfx.destroy();
  }
}
