// PRNG déterministe (mulberry32) + hash de chaîne, pour que chaque arme
// nommée obtienne toujours la même variation de stats/visuel — pas de
// aléatoire réel, juste dérivé du nom de l'arme.
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { mulberry32 };

// Renvoie une fonction rand() → [0,1), stable pour une chaîne donnée.
export function seededRandom(str) {
  return mulberry32(hashString(str));
}

// Renvoie un entier stable dans [0, 2^32) pour une chaîne — utile comme
// "graine visuelle" à réutiliser côté rendu (formes, teintes, etc).
export function seedFromString(str) {
  return hashString(str);
}

export function lerp(min, max, t) {
  return min + (max - min) * t;
}
