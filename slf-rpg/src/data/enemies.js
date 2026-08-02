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
  // Créature furtive de la Forêt murmurante : invisible et immobile tant
  // que le joueur n'est pas assez proche, puis se révèle et devient
  // agressive. Une fois révélée, se comporte comme un ennemi normal.
  loup_furtif: {
    name: 'Loup des Brumes',
    hp: 30,
    atk: 7,
    def: 2,
    speed: 95,
    xp: 14,
    color: 0x4a5a52,
    size: 24,
    lootTier: 'mid',
    stealthy: true
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
