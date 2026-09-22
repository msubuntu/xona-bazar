// Mahsulot asosiy xususiyatlari — kategoriya bo'yicha dinamik maydonlar.
// specs (Product.specs Map) da key => qiymat ko'rinishida saqlanadi.
// labelKey / placeholderKey — translations.js'dagi tarjima kalitlari.
// outline: sale formasi Step 2 "Asosiy xususiyatlar" bo'limida ko'rsatiladi.
export const CATEGORY_SPECS = {
  flooring: [
    { key: 'size', labelKey: 'specSize', placeholderKey: 'specSizeFlooringPh', required: false },
    { key: 'thickness', labelKey: 'specThickness', placeholderKey: 'specThicknessPh', required: true },
    { key: 'klass', labelKey: 'specClass', placeholderKey: 'specClassPh', required: true },
    { key: 'color', labelKey: 'specColor', placeholderKey: 'specColorPh', required: false },
  ],
  walls: [
    { key: 'size', labelKey: 'specSize', placeholderKey: 'specSizeWallsPh', required: false },
    { key: 'color', labelKey: 'specColor', placeholderKey: 'specColorPh', required: false },
    { key: 'material', labelKey: 'specMaterial', placeholderKey: 'specMaterialPh', required: true },
  ],
  ceiling: [
    { key: 'size', labelKey: 'specSize', placeholderKey: 'specSizeCeilingPh', required: false },
    { key: 'color', labelKey: 'specColor', placeholderKey: 'specColorPh', required: false },
    { key: 'material', labelKey: 'specMaterial', placeholderKey: 'specMaterialPh', required: true },
  ],
  tiles: [
    { key: 'size', labelKey: 'specSize', placeholderKey: 'specSizeTilesPh', required: true },
    { key: 'thickness', labelKey: 'specThickness', placeholderKey: 'specThicknessPh', required: true },
    { key: 'color', labelKey: 'specColor', placeholderKey: 'specColorPh', required: false },
    { key: 'surface', labelKey: 'specSurface', placeholderKey: 'specSurfacePh', required: false },
  ],
  doors: [
    { key: 'size', labelKey: 'specSize', placeholderKey: 'specSizeDoorsPh', required: true },
    { key: 'color', labelKey: 'specColor', placeholderKey: 'specColorPh', required: false },
    { key: 'material', labelKey: 'specMaterial', placeholderKey: 'specMaterialPh', required: true },
  ],
  plumbing: [
    { key: 'size', labelKey: 'specSize', placeholderKey: 'specSizePlumbingPh', required: false },
    { key: 'color', labelKey: 'specColor', placeholderKey: 'specColorPh', required: false },
    { key: 'material', labelKey: 'specMaterial', placeholderKey: 'specMaterialPh', required: true },
    { key: 'mounting', labelKey: 'specMounting', placeholderKey: 'specMountingPh', required: false },
  ],
  electrical: [
    { key: 'power', labelKey: 'specPower', placeholderKey: 'specPowerPh', required: true },
    { key: 'color', labelKey: 'specColor', placeholderKey: 'specColorPh', required: false },
    { key: 'material', labelKey: 'specMaterial', placeholderKey: 'specMaterialPh', required: false },
  ],
  furniture: [
    { key: 'size', labelKey: 'specSize', placeholderKey: 'specSizeFurniturePh', required: true },
    { key: 'color', labelKey: 'specColor', placeholderKey: 'specColorPh', required: false },
    { key: 'material', labelKey: 'specMaterial', placeholderKey: 'specMaterialPh', required: false },
  ],
}

export function specFieldsFor(category) {
  return CATEGORY_SPECS[category] || []
}