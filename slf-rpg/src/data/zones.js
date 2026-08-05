// Monde : une ville-hub rectangulaire (taille fixe, praticable) entourée
// de biomes bien plus grands (~3-4x les dimensions de la ville) accessibles
// par des sorties marquées.
export const WORLD_W = 16000;
export const WORLD_H = 16000;

// Rectangle de la ville (Havre-du-Départ) — taille inchangée. C'est aussi
// la "safe zone" : aucun ennemi n'y entre, et c'est là qu'on sauvegarde (F).
export const TOWN = {
  id: 'town',
  label: 'Havre-du-Départ',
  x1: 7200, y1: 7450, x2: 8800, y2: 8550
};
export const TOWN_CENTER = { x: (TOWN.x1 + TOWN.x2) / 2, y: (TOWN.y1 + TOWN.y2) / 2 };

// Bâtiments dans la ville, tous visitables (touche E près de la porte).
export const BUILDINGS = [
  {
    id: 'merchant', label: 'Marchand', x: TOWN_CENTER.x + 130, y: TOWN_CENTER.y - 60,
    functional: true, color: 0x7a5a3a
  },
  {
    id: 'forge', label: 'Forge', desc: 'Réparation d\u2019armes — bientôt',
    x: TOWN_CENTER.x - 220, y: TOWN_CENTER.y - 80, functional: false, color: 0x8a5a3a,
    interiorColor: 0x3a2a1f, npcName: 'Forgeron',
    lines: ['Reviens quand j\u2019aurai remis l\u2019enclume en état.', 'La chaleur, ça forge le caractère.']
  },
  {
    id: 'taverne', label: 'Taverne', desc: 'Auberge — point de sauvegarde', savePoint: true,
    x: TOWN_CENTER.x - 220, y: TOWN_CENTER.y + 110, functional: false, color: 0x6b3a3a,
    interiorColor: 0x3b2416, npcName: 'Aubergiste',
    lines: ['Pas de quête pour l\u2019instant, mais assieds-toi.', 'On raconte des choses sur les ruines à l\u2019ouest...']
  },
  {
    id: 'echoppe', label: 'Échoppe générale', desc: 'Objets divers — bientôt',
    x: TOWN_CENTER.x + 150, y: TOWN_CENTER.y + 130, functional: false, color: 0x3a6b5a,
    interiorColor: 0x24302a, npcName: 'Commerçant',
    lines: ['Rien à vendre pour l\u2019instant, désolé.', 'Repasse plus tard, l\u2019inventaire arrive.']
  }
];

// Sorties de la ville, chacune reliée à un biome.
export const GATES = [
  { direction: 'north', x: TOWN_CENTER.x, y: TOWN.y1, targetZone: 'foret_murmurante' },
  { direction: 'south', x: TOWN_CENTER.x, y: TOWN.y2, targetZone: 'marais_brumes' },
  { direction: 'east', x: TOWN.x2, y: TOWN_CENTER.y, targetZone: 'terres_ecarlates' },
  { direction: 'west', x: TOWN.x1, y: TOWN_CENTER.y, targetZone: 'ruines_englouties' }
];

// Biomes : rayon ~2600x1900, soit un diamètre ~3.25-3.45x les dimensions
// de la ville (1600 large / 1100 haut) — largement de quoi explorer.
const BIOME_RADIUS_X = 2600;
const BIOME_RADIUS_Y = 1900;
const GAP = 500; // "no man's land" entre la ville et chaque biome

