// Monde : une ville-hub rectangulaire (taille fixe, praticable) entourée
// de biomes bien plus grands (~3-4x les dimensions de la ville) accessibles
// par des sorties marquées.
export const WORLD_W = 16000;
export const WORLD_H = 16000;

// Rectangle de la ville (Havre-du-Départ) — grande taille conservée
export const TOWN = {
  id: 'town',
  label: 'Havre-du-Départ',
  x1: 6600, y1: 7000, x2: 9400, y2: 9400
};
export const TOWN_CENTER = { x: (TOWN.x1 + TOWN.x2) / 2, y: (TOWN.y1 + TOWN.y2) / 2 };

// Bâtiments et décors urbains dans la ville pour occuper tout l'espace harmonieusement
export const BUILDINGS = [
  // --- 1. Quartier Central & Places Publiques (Fontaines et Parcs) ---
  {
    id: 'fontaine_centrale', label: 'Grande Fontaine', desc: 'Point d\u2019eau pur et paisible',
    x: TOWN_CENTER.x, y: TOWN_CENTER.y - 180, functional: false, color: 0x4a8a9a, isDecor: true
  },
  {
    id: 'place_est', label: 'Place du Marché Est', desc: 'Espace de repos et kiosques',
    x: TOWN_CENTER.x + 350, y: TOWN_CENTER.y, functional: false, color: 0x5a7a5a, isDecor: true
  },
  {
    id: 'place_ouest', label: 'Jardin Public Ouest', desc: 'Espace boisé de détente',
    x: TOWN_CENTER.x - 350, y: TOWN_CENTER.y, functional: false, color: 0x3d7a4d, isDecor: true
  },

  // --- 2. Bâtiments Commerciaux & Services principaux ---
  {
    id: 'merchant', label: 'Marchand', x: TOWN_CENTER.x + 140, y: TOWN_CENTER.y - 80,
    functional: true, color: 0x7a5a3a
  },
  {
    id: 'forge', label: 'Forge', desc: 'Réparation d\u2019armes — bientôt',
    x: TOWN_CENTER.x - 240, y: TOWN_CENTER.y - 100, functional: false, color: 0x8a5a3a,
    interiorColor: 0x3a2a1f, npcName: 'Forgeron',
    lines: ['Reviens quand j\u2019aurai remis l\u2019enclume en état.', 'La chaleur, ça forge le caractère.']
  },
  {
    id: 'taverne', label: 'Taverne', desc: 'Auberge — point de sauvegarde', savePoint: true,
    x: TOWN_CENTER.x - 240, y: TOWN_CENTER.y + 120, functional: false, color: 0x6b3a3a,
    interiorColor: 0x3b2416, npcName: 'Aubergiste',
    lines: ['Pas de quête pour l\u2019instant, mais assieds-toi.', 'On raconte des choses sur les ruines à l\u2019ouest...']
  },
  {
    id: 'echoppe', label: 'Échoppe générale', desc: 'Objets divers — bientôt',
    x: TOWN_CENTER.x + 160, y: TOWN_CENTER.y + 140, functional: false, color: 0x3a6b5a,
    interiorColor: 0x24302a, npcName: 'Commerçant',
    lines: ['Rien à vendre pour l\u2019instant, désolé.', 'Repasse plus tard, l\u2019inventaire arrive.']
  },

  // --- 3. Quartier Nord ---
  {
    id: 'house_north_1', label: 'Maison Nord', desc: 'Résidence',
    x: TOWN_CENTER.x - 300, y: TOWN_CENTER.y - 550, functional: false, color: 0x6b4f3a, interiorColor: 0x3a2a1f
  },
  {
    id: 'house_north_2', label: 'Maison Nord', desc: 'Résidence',
    x: TOWN_CENTER.x, y: TOWN_CENTER.y - 550, functional: false, color: 0x5a7042, interiorColor: 0x24302a
  },
  {
    id: 'house_north_3', label: 'Maison Nord', desc: 'Résidence',
    x: TOWN_CENTER.x + 300, y: TOWN_CENTER.y - 550, functional: false, color: 0x7a5a4a, interiorColor: 0x3b2b1f
  },
  {
    id: 'boulangerie', label: 'Boulangerie', desc: 'Pains et galettes',
    x: TOWN_CENTER.x - 150, y: TOWN_CENTER.y - 360, functional: false, color: 0x9c7a4d, interiorColor: 0x42301f, npcName: 'Boulanger',
    lines: ['Le pain tout chaud sort du four !', 'Attention à la suie.']
  },
  {
    id: 'apothicaire', label: 'Apothicaire', desc: 'Remèdes et plantes',
    x: TOWN_CENTER.x + 180, y: TOWN_CENTER.y - 360, functional: false, color: 0x4a7a65, interiorColor: 0x203b30, npcName: 'Herboriste',
    lines: ['Les champignons des marécages sont toxiques.', 'Besoin d\u2019un onguent ?']
  },

  // --- 4. Quartier Sud ---
  {
    id: 'house_south_1', label: 'Maison Sud', desc: 'Résidence',
    x: TOWN_CENTER.x - 300, y: TOWN_CENTER.y + 450, functional: false, color: 0x6b4f3a, interiorColor: 0x3a2a1f
  },
  {
    id: 'house_south_2', label: 'Maison Sud', desc: 'Résidence',
    x: TOWN_CENTER.x, y: TOWN_CENTER.y + 450, functional: false, color: 0x5a7042, interiorColor: 0x24302a
  },
  {
    id: 'house_south_3', label: 'Maison Sud', desc: 'Résidence',
    x: TOWN_CENTER.x + 300, y: TOWN_CENTER.y + 450, functional: false, color: 0x7a5a4a, interiorColor: 0x3b2b1f
  },
  {
    id: 'etables', label: 'Étables', desc: 'Bêtes de somme',
    x: TOWN_CENTER.x - 160, y: TOWN_CENTER.y + 650, functional: false, color: 0x5e4530, interiorColor: 0x2e2015, npcName: 'Fermier',
    lines: ['Les bêtes sont calmes aujourd\u2019hui.', 'Bonne route dans les biomes !']
  },
  {
    id: 'tanerie', label: 'Tanerie', desc: 'Cuirs et peaux',
    x: TOWN_CENTER.x + 160, y: TOWN_CENTER.y + 650, functional: false, color: 0x6b533a, interiorColor: 0x36281b, npcName: 'Tanneur',
    lines: ['Le cuir protège bien des griffes.', 'J\u2019attends des peaux de loups spectraux.']
  },

  // --- 5. Quartier Est ---
  {
    id: 'house_east_1', label: 'Maison Est', desc: 'Résidence',
    x: TOWN_CENTER.x + 600, y: TOWN_CENTER.y - 250, functional: false, color: 0x705242, interiorColor: 0x38281d
  },
  {
    id: 'house_east_2', label: 'Maison Est', desc: 'Résidence',
    x: TOWN_CENTER.x + 600, y: TOWN_CENTER.y + 250, functional: false, color: 0x4f6070, interiorColor: 0x222c36
  },
  {
    id: 'stall_fruits', label: 'Étal de Marché', desc: 'Fruits & Légumes',
    x: TOWN_CENTER.x + 450, y: TOWN_CENTER.y - 80, functional: false, color: 0x8fbf6f, interiorColor: 0x2b4f3c, npcName: 'Marchand ambulant',
    lines: ['Fraîchement cueillis aux abords de la forêt !']
  },

  // --- 6. Quartier Ouest ---
  {
    id: 'house_west_1', label: 'Maison Ouest', desc: 'Résidence',
    x: TOWN_CENTER.x - 600, y: TOWN_CENTER.y - 250, functional: false, color: 0x705242, interiorColor: 0x38281d
  },
  {
    id: 'house_west_2', label: 'Maison Ouest', desc: 'Résidence',
    x: TOWN_CENTER.x - 600, y: TOWN_CENTER.y + 250, functional: false, color: 0x4f6070, interiorColor: 0x222c36
  },
  {
    id: 'stall_tissus', label: 'Étal de Tissus', desc: 'Étoffes et vêture',
    x: TOWN_CENTER.x - 450, y: TOWN_CENTER.y + 80, functional: false, color: 0xc77fb3, interiorColor: 0x3b2430, npcName: 'Tisserande',
    lines: ['De jolies couleurs pour vos voyages.']
  },

  // --- 7. Maisons et décorations de périphérie (pour combler les grands espaces vides) ---
  {
    id: 'hut_nw', label: 'Cabane des Gardes', desc: 'Poste de surveillance nord-ouest',
    x: TOWN_CENTER.x - 700, y: TOWN_CENTER.y - 700, functional: false, color: 0x5a4a3a, interiorColor: 0x292019
  },
  {
    id: 'hut_ne', label: 'Hutte du Pêcheur', desc: 'Réserve d\u2019eau',
    x: TOWN_CENTER.x + 700, y: TOWN_CENTER.y - 700, functional: false, color: 0x5a4a3a, interiorColor: 0x292019
  },
  {
    id: 'hut_sw', label: 'Pavillon Sud-Ouest', desc: 'Entrepôt',
    x: TOWN_CENTER.x - 700, y: TOWN_CENTER.y + 700, functional: false, color: 0x5a4a3a, interiorColor: 0x292019
  },
  {
    id: 'hut_se', label: 'Pavillon Sud-Est', desc: 'Dépôt de vivres',
    x: TOWN_CENTER.x + 700, y: TOWN_CENTER.y + 700, functional: false, color: 0x5a4a3a, interiorColor: 0x292019
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
// de la ville — largement de quoi explorer.
const BIOME_RADIUS_X = 2600;
const BIOME_RADIUS_Y = 1900;
const GAP = 500; // "no man's land" entre la ville et chaque biome

export const ZONES = [
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
