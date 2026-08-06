import Phaser from 'phaser';
import { EventBus } from '../EventBus.js';

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

    // Types de bâtiments spécifiques
    this.isMerchantBuilding = 
      this.building.id === 'echoppe' || 
      this.building.id === 'marchand' || 
      this.building.isMerchant || 
      (this.building.label && this.building.label.toLowerCase().includes('marchand'));

    this.isForgeBuilding = this.building.id === 'forge';

    this.panelOpen = false;
    this.activeTab = this.isForgeBuilding ? 'repair' : (this.isMerchantBuilding ? 'buy' : null);

    // Cadre principal de la pièce
    const roomW = w - 160;
    const roomH = h - 160;
    const roomX = w / 2;
    const roomY = h / 2 - 20;

    this.add.rectangle(roomX, roomY, roomW, roomH, this.building.interiorColor || 0x221a14)
      .setStrokeStyle(3, 0x444d57);

    // Titre et description
    this.add.text(w / 2, 48, this.building.label, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffd23d', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(w / 2, 76, this.building.desc || '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa'
    }).setOrigin(0.5);

    // Sol texturé
    for (let i = 0; i < 14; i++) {
      this.add.line(roomX - roomW / 2 + 50 + i * 90, roomY + roomH / 2 - 100, 0, 0, 0, 80, 0x1f1712, 0.4).setLineWidth(2);
    }

    // Mobilier de fond & Éléments spécifiques
    const deskX = roomX;
    const deskY = roomY + 40;
    
    this.add.rectangle(deskX, deskY, 320, 90, 0x4a3222).setStrokeStyle(2, 0x2b1d13);
    this.add.rectangle(deskX, deskY - 38, 300, 14, 0x6e4e37);

    if (this.building.id === 'taverne') {
      this.add.text(deskX, deskY - 10, 'COMPTOIR DE LA TAVERNE', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
    } else if (this.isMerchantBuilding) {
      this.add.text(deskX, deskY - 10, 'ÉTAL DE MARCHANDISE (ACHAT / VENTE)', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
    } else if (this.isForgeBuilding) {
      this.add.text(deskX, deskY - 10, 'ENCLUME (RÉPARATION / FUSION)', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    // --- INTERFACE DES ONGLETS (Affichée si c'est la Forge ou le Marchand) ---
    if (this.isForgeBuilding || this.isMerchantBuilding) {
      this.createTabsUI(w, roomY);
    }

    // --- PNJ ---
    const npcX = roomX;
    const npcY = deskY - 45;

    this.add.rectangle(npcX, npcY - 18, 12, 12, 0xffffff);
    this.add.rectangle(npcX, npcY - 18, 10, 10, 0xd9c39a);

    const shirtColor = this.isForgeBuilding ? 0xb44e2e : (this.building.id === 'taverne' ? 0x6b3a3a : 0x2e6db4);
    this.add.rectangle(npcX, npcY, 14, 12, shirtColor);

    this.add.rectangle(npcX - 3, npcY + 9, 3, 8, 0x333333);
    this.add.rectangle(npcX + 3, npcY + 9, 3, 8, 0x333333);

    this.npcName = this.building.npcName || (this.isForgeBuilding ? 'Forgeron' : (this.isMerchantBuilding ? 'Marchand' : 'Habitant'));
    this.add.text(npcX, npcY - 34, this.npcName, {
      fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace', backgroundColor: '#000000aa', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    // Texte de dialogue / statut
    const defaultPrompt = this.isForgeBuilding 
      ? 'Appuyez sur T pour ouvrir la Forge' 
      : (this.isMerchantBuilding ? 'Appuyez sur T pour commercer' : 'Appuyez sur T pour parler');

    this.dialogText = this.add.text(w / 2, roomY + 130, defaultPrompt, {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace', backgroundColor: '#16161dee', padding: { x: 10, y: 6 }
    }).setOrigin(0.5);

    const helpText = this.isForgeBuilding || this.isMerchantBuilding 
      ? 'E : sortir · T : interagir / basculer' 
      : 'E : sortir · T : parler';
      
    this.add.text(w / 2, h - 50, helpText, {
      fontSize: '12px', color: '#999', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.talkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.lastTalkAt = 0;

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  // Crée visuellement les deux boutons d'onglets cliquables
  createTabsUI(w, roomY) {
    const tabY = roomY + 90;
    
    let label1 = this.isForgeBuilding ? 'REPARATION' : 'ACHAT';
    let label2 = this.isForgeBuilding ? 'FUSION' : 'VENTE';

    // Bouton 1
    this.tab1Bg = this.add.rectangle(w / 2 - 80, tabY, 140, 28, 0x332211).setInteractive();
    this.tab1Text = this.add.text(w / 2 - 80, tabY, label1, { fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace' }).setOrigin(0.5);

    // Bouton 2
    this.tab2Bg = this.add.rectangle(w / 2 + 80, tabY, 140, 28, 0x222222).setInteractive();
    this.tab2Text = this.add.text(w / 2 + 80, tabY, label2, { fontSize: '12px', color: '#888888', fontFamily: 'monospace' }).setOrigin(0.5);

    // Événements de clic pour changer d'onglet instantanément à la souris
    this.tab1Bg.on('pointerdown', () => {
      this.activeTab = this.isForgeBuilding ? 'repair' : 'buy';
      this.updateTabsVisuals();
    });

    this.tab2Bg.on('pointerdown', () => {
      this.activeTab = this.isForgeBuilding ? 'fusion' : 'sell';
      this.updateTabsVisuals();
    });
  }

  updateTabsVisuals() {
    if (!this.isForgeBuilding && !this.isMerchantBuilding) return;

    const isTab1Active = this.isForgeBuilding ? (this.activeTab === 'repair') : (this.activeTab === 'buy');

    if (isTab1Active) {
      this.tab1Bg.setFillStyle(0x332211);
      this.tab1Text.setColor('#ffd23d');
      this.tab2Bg.setFillStyle(0x222222);
      this.tab2Text.setColor('#888888');
    } else {
      this.tab1Bg.setFillStyle(0x222222);
      this.tab1Text.setColor('#888888');
      this.tab2Bg.setFillStyle(0x332211);
      this.tab2Text.setColor('#ffd23d');
    }

    // Émet un signal pour indiquer quel sous-panneau afficher/actualiser
    EventBus.emit('interior-tab-changed', {
      buildingType: this.isForgeBuilding ? 'forge' : 'merchant',
      activeTab: this.activeTab
    });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.exitInterior();
    }

    if (Phaser.Input.Keyboard.JustDown(this.talkKey)) {
      const now = this.time.now;
      if (now - this.lastTalkAt < 400) return;
      this.lastTalkAt = now;

      if (this.isMerchantBuilding || this.isForgeBuilding) {
        this.panelOpen = !this.panelOpen;
        
        if (this.isMerchantBuilding) {
          EventBus.emit('merchant-panel', this.panelOpen);
        } else if (this.isForgeBuilding) {
          EventBus.emit('forge-panel', this.panelOpen);
        }

        const gameScene = this.scene.get('Game');
        if (gameScene && typeof gameScene.emitStatsUpdate === 'function') {
          gameScene.emitStatsUpdate();
        }

        if (this.panelOpen) {
          const actionName = this.isForgeBuilding ? (this.activeTab === 'repair' ? 'réparer' : 'fusionner') : (this.activeTab === 'buy' ? 'acheter' : 'vendre');
          this.dialogText.setText(`${this.npcName} : « Mode ${actionName} activé. »`);
        } else {
          this.dialogText.setText(`${this.npcName} : « À bientôt ! »`);
        }
      } else {
        const lines = this.building.lines || ['Bonjour voyageur.'];
        const text = `${this.npcName} : "${lines[Math.floor(Math.random() * lines.length)]}"`;
        this.dialogText.setText(text);
      }
    }
  }

  exitInterior() {
    EventBus.emit('merchant-panel', false);
    EventBus.emit('forge-panel', false);
    EventBus.emit('inventory-panel', false);

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
  }
}