export const ZONES = [
  { id: 'merchant', label: 'Marchand', x: TOWN_CENTER.x + 130, y: TOWN_CENTER.y - 60, functional: true, color: 0x7a5a3a },
  {
    id: 'forge', label: 'Forge', desc: 'Réparation darmes — bientôt',
    x: TOWN_CENTER.x - 220, y: TOWN_CENTER.y - 80, functional: false, color: 0x8a5a3a,
    interiorColor: 0x3a2a1f, npcName: 'Forgeron',
    lines: ['Reviens quand jaurai remis lenclume en état.', 'La chaleur, ça forge le caractère.']
  },
  {
    id: 'taverne', label: 'Taverne', desc: 'Auberge — point de sauvegarde', savePoint: true,
    x: TOWN_CENTER.x - 220, y: TOWN_CENTER.y + 110, functional: false, color: 0x6b3a3a,
    interiorColor: 0x3b2416, npcName: 'Aubergiste',
    lines: ['Pas de quête pour linstant, mais assieds-toi.', 'On raconte des choses sur les ruines à louest...']
  },
  {
    id: 'echoppe', label: 'Échoppe générale', desc: 'Objets divers — bientôt',
    x: TOWN_CENTER.x + 150, y: TOWN_CENTER.y + 130, functional: false, color: 0x3a6b5a,
    interiorColor: 0x24302a, npcName: 'Commerçant',
    lines: ['Rien à vendre pour linstant, désolé.', 'Repasse plus tard, linventaire arrive.']
  },
  // Maisons et étals pour donner plus de densité
  { id: 'house_1', label: 'Maison', desc: 'Foyer', x: TOWN_CENTER.x - 60, y: TOWN_CENTER.y - 160, functional: false, color: 0x6b4f3a, interiorColor: 0x3a2a1f },
  { id: 'house_2', label: 'Maison', desc: 'Foyer', x: TOWN_CENTER.x + 80, y: TOWN_CENTER.y - 160, functional: false, color: 0x5a7042, interiorColor: 0x24302a },
  { id: 'house_3', label: 'Maison', desc: 'Foyer', x: TOWN_CENTER.x - 320, y: TOWN_CENTER.y + 40, functional: false, color: 0x7a5a4a, interiorColor: 0x3b2b1f },
  { id: 'stall_1', label: 'Étal', desc: 'Fruits & légumes', x: TOWN_CENTER.x + 40, y: TOWN_CENTER.y + 70, functional: false, color: 0x8fbf6f, interiorColor: 0x2b4f3c, npcName: 'Vendeur' },
  { id: 'stall_2', label: 'Étal', desc: 'Tissus', x: TOWN_CENTER.x - 140, y: TOWN_CENTER.y + 40, functional: false, color: 0xc77fb3, interiorColor: 0x3b2430, npcName: 'Étaloir' }
  ,
  {
    id: 'ruines_englouties',
    label: 'Ruines englouties',
    flavor: 'ruines sous-marines, mécanismes brisés',
    x: TOWN.x1 - GAP - BIOME_RADIUS_X, y: TOWN_CENTER.y,
    radiusX: BIOME_RADIUS_X, radiusY: BIOME_RADIUS_Y,
    color: 0x5a7a8a,
    enemyPool: [
      { type: 'golem_debris', count: 12 },
      { type: 'gardien_rouille', count: 1 }
    ]
  },
  {
    id: 'foret_murmurante',
    label: 'Forêt murmurante',
    flavor: 'arbres chantants, brume magique',
    x: TOWN_CENTER.x, y: TOWN.y1 - GAP - BIOME_RADIUS_Y,
    radiusX: BIOME_RADIUS_X, radiusY: BIOME_RADIUS_Y,
    color: 0x2a7a3a,
    enemyPool: [{ type: 'loup_spectral', count: 15 }]
  },
  {
    id: 'marais_brumes',
    label: 'Marais des brumes',
    flavor: 'poisons, illusions, contrées cachées',
    x: TOWN_CENTER.x, y: TOWN.y2 + GAP + BIOME_RADIUS_Y,
    radiusX: BIOME_RADIUS_X, radiusY: BIOME_RADIUS_Y,
    color: 0x4a7a5a,
    enemyPool: [{ type: 'slime', count: 20 }]
  },
  {
    id: 'terres_ecarlates',
    label: 'Terres écarlates',
    flavor: 'désert, marchands nomades',
    x: TOWN.x2 + GAP + BIOME_RADIUS_X, y: TOWN_CENTER.y,
    radiusX: BIOME_RADIUS_X, radiusY: BIOME_RADIUS_Y,
    color: 0xd98a3d,
    enemyPool: [{ type: 'gobelin', count: 18 }]
  }
];
