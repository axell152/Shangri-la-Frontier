import Phaser from 'phaser';
import { StatsSystem } from '../systems/StatsSystem.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { RARITY_ORDER } from '../data/rarity.js';
import { mulberry32 } from '../utils/rng.js';
import { EventBus } from '../EventBus.js';

const MOVE_SPEED = 160;

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.stats = new StatsSystem();
    this.weapons = new WeaponSystem();
    this.gold = 0;
    this.lastAttackAt = 0;
    this.facing = 'down';

    this.animFrame = 0;
    this.isMoving = false;

    this.isAttackingAnim = false;
    this.attackAnimTimer = 0;

    // Dégâts subis : fenêtre d'invulnérabilité + flash visuel bref
    this.invulnerableUntil = 0;
    this.hitFlashUntil = 0;

    // Rectangle invisible pour la physique Phaser
    this.sprite = scene.add.rectangle(x, y, 26, 34, 0x000000, 0);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);

    this.gfx = scene.add.graphics();
    this.weaponGfx = scene.add.graphics();

    // Configuration des touches ZQSD
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.Z,
      left: Phaser.Input.Keyboard.KeyCodes.Q,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Écoute du clic gauche de la souris pour attaquer
    scene.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        this.tryAttack(scene.time.now, scene.enemiesRef || [], scene.onHitEnemyRef, pointer);
      }
    });
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, enemies, onHitEnemy) {
    // Stockage temporaire des références pour le clic de souris
    this.scene.enemiesRef = enemies;
    this.scene.onHitEnemyRef = onHitEnemy;

    const body = this.sprite.body;
    let vx = 0;
    let vy = 0;

    this.isMoving = false;

    // Utilisation exclusive de Z, Q, S, D
    if (this.wasd.left.isDown) { vx = -1; this.facing = 'left'; this.isMoving = true; }
    else if (this.wasd.right.isDown) { vx = 1; this.facing = 'right'; this.isMoving = true; }
    if (this.wasd.up.isDown) { vy = -1; this.facing = 'up'; this.isMoving = true; }
    else if (this.wasd.down.isDown) { vy = 1; this.facing = 'down'; this.isMoving = true; }

    const len = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / len) * MOVE_SPEED, (vy / len) * MOVE_SPEED);

    if (this.isMoving) {
      this.animFrame += 0.15;
    } else {
      this.animFrame = 0;
    }

    if (this.isAttackingAnim) {
      this.attackAnimTimer--;
      if (this.attackAnimTimer <= 0) {
        this.isAttackingAnim = false;
      }
    }

    this.drawPlayerAndEffects();
    this.drawWeapon();
  }

  drawPlayerAndEffects() {
    this.gfx.clear();
    const px = this.sprite.x;
    const py = this.sprite.y;
    let swing = this.isMoving ? Math.sin(this.animFrame) * 6 : 0;

    const isFlashing = this.scene.time.now < this.hitFlashUntil;

    const colorPants = isFlashing ? 0xff3d5a : 0x333333;
    const colorShirt = isFlashing ? 0xff3d5a : 0x0055ff;
    const colorSkin = isFlashing ? 0xffb0b0 : 0xffdbac;
    const colorMask = 0xffffff;

    // Jambes
    this.gfx.fillStyle(colorPants, 1);
    this.gfx.fillRect(px - 6 + swing, py + 6, 6, 16);
    this.gfx.fillRect(px + 0 - swing, py + 6, 6, 16);

    // Torse
    this.gfx.fillStyle(colorShirt, 1);
    this.gfx.fillRect(px - 8, py - 10, 16, 16);

    // Bras
    this.gfx.fillRect(px - 14 - swing, py - 10, 6, 14);
    this.gfx.fillRect(px + 8 + swing, py - 10, 6, 14);

    // Tête & Masque
    this.gfx.fillStyle(colorSkin, 1);
    this.gfx.fillRect(px - 10, py - 26, 20, 16);

    this.gfx.fillStyle(colorMask, 1);
    this.gfx.fillRect(px - 6, py - 22, 12, 10);
  }

  // Positionne et fait pivoter l'arme selon la direction du joueur,
  // avec un swing pendant l'attaque. La forme elle-même est dessinée
  // en coordonnées locales (pivot à l'origine, pointant vers +x)
  // dans drawWeaponShape, puis tournée via la rotation de l'objet.
  drawWeapon() {
    const weapon = this.weapons.equipped;
    this.weaponGfx.clear();
    if (!weapon) return;

    const facingAngles = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2
    };
    const baseAngle = facingAngles[this.facing] ?? 0;

    let armSwing = this.isMoving ? Math.sin(this.animFrame) * 6 : 0;

    let attackSwing = 0;
    if (this.isAttackingAnim) {
      const progress = 1 - this.attackAnimTimer / 8;
      attackSwing = -0.9 + Math.sin(progress * Math.PI) * 1.6;
    }

    let offsetX = 0;
    let offsetY = -4;

    if (this.facing === 'right') {
      offsetX = 18;
      offsetY = -2 + armSwing;
    } else if (this.facing === 'left') {
      offsetX = -18;
      offsetY = -2 - armSwing;
    } else if (this.facing === 'down') {
      offsetX = 6 + armSwing;
      offsetY = 12;
    } else if (this.facing === 'up') {
      offsetX = -6 - armSwing;
      offsetY = -12;
    }

    this.weaponGfx.setPosition(this.sprite.x + offsetX, this.sprite.y + offsetY);
    this.weaponGfx.setRotation(baseAngle + attackSwing);

    this.drawWeaponShape(weapon);
  }

  // Dessine la silhouette de l'arme (selon sa catégorie), avec une
  // variation de dimensions propre à CHAQUE arme (dérivée de son nom via
  // visualSeed), puis une ornementation qui s'enrichit avec la rareté
  // (contour dès Rare, halo dès Épique, particules dès Légendaire).
  drawWeaponShape(weapon) {
    const color = weapon.color;
    const g = this.weaponGfx;
    const rand = mulberry32(weapon.visualSeed);
    const lengthJitter = 0.85 + rand() * 0.3;
    const widthJitter = 0.85 + rand() * 0.3;

    switch (weapon.kind) {
      case 'sword':
        g.fillStyle(0x3a2a1a, 1);
        g.fillRect(-9, -3, 9, 6);
        g.fillStyle(0x999999, 1);
        g.fillRect(0, -7, 3, 14);
        g.fillStyle(color, 1);
        g.fillRect(3, -2 * widthJitter, 20 * lengthJitter, 4 * widthJitter);
        break;

      case 'dagger':
        g.fillStyle(0x3a2a1a, 1);
        g.fillRect(-6, -2, 6, 4);
        g.fillStyle(color, 1);
        g.fillTriangle(0, -3 * widthJitter, 0, 3 * widthJitter, 14 * lengthJitter, 0);
        break;

      case 'spear':
        g.fillStyle(0x5a4632, 1);
        g.fillRect(-16, -2, 36 * lengthJitter, 3);
        g.fillStyle(color, 1);
        g.fillTriangle(20 * lengthJitter, -5 * widthJitter, 20 * lengthJitter, 5 * widthJitter, 33 * lengthJitter, 0);
        break;

      case 'axe':
        g.fillStyle(0x5a4632, 1);
        g.fillRect(-8, -2, 26, 3);
        g.fillStyle(color, 1);
        g.fillTriangle(14, -11 * widthJitter, 14, 11 * widthJitter, 27 * lengthJitter, 0);
        g.fillTriangle(14, -11 * widthJitter, 14, 11 * widthJitter, 4, 0);
        break;

      case 'bow': {
        const r = 14 * widthJitter;
        g.lineStyle(3, color, 1);
        g.beginPath();
        g.arc(0, 0, r, -1.0, 1.0, false);
        g.strokePath();
        g.lineStyle(1, 0xdddddd, 1);
        g.lineBetween(r * Math.cos(-1.0), r * Math.sin(-1.0), r * Math.cos(1.0), r * Math.sin(1.0));
        break;
      }

      case 'staff': {
        const len = 26 * lengthJitter;
        g.fillStyle(0x5a4632, 1);
        g.fillRect(-4, -2, len, 4);
        g.fillStyle(color, 0.95);
        g.fillCircle(len, 0, 6 * widthJitter);
        g.lineStyle(1, 0xffffff, 0.7);
        g.strokeCircle(len, 0, 6 * widthJitter);
        break;
      }

      case 'hammer': {
        const len = 20 * lengthJitter;
        g.fillStyle(0x5a4632, 1);
        g.fillRect(-10, -2, len, 4);
        g.fillStyle(color, 1);
        g.fillRect(len - 6, -9 * widthJitter, 16, 18 * widthJitter);
        break;
      }

      case 'katana': {
        const len = 24 * lengthJitter;
        g.fillStyle(0x1a1a1a, 1);
        g.fillRect(-8, -2, 8, 4);
        g.fillStyle(0x999999, 1);
        g.fillRect(0, -5, 2, 10);
        g.fillStyle(color, 1);
        g.fillRect(2, -1.5 * widthJitter, len, 3 * widthJitter);
        g.fillTriangle(2 + len, -1.5 * widthJitter, 2 + len, 1.5 * widthJitter, 2 + len + 6, 0);
        break;
      }

      case 'claw': {
        const len = 14 * lengthJitter;
        g.fillStyle(0x3a2a1a, 1);
        g.fillRect(-6, -4, 6, 8);
        g.fillStyle(color, 1);
        g.fillTriangle(0, -5, 0, -1, len, -7 * widthJitter);
        g.fillTriangle(0, -2, 0, 2, len + 1, 0);
        g.fillTriangle(0, 1, 0, 5, len, 7 * widthJitter);
        break;
      }

      case 'gun': {
        const len = 20 * lengthJitter;
        g.fillStyle(0x333340, 1);
        g.fillRect(-8, -4 * widthJitter, len, 8 * widthJitter);
        g.fillStyle(0x1a1a22, 1);
        g.fillRect(len - 8, -2, 10, 4);
        g.fillStyle(color, 1);
        g.fillRect(-6, -1, len - 4, 2);
        break;
      }

      case 'fists':
        g.fillStyle(0xffdbac, 1);
        g.fillRect(-4, -4, 10, 8);
        break;

      default:
        g.fillStyle(color, 1);
        g.fillRect(0, -3, 14, 6);
    }

    this.drawTierOrnament(weapon, g);
  }

  drawTierOrnament(weapon, g) {
    const tierIndex = RARITY_ORDER.indexOf(weapon.tierKey);
    if (tierIndex < 2) return; // Commune / Peu Commune : pas d'ornement

    const time = this.scene.time.now;
    const seed = weapon.visualSeed % 1000;
    const pulse = 0.5 + 0.5 * Math.sin(time / 300 + seed);
    const cx = 6;

    // Contour dès Rare
    g.lineStyle(1.5, weapon.color, 0.45 + tierIndex * 0.05);
    g.strokeCircle(cx, 0, 14 + tierIndex * 1.5);

    // Halo dès Épique
    if (tierIndex >= 3) {
      g.fillStyle(weapon.color, 0.07 + 0.05 * pulse);
      g.fillCircle(cx, 0, 16 + tierIndex * 2);
    }

    // Particules dès Légendaire (plus nombreuses pour Mythique/Relique Divine)
    if (tierIndex >= 4) {
      const sparkleCount = tierIndex >= 5 ? 5 : 3;
      for (let i = 0; i < sparkleCount; i++) {
        const a = (i / sparkleCount) * Math.PI * 2 + time / 500 + seed;
        const r = 16 + tierIndex * 1.5;
        const sx = cx + Math.cos(a) * r;
        const sy = Math.sin(a) * r;
        g.fillStyle(0xffffff, 0.6 + 0.4 * pulse);
        g.fillCircle(sx, sy, 1.4);
      }
    }
  }

  tryAttack(time, enemies, onHitEnemy, pointer) {
    if (!enemies || time - this.lastAttackAt < this.weapons.attackCooldownMs) return;
    this.lastAttackAt = time;

    this.isAttackingAnim = true;
    this.attackAnimTimer = 8;

    const weapon = this.weapons.equipped;
    const isCrit = Math.random() < this.weapons.critChance;
    const rawDamage = this.weapons.attackDamage + this.stats.totalAtk;
    const damage = Math.max(1, Math.round(isCrit ? rawDamage * 1.8 : rawDamage));

    let executed = false;

    if (weapon && weapon.ranged && pointer) {
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);

      if (this.scene.spawnProjectile) {
        this.scene.spawnProjectile(this.x, this.y, angle, damage, isCrit, weapon.color, weapon.range, weapon.kind);
        executed = true;
      }
    } else if (!weapon || !weapon.ranged) {
      const range = this.weapons.attackRange;
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist <= range) {
          const enemyDamage = Math.max(1, damage - enemy.def);
          if (onHitEnemy) onHitEnemy(enemy, enemyDamage, isCrit);
        }
      }
      executed = true;
    }

    if (executed) {
      const result = this.weapons.registerAttackUse();
      if (this.scene.emitStatsUpdate) this.scene.emitStatsUpdate();
      if (result.broke) {
        EventBus.emit('loot-log', {
          type: 'kill',
          text: `${result.brokenName} s'est brisée ! Équipé désormais : ${result.newEquippedName}.`
        });
      }
    }
  }

  // Renvoie false si le coup est ignoré (encore invulnérable), sinon un
  // objet { taken, damage, died }.
  takeDamage(amount, time) {
    if (time < this.invulnerableUntil) return false;
    const reduced = Math.max(1, Math.round(amount - this.stats.totalDef * 0.5));
    const died = this.stats.takeDamage(reduced);
    this.invulnerableUntil = time + 700; // ~0.7s d'invulnérabilité après un coup
    this.hitFlashUntil = time + 180;
    return { taken: true, damage: reduced, died };
  }

  // Réinitialise complètement le personnage (niveau, arme, inventaire, or)
  // — utilisé quand le joueur meurt sans avoir jamais sauvegardé.
  resetFresh() {
    this.stats = new StatsSystem();
    this.weapons = new WeaponSystem();
    this.gold = 0;
  }

  equipWeapon(weapon) {
    this.weapons.equip(weapon);
  }
}
