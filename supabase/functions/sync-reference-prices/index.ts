// Pulls current Ontario retail food prices from Statistics Canada
// (table 18-10-0245, monthly scanner data) and upserts them into
// reference_food_prices keyed by canonical ingredient name. Free, official,
// no auth/bot-detection — runs fine from the cloud, unlike store APIs.
//
// Auth: x-internal-secret must match INTERNAL_FN_SECRET (cron/manual only).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STATCAN_PID = 18100245;
const ONTARIO_GEO_ID = 6;
const WDS = "https://www150.statcan.gc.ca/t1/wds/rest";

// Inlined from src/utils/referencePrices.ts (Deno can't import src/).
function parseQuantityToGrams(label: string): number | null {
  const lower = label.toLowerCase();
  if (/per\s+kilogram|per\s+kg\b/.test(lower)) return 1000;
  const match = lower.match(/(\d+(?:\.\d+)?)\s*(kilograms?|kg|grams?|g|litres?|l|millilitres?|ml)\b/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2];
  if (unit.startsWith("kilogram") || unit === "kg" || unit.startsWith("litre") || unit === "l") {
    return value * 1000;
  }
  return value;
}

// StatCan product id → canonical ingredient names recipes actually use.
// gramsOverride supplies a documented mass for count-based items the label
// parser can't convert (eggs/avocado/lemon/lime).
interface MapEntry {
  aliases: string[];
  gramsOverride?: number;
}
const PRODUCT_MAP: Record<number, MapEntry> = {
  1: { aliases: ["stewing beef", "beef stew meat"] },
  4: { aliases: ["ground beef", "lean ground beef", "minced beef"] },
  5: { aliases: ["pork loin", "pork chop", "pork chops"] },
  42: { aliases: ["pork shoulder"] },
  7: { aliases: ["whole chicken", "chicken"] },
  8: { aliases: ["chicken breast", "chicken breasts", "boneless chicken breast"] },
  9: { aliases: ["chicken thigh", "chicken thighs"] },
  43: { aliases: ["chicken drumstick", "chicken drumsticks"] },
  10: { aliases: ["bacon"] },
  78: { aliases: ["salmon", "salmon fillet"] },
  79: { aliases: ["shrimp", "prawns"] },
  12: { aliases: ["canned tuna", "tuna"] },
  13: { aliases: ["milk"] },
  16: { aliases: ["cream", "heavy cream", "whipping cream"] },
  17: { aliases: ["butter", "unsalted butter", "salted butter"] },
  83: { aliases: ["margarine"] },
  18: { aliases: ["cheese", "cheddar", "cheddar cheese", "block cheese"] },
  19: { aliases: ["yogurt", "yoghurt", "greek yogurt", "plain yogurt"] },
  20: { aliases: ["egg", "eggs"], gramsOverride: 600 },
  21: { aliases: ["apple", "apples"] },
  22: { aliases: ["orange", "oranges"] },
  24: { aliases: ["banana", "bananas"] },
  25: { aliases: ["pear", "pears"] },
  26: { aliases: ["lemon", "lemons"], gramsOverride: 100 },
  45: { aliases: ["lime", "limes"], gramsOverride: 67 },
  27: { aliases: ["grapes"] },
  84: { aliases: ["strawberry", "strawberries"] },
  29: { aliases: ["avocado", "avocados"], gramsOverride: 170 },
  46: { aliases: ["potato", "potatoes"] },
  47: { aliases: ["sweet potato", "sweet potatoes"] },
  31: { aliases: ["tomato", "tomatoes"] },
  32: { aliases: ["cabbage"] },
  33: { aliases: ["carrot", "carrots"] },
  34: { aliases: ["onion", "onions", "yellow onion", "white onion"] },
  38: { aliases: ["mushroom", "mushrooms"] },
  39: { aliases: ["broccoli"], gramsOverride: 450 },
  40: { aliases: ["pepper", "bell pepper", "peppers", "red pepper", "green pepper"] },
  85: { aliases: ["squash"] },
  86: { aliases: ["salad greens", "mixed greens", "spinach"] },
  52: { aliases: ["frozen broccoli"] },
  55: { aliases: ["frozen peas", "peas"] },
  53: { aliases: ["frozen corn", "corn"] },
  56: { aliases: ["bread", "white bread"] },
  57: { aliases: ["pasta", "spaghetti", "penne", "macaroni"] },
  93: { aliases: ["brown rice"] },
  94: { aliases: ["rice", "white rice"] },
  58: { aliases: ["cereal"] },
  59: { aliases: ["flour", "all-purpose flour", "wheat flour"] },
  60: { aliases: ["sugar", "white sugar", "granulated sugar"] },
  96: { aliases: ["olive oil", "extra virgin olive oil"] },
  66: { aliases: ["vegetable oil"] },
  95: { aliases: ["canola oil"] },
  65: { aliases: ["ketchup"] },
  68: { aliases: ["peanut butter"] },
  69: { aliases: ["mayonnaise", "mayo"] },
  71: { aliases: ["canned tomatoes", "crushed tomatoes", "diced tomatoes"] },
  73: { aliases: ["canned beans", "black beans", "kidney beans", "chickpeas"] },
  74: { aliases: ["lentils", "dried lentils"] },
  102: { aliases: ["tofu"] },
  103: { aliases: ["hummus"] },
  104: { aliases: ["salsa"] },
  105: { aliases: ["pasta sauce", "marinara", "marinara sauce"] },
  107: { aliases: ["almond", "almonds"] },
  108: { aliases: ["peanut", "peanuts"] },
  63: { aliases: ["coffee"] },
  61: { aliases: ["apple juice"] },
  62: { aliases: ["orange juice"] },
};

