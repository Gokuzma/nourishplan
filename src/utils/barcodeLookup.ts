export interface BarcodeProduct {
  food_name: string
  brand: string
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  serving_size: string | null
  barcode: string
}

const barcodeCache = new Map<string, BarcodeProduct | null>()

export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const cached = barcodeCache.get(barcode)
  if (cached !== undefined) return cached

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`
    )
    if (!res.ok) {
      barcodeCache.set(barcode, null)
      return null
    }
    const json = await res.json()
    if (json.status !== 1 || !json.product) {
      barcodeCache.set(barcode, null)
      return null
    }
    const p = json.product
    const result: BarcodeProduct = {
      food_name: p.product_name ?? p.product_name_en ?? '',
      brand: p.brands ?? '',
      calories: p.nutriments?.['energy-kcal_100g'] ?? null,
      protein: p.nutriments?.proteins_100g ?? null,
      fat: p.nutriments?.fat_100g ?? null,
      carbs: p.nutriments?.carbohydrates_100g ?? null,
      serving_size: p.serving_size ?? null,
      barcode,
    }
    barcodeCache.set(barcode, result)
    return result
  } catch {
    barcodeCache.set(barcode, null)
    return null
  }
}
