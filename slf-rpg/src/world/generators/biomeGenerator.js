export const BIOME_DEFS = {
  marsh: {
    color: 0x3f6b4a,
    label: 'Marais'
  },
  grass: {
    color: 0x4f8a3a,
    label: 'Prairie'
  },
  forest: {
    color: 0x2e6b2d,
    label: 'Forêt'
  },
  rock: {
    color: 0x6a655d,
    label: 'Roche'
  },
  water: {
    color: 0x2f5f8f,
    label: 'Eau'
  }
};

export function resolveBiome(noiseValue) {
  if (noiseValue < 0.2) return 'water';
  if (noiseValue < 0.4) return 'marsh';
  if (noiseValue < 0.65) return 'grass';
  if (noiseValue < 0.85) return 'forest';
  return 'rock';
}

export function getBiomeColor(biomeKey) {
  return BIOME_DEFS[biomeKey]?.color ?? BIOME_DEFS.grass.color;
}