serve(async (req) => {
  const internalSecret = Deno.env.get("INTERNAL_FN_SECRET");
  if (!internalSecret || req.headers.get("x-internal-secret") !== internalSecret) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1. Metadata → product id → label (for quantity parsing).
    const metaRes = await fetch(`${WDS}/getCubeMetadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ productId: STATCAN_PID }]),
    });
    const metaJson = await metaRes.json();
    if (metaJson?.[0]?.status !== "SUCCESS") {
      throw new Error("getCubeMetadata failed");
    }
    const labelById: Record<number, string> = {};
    for (const dim of metaJson[0].object.dimension) {
      if (dim.dimensionNameEn === "Products") {
        for (const m of dim.member) labelById[Number(m.memberId)] = m.memberNameEn;
      }
    }

    // 2. Batch-fetch the latest Ontario price for every mapped product.
    const pids = Object.keys(PRODUCT_MAP).map(Number).filter((pid) => labelById[pid]);
    const dataReq = pids.map((pid) => ({
      productId: STATCAN_PID,
      coordinate: `${ONTARIO_GEO_ID}.${pid}.0.0.0.0.0.0.0.0`,
      latestN: 1,
    }));
    const dataRes = await fetch(`${WDS}/getDataFromCubePidCoordAndLatestNPeriods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataReq),
    });
    const dataJson = await dataRes.json();

    // 3. Build one reference row per alias.
    const rows: Record<string, unknown>[] = [];
    let skipped = 0;
    for (const entry of dataJson) {
      if (entry.status !== "SUCCESS") { skipped++; continue; }
      const coord: string = entry.object.coordinate;
      const pid = Number(coord.split(".")[1]);
      const point = entry.object.vectorDataPoint?.[0];
      if (!point || point.value == null) { skipped++; continue; }

      const map = PRODUCT_MAP[pid];
      const label = labelById[pid] ?? "";
      const grams = map.gramsOverride ?? parseQuantityToGrams(label);
      if (!grams || grams <= 0) { skipped++; continue; }

      const costPer100g = (Number(point.value) / grams) * 100;
      const refPeriod: string = point.refPer;
      for (const alias of map.aliases) {
        rows.push({
          region: "ontario",
          ingredient_name: alias,
          cost_per_100g: Number(costPer100g.toFixed(4)),
          quantity_label: label,
          statcan_product_id: pid,
          source: "statcan",
          ref_period: refPeriod,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await adminClient
        .from("reference_food_prices")
        .upsert(rows, { onConflict: "region,ingredient_name" });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, upserted: rows.length, productsSkipped: skipped }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
});
