import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CnfFood {
  food_code: number;
  food_description: string;
}

interface CnfNutrientAmount {
  nutrient_name_id: number;
  nutrient_value: number;
}

interface NormalizedFood {
  id: string;
  name: string;
  source: "cnf";
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sodium?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  vitamin_c?: number;
  vitamin_a?: number;
  micronutrients: Record<string, number>;
}

// CNF nutrient ID mappings (per 100g)
const CNF_NUTRIENT_IDS: Record<string, number> = {
  energy: 208,
  protein: 203,
  fat: 204,
  carbs: 205,
  fiber: 291,
  sodium: 307,
  calcium: 301,
  iron: 303,
  potassium: 306,
  vitamin_c: 401,
  vitamin_a: 319,
};

// Reverse map: nutrient_name_id -> field name
const NUTRIENT_ID_TO_FIELD = new Map<number, string>(
  Object.entries(CNF_NUTRIENT_IDS).map(([field, id]) => [id, field]),
);

// Module-level cache for the full food list
let cnfFoodsCache: CnfFood[] | null = null;

async function getAllCnfFoods(): Promise<CnfFood[]> {
  if (cnfFoodsCache !== null) return cnfFoodsCache;

  const response = await fetch(
    "https://food-nutrition.canada.ca/api/canadian-nutrient-file/food/?lang=en&type=json",
  );

  if (!response.ok) {
    throw new Error(`CNF food list returned ${response.status}`);
  }

  const data: CnfFood[] = await response.json();
  cnfFoodsCache = data;
  return data;
}

function getNutrientValue(
  amounts: CnfNutrientAmount[],
  fieldName: string,
): number {
  const nutrientId = CNF_NUTRIENT_IDS[fieldName];
  if (nutrientId === undefined) return 0;
  const found = amounts.find((a) => a.nutrient_name_id === nutrientId);
  return found?.nutrient_value ?? 0;
}

function buildMicronutrients(amounts: CnfNutrientAmount[]): Record<string, number> {
  const micros: Record<string, number> = {};
  const microFields = ["fiber", "sodium", "calcium", "iron", "potassium", "vitamin_c", "vitamin_a"];

  for (const field of microFields) {
    const value = getNutrientValue(amounts, field);
    if (value > 0) {
      micros[field] = value;
    }
  }

  return micros;
}

function normalizeFood(food: CnfFood, amounts: CnfNutrientAmount[]): NormalizedFood {
  return {
    id: `cnf-${food.food_code}`,
    name: food.food_description,
    source: "cnf",
    calories: getNutrientValue(amounts, "energy"),
    protein: getNutrientValue(amounts, "protein"),
    fat: getNutrientValue(amounts, "fat"),
    carbs: getNutrientValue(amounts, "carbs"),
    micronutrients: buildMicronutrients(amounts),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let body: { query: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { query } = body;

  let allFoods: CnfFood[];
  try {
    allFoods = await getAllCnfFoods();
  } catch {
    return new Response(
      JSON.stringify({ error: "CNF food list unavailable" }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const keywords = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = allFoods
    .filter((food) => {
      const desc = food.food_description.toLowerCase();
      return keywords.every((kw) => desc.includes(kw));
    })
    .slice(0, 25);

  let results: NormalizedFood[];
  try {
    const nutrientResponses = await Promise.all(
      matches.map((food) =>
        fetch(
          `https://food-nutrition.canada.ca/api/canadian-nutrient-file/nutrientamount/?id=${food.food_code}&lang=en&type=json`,
        ).then((r) => (r.ok ? r.json() : Promise.resolve([])))
      ),
    );

    results = matches.map((food, i) =>
      normalizeFood(food, nutrientResponses[i] as CnfNutrientAmount[])
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "CNF nutrient fetch unavailable" }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify(results),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
