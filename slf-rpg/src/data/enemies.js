export const ENEMY_TYPES = {
  // --- MARAIS DES BRUMES ---
  slime: {
    name: 'Slime des marais',
    hp: 24, atk: 3, def: 1, speed: 40, xp: 8, color: 0x4dff8a, size: 20, lootTier: 'low',
    shape: 'slime'
  },
  vampire_bat: {
    name: 'Chauve-souris vampirique',
    hp: 18, atk: 5, def: 1, speed: 120, xp: 12, color: 0x5a3d7a, size: 18, lootTier: 'low',
    shape: 'bat'
  },
  boss_marais: {
    name: 'Reine des Vases (Boss)',
    hp: 300, atk: 18, def: 8, speed: 35, xp: 120, color: 0x2e8b57, size: 50, lootTier: 'boss',
    shape: 'queen_slime', isBoss: true
  },

  // --- FORÊT MURMURANTE ---
  loup_spectral: {
    name: 'Loup des Brumes',
    hp: 35, atk: 8, def: 2, speed: 100, xp: 18, color: 0x4a5a52, size: 24, lootTier: 'mid',
    shape: 'wolf', stealthy: true
  },
  arache_foret: {
    name: 'Araignée des mousses',
    hp: 45, atk: 10, def: 3, speed: 70, xp: 22, color: 0x3b5323, size: 28, lootTier: 'mid',
    shape: 'spider'
  },
  boss_foret: {
    name: 'Seigneur Sylvestre (Boss)',
    hp: 450, atk: 22, def: 12, speed: 50, xp: 200, color: 0x1e4d2b, size: 56, lootTier: 'boss',
    shape: 'treant', isBoss: true
  },

  // --- TERRES ÉCARLATES ---
  gobelin: {
    name: 'Gobelin pillard',
    hp: 42, atk: 9, def: 2, speed: 65, xp: 16, color: 0x8a6d3b, size: 24, lootTier: 'mid',
    shape: 'goblin'
  },
  orc_guerrier: {
    name: 'Orc des sables',
    hp: 85, atk: 15, def: 5, speed: 45, xp: 35, color: 0xa0522d, size: 34, lootTier: 'high',
    shape: 'orc'
  },
  boss_desert: {
    name: 'Seigneur de Guerre Orc (Boss)',
    hp: 600, atk: 28, def: 15, speed: 40, xp: 300, color: 0x8b0000, size: 60, lootTier: 'boss',
    shape: 'orc_warlord', isBoss: true
  },

  // --- RUINES ENGLOUTIES ---
  golem_debris: {
    name: 'Golem de débris',
    hp: 120, atk: 14, def: 8, speed: 25, xp: 45, color: 0x9d9d9d, size: 36, lootTier: 'high',
    shape: 'golem'
  },
  spectre_ancien: {
    name: 'Spectre des profondeurs',
    hp: 70, atk: 18, def: 4, speed: 85, xp: 55, color: 0x00ced1, size: 30, lootTier: 'high',
    shape: 'spectre'
  },
  gardien_rouille: {
    name: 'Gardien Rouille (Boss)',
    hp: 800, atk: 35, def: 20, speed: 30, xp: 500, color: 0xff3d5a, size: 64, lootTier: 'boss',
    shape: 'mech_boss', isBoss: true
  }
};
