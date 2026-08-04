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

    this.add.rectangle(w / 2, h / 2, w - 120, h - 120, this.building.interiorColor)
      .setStrokeStyle(2, 0x444d57);

    this.add.text(w / 2, 48, this.building.label, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffd23d'
    }).setOrigin(0.5);

    this.add.text(w / 2, 76, this.building.desc, {
      fontFamily: 'monospace', fontSize: '12px', color: '#999999'
    }).setOrigin(0.5);

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
      this.add.rectangle(w / 2 - 160, h / 2 + 20, 170, 60, 0x5f3a26).setStrokeStyle(2, 0x3c2419);
      this.add.rectangle(w / 2 - 140, h / 2 + 10, 24, 24, 0xb06519).setAngle(10);
      this.add.rectangle(w / 2 - 120, h / 2 + 10, 20, 20, 0xefd9a1);
      this.add.rectangle(w / 2 - 100, h / 2 + 8, 6, 28, 0x6f3a1c);
      this.add.rectangle(w / 2 - 160, h / 2 - 4, 30, 10, 0x8f662f);
      this.add.text(w / 2 - 160, h / 2 - 30, 'Bar', {
        fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    if (this.building.id === 'echoppe') {
      this.add.rectangle(w / 2 - 160, h / 2 + 20, 170, 60, 0x2b4f3c).setStrokeStyle(2, 0x173325);
      this.add.rectangle(w / 2 - 150, h / 2 + 8, 18, 18, 0x78c450).setAngle(-8);
      this.add.rectangle(w / 2 - 120, h / 2 + 8, 18, 18, 0xd95555).setAngle(12);
      this.add.rectangle(w / 2 - 90, h / 2 + 8, 18, 18, 0x5a9cd4).setAngle(6);
      this.add.text(w / 2 - 160, h / 2 - 30, 'Étal', {
        fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    if (this.building.id === 'forge') {
      this.add.rectangle(w / 2 - 160, h / 2 + 20, 170, 60, 0x4a3020).setStrokeStyle(2, 0x2c1e13);
      this.add.rectangle(w / 2 - 150, h / 2 + 10, 40, 16, 0xe0582a).setAngle(0);
      this.add.rectangle(w / 2 - 130, h / 2 - 4, 10, 30, 0x3a2f1d);
      this.add.rectangle(w / 2 - 90, h / 2 - 4, 10, 30, 0x3a2f1d);
      this.add.text(w / 2 - 160, h / 2 - 30, 'Enclume', {
        fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
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
