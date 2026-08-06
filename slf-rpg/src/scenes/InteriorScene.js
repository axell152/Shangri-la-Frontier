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

    // Cadre principal de la pièce (agrandi et bien centré)
    const roomW = w - 160;
    const roomH = h - 160;
    const roomX = w / 2;
    const roomY = h / 2 - 20;

    this.add.rectangle(roomX, roomY, roomW, roomH, this.building.interiorColor || 0x221a14)
      .setStrokeStyle(3, 0x444d57);

    // Titre et description du bâtiment
    this.add.text(w / 2, 48, this.building.label, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffd23d', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(w / 2, 76, this.building.desc || '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa'
    }).setOrigin(0.5);

    // --- Sol texturé propre ---
    for (let i = 0; i < 14; i++) {
      this.add.line(roomX - roomW / 2 + 50 + i * 90, roomY + roomH / 2 - 100, 0, 0, 0, 80, 0x1f1712, 0.4).setLineWidth(2);
    }

    // --- Mobilier de fond & Éléments spécifiques ---
    // Grand comptoir / établi central selon le type de bâtiment
    const deskX = roomX;
    const deskY = roomY + 40;
    
    this.add.rectangle(deskX, deskY, 320, 90, 0x4a3222).setStrokeStyle(2, 0x2b1d13);
    this.add.rectangle(deskX, deskY - 38, 300, 14, 0x6e4e37);

    if (this.building.id === 'taverne') {
      this.add.text(deskX, deskY - 10, 'COMPTOIR DE LA TAVERNE', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
      // Chopes de bière sur le comptoir
      this.add.rectangle(deskX - 60, deskY - 12, 14, 18, 0xd8a96b).setAngle(6);
      this.add.rectangle(deskX - 20, deskY - 12, 12, 16, 0xc48b4c).setAngle(-4);
      this.add.rectangle(deskX + 30, deskY - 12, 14, 18, 0xd8a96b).setAngle(8);
    } else if (this.building.id === 'echoppe') {
      this.add.text(deskX, deskY - 10, 'ÉTAL DE MARCHANDISE', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
      this.add.rectangle(deskX - 50, deskY - 12, 20, 16, 0x7bcf7f).setAngle(-10);
      this.add.rectangle(deskX, deskY - 12, 20, 16, 0xd96a6a).setAngle(8);
      this.add.rectangle(deskX + 50, deskY - 12, 20, 16, 0x93c1ff).setAngle(6);
    } else if (this.building.id === 'forge') {
      this.add.text(deskX, deskY - 10, 'ENCLUME ET FOURNEAU', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
      this.add.rectangle(deskX - 60, deskY - 12, 28, 20, 0xe75829); // Charbon ardent
      this.add.rectangle(deskX + 40, deskY - 12, 16, 28, 0x3a2f1d); // Enclume
      this.add.line(deskX + 40, deskY - 20, 0, 0, 30, 0, 0x898174, 1).setLineWidth(3);
    }

    // Étagères murales en arrière-plan
    const shelfX = roomX;
    const shelfY = roomY - 120;
    this.add.rectangle(shelfX, shelfY, 360, 16, 0x3b2a1f).setStrokeStyle(1, 0x241812);
    this.add.rectangle(shelfX - 140, shelfY + 30, 12, 45, 0x3b2a1f);
    this.add.rectangle(shelfX + 140, shelfY + 30, 12, 45, 0x3b2a1f);
    
    // Objets sur l'étagère
    for(let i = -100; i <= 100; i += 50) {
      this.add.rectangle(shelfX + i, shelfY - 10, 16, 22, 0x5a6878);
    }

    // --- PNJ IDENTIQUE AU JOUEUR (mais sans l'arme) ---
    // Positionné derrière ou à côté du comptoir, face au joueur
    const npcX = roomX;
    const npcY = deskY - 45;

    // Corps du PNJ (Reprend exactement la structure du Player : Tête, Torse, Jambes)
    // 1. Tête
    this.add.rectangle(npcX, npcY - 18, 12, 12, 0xffffff);
    this.add.rectangle(npcX, npcY - 18, 10, 10, 0xd9c39a);

    // 2. Torse (vêtement coloré adapté au bâtiment)
    const shirtColor = this.building.id === 'forge' ? 0xb44e2e : (this.building.id === 'taverne' ? 0x6b3a3a : 0x2e6db4);
    this.add.rectangle(npcX, npcY, 14, 12, shirtColor);

    // 3. Jambes
    this.add.rectangle(npcX - 3, npcY + 9, 3, 8, 0x333333);
    this.add.rectangle(npcX + 3, npcY + 9, 3, 8, 0x333333);

    // Nom du PNJ au-dessus de sa tête
    this.npcName = this.building.npcName || 'Habitant';
    this.add.text(npcX, npcY - 34, this.npcName, {
      fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace', backgroundColor: '#000000aa', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    // Zone de texte pour les dialogues
    this.dialogText = this.add.text(w / 2, roomY + 120, 'Appuyez sur T pour parler', {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace', backgroundColor: '#16161dee', padding: { x: 10, y: 6 }
    }).setOrigin(0.5);

    // Instructions de sortie en bas
    this.add.text(w / 2, h - 50, 'E : sortir · T : parler', {
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
      const lines = this.building.lines || ['Bonjour voyageur.'];
      const text = `${this.npcName} : "${lines[Math.floor(Math.random() * lines.length)]}"`;
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
