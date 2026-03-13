import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    "proteins_100g"?: number;
    "fat_100g"?: number;
    "carbohydrates_100g"?: number;
  };
}

interface NormalizedFood {
  id: string;
  name: string;
  source: "off";
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

function hasNutritionData(product: OffProduct): boolean {
  const n = product.nutriments;
  if (!n) return false;
  return (
    n["energy-kcal_100g"] != null ||
    n["proteins_100g"] != null ||
    n["fat_100g"] != null ||
    n["carbohydrates_100g"] != null
  );
}

function normalizeProduct(product: OffProduct): NormalizedFood {
  const n = product.nutriments ?? {};
  const baseName = product.product_name ?? "Unknown";
  const name = product.brands ? `${baseName} - ${product.brands}` : baseName;

  return {
    id: product.code,
    name,
    source: "off",
    calories: n["energy-kcal_100g"] ?? 0,
    protein: n["proteins_100g"] ?? 0,
    fat: n["fat_100g"] ?? 0,
    carbs: n["carbohydrates_100g"] ?? 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let body: { query: string; pageSize?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { query, pageSize = 25 } = body;

  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(pageSize),
    fields: "product_name,nutriments,serving_size,brands,code",
  });

  let data: { products?: OffProduct[] };
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`,
      {
        headers: {
          "User-Agent": "NourishPlan/1.0 (contact@nourishplan.app)",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Open Food Facts API returned ${response.status}`);
    }

    data = await response.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Open Food Facts search unavailable" }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const products = (data.products ?? []).filter(hasNutritionData);
  const normalized = products.map(normalizeProduct);

  return new Response(
    JSON.stringify(normalized),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
