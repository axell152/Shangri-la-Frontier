import Phaser from 'phaser';
import { EventBus } from '../EventBus.js';

// Scène intérieure générique pour les bâtiments visitables de la ville
// (forge, taverne, échoppe). Le marchand garde son propre panneau externe
// (proximité + T) et n'utilise pas cette scène.
export class InteriorScene extends Phaser.Scene {
  constructor() {
    super('Interior');
  }

  init(data) {
    this.building = data.building;
    this.returnPos = data.returnPos;
  }

  create() {
    const w = this.sys.game.config.width;
    const h = this.sys.game.config.height;

    this.cameras.main.setBackgroundColor('#0b0b0f');

    const room = this.add.rectangle(w / 2, h / 2, w - 120, h - 120, this.building.interiorColor)
      .setStrokeStyle(2, 0x444d57);

    this.add.text(w / 2, 48, this.building.label, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffd23d'
    }).setOrigin(0.5);

    this.add.text(w / 2, 76, this.building.desc, {
      fontFamily: 'monospace', fontSize: '12px', color: '#999999'
    }).setOrigin(0.5);

    // Sol texturé
    for (let i = 0; i < 12; i++) {
      this.add.line(w / 2 - 500 + i * 80, h / 2 + 150, 0, 0, 0, 24, 0x312419, 0.5).setLineWidth(2);
    }
    for (let j = 0; j < 5; j++) {
      this.add.line(w / 2 - 500, h / 2 - 120 + j * 50, 0, 0, 400, 0, 0x312419, 0.5).setLineWidth(2);
    }

    // Décor mural et lumière
    this.add.rectangle(w / 2 - 260, h / 2 - 40, 24, 120, 0x3d2c24);
    this.add.rectangle(w / 2 + 260, h / 2 - 40, 24, 120, 0x3d2c24);
    this.add.circle(w / 2, h / 2 - 120, 10, 0xffe59d, 0.85);
    this.add.line(w / 2, h / 2 - 110, 0, 0, 0, 70, 0xffe59d, 0.35).setLineWidth(4);

    this.add.rectangle(w / 2, h / 2 + 120, w - 240, 140, 0x3c2a1b);
    this.add.rectangle(w / 2, h / 2 + 115, w - 260, 20, 0x5e4730);

    const shelfX = w / 2 + 140;
    const shelfY = h / 2 - 40;
    this.add.rectangle(shelfX, shelfY, 220, 18, 0x4a3d2c);
    this.add.rectangle(shelfX - 100, shelfY + 36, 12, 92, 0x4a3d2c);
    this.add.rectangle(shelfX + 100, shelfY + 36, 12, 92, 0x4a3d2c);
    this.add.rectangle(shelfX - 50, shelfY + 4, 20, 16, 0x76c3ff).setAngle(10);
    this.add.rectangle(shelfX - 10, shelfY + 4, 20, 16, 0xd97a2a).setAngle(-10);
    this.add.rectangle(shelfX + 30, shelfY + 4, 20, 16, 0x78d07a).setAngle(6);
    this.add.rectangle(shelfX + 70, shelfY + 4, 20, 16, 0xc0c0c0).setAngle(-6);

