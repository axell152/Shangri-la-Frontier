import Phaser from 'phaser';

// Single shared emitter so GameScene and UIScene can talk without
// reaching into each other directly.
export const EventBus = new Phaser.Events.EventEmitter();
