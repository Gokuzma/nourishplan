import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { READY_MEAL_PROMPT_RULES, sanitizeReadyMealFields, type ReadyMealFields } from "../_shared/readyMeal.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_TIMEOUT_MS = 60000;
const MAX_INPUT_CHARS = 8000;
const MAX_ITEMS = 100;

const VALID_UNITS = ["g", "kg", "ml", "L", "units"] as const;
const VALID_LOCATIONS = ["pantry", "fridge", "freezer"] as const;

interface ParsedItem extends ReadyMealFields {
  food_name: string;
  quantity: number;
  unit: (typeof VALID_UNITS)[number];
  storage_location: (typeof VALID_LOCATIONS)[number];
  expires_at: string | null;
  purchase_price: number | null;
  brand: string | null;
}

const SYSTEM_PROMPT = `You turn a messy description of groceries into structured inventory items. Input may be: spoken dictation ("two pounds of chicken breast in the freezer, uh, a dozen eggs..."), a typed list, or a pasted spreadsheet (comma/tab separated, possibly with a header row).

Return ONLY a JSON object: {"items": [{"food_name": string, "quantity": number, "unit": "g"|"kg"|"ml"|"L"|"units", "storage_location": "pantry"|"fridge"|"freezer", "expires_at": string|null, "purchase_price": number|null, "brand": string|null, "is_ready_meal": boolean, "ready_meal_slots": string[]|null, "serving_grams": number|null, "serving_calories": number|null, "serving_protein_g": number|null, "serving_carbs_g": number|null, "serving_fat_g": number|null}]}

Rules:
1. food_name: the canonical food, Title Case, no quantities or packaging words ("Chicken Breast", not "2 lbs chicken breasts").
2. Convert quantities to the closest allowed unit: pounds/lbs → kg (1 lb = 0.454 kg, round to 2 decimals), ounces → g (1 oz = 28 g), cups of liquid → ml (1 cup = 250 ml), litres → L. Countable things (eggs, cans, apples, boxes, bags) → "units" with the count ("a dozen eggs" → 12 units; "3 cans of diced tomatoes" → 3 units). If no quantity is given, use 1 "units".
3. storage_location: use what the person says ("in the freezer"). A stated location applies to the items after it until a new location is stated. Otherwise infer sensibly: canned/dry/boxed/oils/spices → pantry; fresh meat/dairy/produce/opened items → fridge; explicitly frozen items or "frozen X" → freezer. Default pantry when genuinely unclear.
4. expires_at: null unless an expiry is stated. Resolve relative dates against today's date given in the user message; format YYYY-MM-DD.
5. purchase_price: null unless a price is clearly stated for that item.
6. brand: null unless a brand name is clearly part of the description.
7. Spreadsheet input: map columns by header names when present (name/item, qty/quantity, unit, location, expiry/expires, price, brand); skip the header row itself; skip empty rows.
8. Split multi-item lines. Ignore filler words, greetings, and anything that is not a food item.
9. If nothing in the input looks like food items, return {"items": []}.
10. ${READY_MEAL_PROMPT_RULES}
11. Return ONLY the JSON object — no prose, no markdown fences.`;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function jsonResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Clamp AI output to what the schema allows — never trust it blindly.
function rawItemCount(raw: unknown): number {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { items?: unknown }).items)) return 0;
  return (raw as { items: unknown[] }).items.length;
}

function sanitizeItems(raw: unknown): ParsedItem[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { items?: unknown }).items)) return [];
  const items = (raw as { items: unknown[] }).items.slice(0, MAX_ITEMS);
  const out: ParsedItem[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const name = typeof o.food_name === "string" ? o.food_name.trim().slice(0, 120) : "";
    if (!name) continue;
    const qty = typeof o.quantity === "number" && isFinite(o.quantity) && o.quantity > 0 ? o.quantity : 1;
    const unit = VALID_UNITS.includes(o.unit as ParsedItem["unit"]) ? (o.unit as ParsedItem["unit"]) : "units";
    const location = VALID_LOCATIONS.includes(o.storage_location as ParsedItem["storage_location"])
      ? (o.storage_location as ParsedItem["storage_location"])
      : "pantry";
    const expires = typeof o.expires_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.expires_at) ? o.expires_at : null;
    const price = typeof o.purchase_price === "number" && isFinite(o.purchase_price) && o.purchase_price >= 0
      ? Math.round(o.purchase_price * 100) / 100
      : null;
    const brand = typeof o.brand === "string" && o.brand.trim() ? o.brand.trim().slice(0, 80) : null;
    out.push({
      food_name: name,
      quantity: Math.round(qty * 100) / 100,
      unit,
      storage_location: location,
      expires_at: expires,
      purchase_price: price,
      brand,
      ...sanitizeReadyMealFields(o),
    });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return jsonResponse({ success: false, error: "input is required" });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonResponse({ success: false, error: "AI parsing not configured" });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth — identity from JWT only (L-013)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return jsonResponse({ success: false, error: "Authorization required" });
    }

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ success: false, error: "Invalid auth token" });
    }

    const { data: membership } = await adminClient
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      return jsonResponse({ success: false, error: "No household found" });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (input.trim().length > MAX_INPUT_CHARS) {
      return jsonResponse({ success: false, error: `That's too long for one batch (limit ${MAX_INPUT_CHARS.toLocaleString("en-CA")} characters). Split it into smaller lists.` });
    }
    const content = input.trim();

    // AI extraction — user input stays in the user message (prompt-injection mitigation)
    const aiResponse = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 12000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today's date is ${today}. Parse these groceries into inventory items:\n\n${content}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return jsonResponse({ success: false, error: "AI parsing failed" });
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.content?.[0]?.text ?? "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return jsonResponse({ success: false, error: "Could not understand that list. Try rephrasing or adding one item per line." });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return jsonResponse({ success: false, error: "Could not understand that list. Try rephrasing or adding one item per line." });
    }

    const items = sanitizeItems(parsed);
    if (items.length === 0) {
      return jsonResponse({ success: false, error: "No food items found in that. Try naming the items with quantities, e.g. \"2 kg rice, a dozen eggs, 3 cans of tuna\"." });
    }

    return jsonResponse({ success: true, items, truncated: rawItemCount(parsed) > MAX_ITEMS, maxItems: MAX_ITEMS });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
});