    if (this.building.id === 'taverne') {
      this.add.rectangle(w / 2 - 240, h / 2 + 16, 160, 72, 0x6a402d).setStrokeStyle(2, 0x3e2418);
      this.add.rectangle(w / 2 - 210, h / 2 + 24, 28, 28, 0xd8a96b).setAngle(6);
      this.add.rectangle(w / 2 - 170, h / 2 + 24, 20, 20, 0xc48b4c).setAngle(-8);
      this.add.rectangle(w / 2 - 130, h / 2 + 24, 26, 22, 0x8f5937).setAngle(4);
      this.add.text(w / 2 - 240, h / 2 - 14, 'Bar', {
        fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
      this.add.rectangle(w / 2 - 180, h / 2 + 70, 120, 8, 0x5c3b2d);
      this.add.circle(w / 2 - 210, h / 2 + 20, 6, 0xf6f1cc);
      this.add.circle(w / 2 - 165, h / 2 + 18, 4, 0xd08c55);
      this.add.circle(w / 2 - 145, h / 2 + 18, 4, 0xd08c55);
      for (let i = 0; i < 3; i++) {
        this.add.rectangle(w / 2 - 220 + i * 70, h / 2 + 80, 30, 12, 0x4a2f24);
        this.add.rectangle(w / 2 - 220 + i * 70, h / 2 + 70, 10, 14, 0x2f1d17);
      }
    }

    if (this.building.id === 'echoppe') {
      this.add.rectangle(w / 2 - 240, h / 2 + 16, 160, 72, 0x264a3a).setStrokeStyle(2, 0x133121);
      this.add.rectangle(w / 2 - 210, h / 2 + 22, 22, 22, 0x7bcf7f).setAngle(-10);
      this.add.rectangle(w / 2 - 180, h / 2 + 22, 22, 22, 0xd96a6a).setAngle(8);
      this.add.rectangle(w / 2 - 150, h / 2 + 22, 22, 22, 0x93c1ff).setAngle(6);
      this.add.text(w / 2 - 240, h / 2 - 14, 'Étal', {
        fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
      this.add.rectangle(w / 2 - 180, h / 2 + 70, 120, 10, 0x1f553d);
      this.add.circle(w / 2 - 210, h / 2 + 18, 6, 0xdfdfdf);
      this.add.circle(w / 2 - 175, h / 2 + 18, 6, 0xf4cf4c);
      this.add.rectangle(w / 2 - 220, h / 2 + 40, 18, 24, 0x3d5e4d);
      this.add.rectangle(w / 2 - 190, h / 2 + 40, 18, 24, 0x843d4d);
      this.add.rectangle(w / 2 - 160, h / 2 + 40, 18, 24, 0x4f69a4);
    }

    if (this.building.id === 'forge') {
      this.add.rectangle(w / 2 - 240, h / 2 + 16, 160, 72, 0x4a3020).setStrokeStyle(2, 0x2c1e13);
      this.add.rectangle(w / 2 - 210, h / 2 + 24, 30, 18, 0xe75829);
      this.add.rectangle(w / 2 - 170, h / 2 + 14, 10, 30, 0x3a2f1d);
      this.add.rectangle(w / 2 - 135, h / 2 + 14, 10, 30, 0x3a2f1d);
      this.add.text(w / 2 - 240, h / 2 - 14, 'Enclume', {
        fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
      this.add.line(w / 2 - 190, h / 2 + 20, 0, 0, 40, 0, 0x898174, 1).setLineWidth(4);
      this.add.circle(w / 2 - 188, h / 2 + 26, 5, 0xc7c7c7);
      this.add.rectangle(w / 2 - 220, h / 2 + 30, 18, 28, 0x24302a);
      this.add.line(w / 2 - 220, h / 2 + 10, 0, 0, 0, 40, 0x4a3e28, 1).setLineWidth(4);
      this.add.rectangle(w / 2 - 180, h / 2 + 38, 26, 6, 0x90856f);
    }

    const npcCenterX = w / 2 - 40;
    const npcCenterY = h / 2 + 20;
    this.add.circle(npcCenterX, npcCenterY - 44, 12, 0xd9c39a);
    this.add.rectangle(npcCenterX - 18, npcCenterY - 24, 36, 48, 0x8b5a2b);
    this.add.rectangle(npcCenterX - 20, npcCenterY - 24, 10, 28, 0x4a2f1a);
    this.add.rectangle(npcCenterX + 20, npcCenterY - 24, 10, 28, 0x4a2f1a);
    this.add.triangle(npcCenterX - 9, npcCenterY - 46, npcCenterX + 9, npcCenterY - 46, npcCenterX, npcCenterY - 58, 0x3a2a1a);
    this.add.rectangle(npcCenterX - 16, npcCenterY + 26, 34, 6, 0x5a4632);

    this.npcName = this.building.npcName;

    this.dialogText = this.add.text(w / 2, h / 2 - 60, '', {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add.text(w / 2, h - 60, 'E : sortir · T : parler', {
      fontSize: '12px', color: '#999', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.talkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.lastTalkAt = 0;

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.exitInterior();
    }

    if (Phaser.Input.Keyboard.JustDown(this.talkKey)) {
      const now = this.time.now;
      if (now - this.lastTalkAt < 400) return;
      this.lastTalkAt = now;
      const lines = this.building.lines || ['...'];
      const text = `${this.npcName} — ${lines[Math.floor(Math.random() * lines.length)]}`;
      this.dialogText.setText(text);
    }
  }

  exitInterior() {
    const game = this.scene.get('Game');
    if (game && game.player && this.returnPos) {
      game.player.sprite.setPosition(this.returnPos.x, this.returnPos.y + 40);
    }
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      const g = this.scene.get('Game');
      if (g) {
        this.scene.resume('Game');
        g.cameras.main.fadeIn(220, 0, 0, 0);
      }
    });
    EventBus.emit('inventory-panel', false);
  }
}
