export const ENEMY_TYPES = {
  slime: {
    name: 'Slime des marais',
    hp: 24,
    atk: 3,
    def: 1,
    speed: 40,
    xp: 8,
    color: 0x4dff8a,
    size: 20,
    lootTier: 'low'
  },
  gobelin: {
    name: 'Gobelin pillard',
    hp: 42,
    atk: 6,
    def: 2,
    speed: 65,
    xp: 16,
    color: 0x8a6d3b,
    size: 24,
    lootTier: 'mid'
  },
  golem_debris: {
    name: 'Golem de débris',
    hp: 120,
    atk: 12,
    def: 6,
    speed: 25,
    xp: 45,
    color: 0x9d9d9d,
    size: 36,
    lootTier: 'high'
  },
  // Rare "gardien" mini-boss — much tougher, guaranteed good loot.
  gardien_rouille: {
    name: 'Gardien Rouille',
    hp: 380,
    atk: 20,
    def: 10,
    speed: 45,
    xp: 150,
    color: 0xff3d5a,
    size: 48,
    lootTier: 'boss',
    isBoss: true
  }
};
