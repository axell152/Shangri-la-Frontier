import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#0b0b12',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [BootScene, GameScene, UIScene]
};

new Phaser.Game(config);
