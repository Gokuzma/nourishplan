import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DataType = "Foundation" | "SR Legacy" | "Survey (FNDDS)" | "Branded";

const DATA_TYPE_PRIORITY: Record<DataType, number> = {
  "Foundation": 0,
  "SR Legacy": 1,
  "Survey (FNDDS)": 2,
  "Branded": 3,
};

interface UsdaFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients?: Array<{ nutrientNumber: string; value: number }>;
  foodMeasures?: Array<{ disseminationText: string; gramWeight: number }>;
}

interface NormalizedFood {
  fdcId: number;
  name: string;
  source: "usda";
  dataType: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portions: Array<{ description: string; grams: number }>;
}

function getNutrient(
  nutrients: Array<{ nutrientNumber: string; value: number }> | undefined,
  number: string,
): number {
  if (!nutrients) return 0;
  const found = nutrients.find((n) => n.nutrientNumber === number);
  return found?.value ?? 0;
}

function deduplicateByDescription(foods: UsdaFood[]): UsdaFood[] {
  const seen = new Map<string, UsdaFood>();

  for (const food of foods) {
    const key = food.description.toLowerCase();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, food);
      continue;
    }

    const existingPriority = DATA_TYPE_PRIORITY[existing.dataType as DataType] ?? 99;
    const currentPriority = DATA_TYPE_PRIORITY[food.dataType as DataType] ?? 99;

    if (currentPriority < existingPriority) {
      seen.set(key, food);
    }
  }

  return Array.from(seen.values());
}

function normalizeFood(food: UsdaFood): NormalizedFood {
  const portions = (food.foodMeasures ?? []).map((m) => ({
    description: m.disseminationText,
    grams: m.gramWeight,
  }));

  return {
    fdcId: food.fdcId,
    name: food.description,
    source: "usda",
    dataType: food.dataType,
    calories: getNutrient(food.foodNutrients, "208"),
    protein: getNutrient(food.foodNutrients, "203"),
    fat: getNutrient(food.foodNutrients, "204"),
    carbs: getNutrient(food.foodNutrients, "205"),
    portions,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get("USDA_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "USDA API key not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
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
    api_key: apiKey,
    query: query,
    dataType: "Foundation,SR Legacy,Survey (FNDDS),Branded",
    pageSize: String(pageSize),
  });

  let data: { foods?: UsdaFood[] };
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`USDA API returned ${response.status}`);
    }

    data = await response.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "USDA search unavailable" }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const foods = data.foods ?? [];
  const deduplicated = deduplicateByDescription(foods);
  const normalized = deduplicated.map(normalizeFood);

  return new Response(
    JSON.stringify(normalized),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
