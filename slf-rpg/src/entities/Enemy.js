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

    // Créature furtive (ex: Loup des Brumes) : invisible et immobile
    // jusqu'à ce que le joueur entre dans la portée d'embuscade.
    this.stealthy = !!def.stealthy;
    this.revealed = !this.stealthy;
    if (this.stealthy) {
      this.gfx.setAlpha(0.1);
      this.hpBar.setVisible(false);
      this.hpBarBg.setVisible(false);
    }

    // Pattern de boss : attaque en zone télégraphiée avant l'impact.
    this.isBoss = !!def.isBoss;
    this.telegraphState = null;
    this.nextTelegraphAt = null;
    if (this.isBoss) {
      this.telegraphGfx = scene.add.graphics();
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, playerX, playerY, damagePlayer, playerInSafeZone) {
    if (this.dead) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const body = this.sprite.body;

    if (this.stealthy && !this.revealed) {
      const AMBUSH_RANGE = 70;
      if (distToPlayer <= AMBUSH_RANGE) {
        this.revealed = true;
        this.gfx.setAlpha(1);
        this.hpBar.setVisible(true);
        this.hpBarBg.setVisible(true);
      } else {
        body.setVelocity(0, 0); // reste immobile et caché en embuscade
        this.animFrame += 0.15;
        this.drawEnemyBlocks();
        return;
      }
    }

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

    if (this.isBoss) {
      this.updateBossTelegraph(time, playerX, playerY, damagePlayer, playerInSafeZone);
    }

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

  // Pattern de boss "façon Shangri-La Frontier" : une zone de danger
  // s'affiche et grossit pendant ~1s avant l'impact. Le joueur doit en
  // sortir avant la fin, sinon il encaisse un gros coup.
  updateBossTelegraph(time, playerX, playerY, damagePlayer, playerInSafeZone) {
    const AGGRO_RANGE = 260; // le boss ne charge que si le joueur est dans cette portée

    if (!this.telegraphState) {
      if (this.nextTelegraphAt === null) {
        this.nextTelegraphAt = time + 2500; // délai avant la toute première charge
      }
      const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
      if (time > this.nextTelegraphAt && distToPlayer <= AGGRO_RANGE && !playerInSafeZone) {
        this.telegraphState = {
          startTime: time,
          duration: 1100,
          x: playerX, // la cible se verrouille sur la position du joueur au moment du cast
          y: playerY,
          maxRadius: 100
        };
      }
      return;
    }

    const progress = Math.min(1, (time - this.telegraphState.startTime) / this.telegraphState.duration);
    this.drawTelegraph(progress);

    if (progress >= 1) {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, this.telegraphState.x, this.telegraphState.y);
      if (dist <= this.telegraphState.maxRadius && damagePlayer && !playerInSafeZone) {
        damagePlayer(this.atk * 2.2); // frappe lourde si le joueur n'a pas bougé/fui à temps
      }
      this.telegraphGfx.clear();
      this.telegraphState = null;
      this.nextTelegraphAt = time + 2800; // cooldown avant la prochaine charge
    }
  }

  drawTelegraph(progress) {
    this.telegraphGfx.clear();
    const state = this.telegraphState;
    const r = state.maxRadius * progress;

    // Disque qui se remplit progressivement (plus opaque = plus proche de l'impact)
    this.telegraphGfx.fillStyle(0xff3d5a, 0.12 + progress * 0.33);
    this.telegraphGfx.fillCircle(state.x, state.y, r);

    // Contour de la zone finale, visible dès le début pour prévenir le joueur
    this.telegraphGfx.lineStyle(2, 0xff0000, 0.9);
    this.telegraphGfx.strokeCircle(state.x, state.y, state.maxRadius);
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
      if (this.telegraphGfx) this.telegraphGfx.clear();
      this.telegraphState = null;
      return true;
    }
    return false;
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
    this.hpBarBg.destroy();
    this.gfx.destroy();
    if (this.telegraphGfx) this.telegraphGfx.destroy();
  }
}
