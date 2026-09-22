// Mahsulot subkategoriyalari. Har bir asosiy kategoriya uchun ro'yxat.
// labelKey — translations.js'dagi tarjima kaliti (t(labelKey) qaytaradi).
export const SUBCATEGORIES = {
  flooring: [
    { id: 'laminat', labelKey: 'subFlooringLaminat' },
    { id: 'linoleum', labelKey: 'subFlooringLinoleum' },
    { id: 'spc', labelKey: 'subFlooringSpc' },
    { id: 'parket', labelKey: 'subFlooringParket' },
    { id: 'floor-tiles', labelKey: 'subFlooringTiles' },
    { id: 'floor-carpet', labelKey: 'subFlooringCarpet' },
  ],
  walls: [
    { id: 'wallpaper', labelKey: 'subWallsWallpaper' },
    { id: 'paint', labelKey: 'subWallsPaint' },
    { id: 'putty-primer', labelKey: 'subWallsPutty' },
    { id: 'decorative-plaster', labelKey: 'subWallsPlaster' },
    { id: 'wall-panels', labelKey: 'subWallsPanels' },
    { id: 'photo-wallpaper', labelKey: 'subWallsPhoto' },
  ],
  ceiling: [
    { id: 'stretch', labelKey: 'subCeilingStretch' },
    { id: 'drywall', labelKey: 'subCeilingDrywall' },
    { id: 'plastic-panels', labelKey: 'subCeilingPanels' },
    { id: 'ceiling-tiles', labelKey: 'subCeilingTiles' },
    { id: 'ceiling-paint', labelKey: 'subCeilingPaint' },
  ],
  tiles: [
    { id: 'floor-tiles', labelKey: 'subTilesFloor' },
    { id: 'wall-tiles', labelKey: 'subTilesWall' },
    { id: 'porcelain', labelKey: 'subTilesPorcelain' },
    { id: 'mosaic', labelKey: 'subTilesMosaic' },
    { id: 'adhesive-grout', labelKey: 'subTilesAdhesive' },
  ],
  doors: [
    { id: 'interior', labelKey: 'subDoorsInterior' },
    { id: 'entry', labelKey: 'subDoorsEntry' },
    { id: 'handles-hardware', labelKey: 'subDoorsHardware' },
    { id: 'thresholds', labelKey: 'subDoorsThresholds' },
  ],
  plumbing: [
    { id: 'toilet-bidet', labelKey: 'subPlumbingToilet' },
    { id: 'mixers', labelKey: 'subPlumbingMixers' },
    { id: 'shower-bathtub', labelKey: 'subPlumbingShower' },
    { id: 'sink', labelKey: 'subPlumbingSink' },
    { id: 'pipes-fittings', labelKey: 'subPlumbingPipes' },
    { id: 'accessories', labelKey: 'subPlumbingAccessories' },
  ],
  electrical: [
    { id: 'switches', labelKey: 'subElectricalSwitches' },
    { id: 'lamps', labelKey: 'subElectricalLamps' },
    { id: 'led', labelKey: 'subElectricalLed' },
    { id: 'cables', labelKey: 'subElectricalCables' },
    { id: 'breakers', labelKey: 'subElectricalBreakers' },
    { id: 'boxes', labelKey: 'subElectricalBoxes' },
  ],
  furniture: [
    { id: 'furniture', labelKey: 'subFurnitureFurniture' },
    { id: 'plinth', labelKey: 'subFurniturePlinth' },
    { id: 'curtains', labelKey: 'subFurnitureCurtains' },
    { id: 'carpet', labelKey: 'subFurnitureCarpet' },
    { id: 'decor', labelKey: 'subFurnitureDecor' },
    { id: 'mirror', labelKey: 'subFurnitureMirror' },
  ],
}

export function subcategoriesFor(category) {
  return SUBCATEGORIES[category] || []
}