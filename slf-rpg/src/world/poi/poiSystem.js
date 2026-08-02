import { POI_TYPES } from './poiRegistry.js';

export function createPoiInteraction(poi) {
  const type = POI_TYPES[poi.type] || POI_TYPES.ruin;
  return {
    id: poi.id,
    label: poi.label || type.label,
    description: getPoiDescription(poi.type),
    color: poi.color || type.color,
    type: poi.type,
    x: poi.x,
    y: poi.y
  };
}

function getPoiDescription(type) {
  switch (type) {
    case 'merchant':
      return 'Un marchand propose des armes et des échanges.';
    case 'camp':
      return 'Un camp de fortune, parfait pour reprendre son souffle.';
    case 'cave':
      return 'Une grotte sombre où les créatures se regroupent.';
    case 'fortress':
      return 'Une forteresse abandonnée, riche en danger et en trésors.';
    default:
      return 'Des ruines anciennes, pleines de secrets et de dangers.';
  }
}
