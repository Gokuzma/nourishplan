import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { READY_MEAL_PROMPT_RULES, sanitizeReadyMealFields } from "../_shared/readyMeal.ts";

// Suggests which existing inventory items are ready meals (and estimates
// nutrition for ready meals that have none), with per-serving values. Read-only: the client shows the list and the user
// confirms before anything is written.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_TIMEOUT_MS = 90000;
const MAX_ITEMS = 200;

const SYSTEM_PROMPT = `You review a household's food inventory and pick out the ready meals.
Input: a JSON array of {"id", "food_name", "quantity", "unit", "storage_location"}.
Return ONLY a JSON object: {"items": [{"id": string, "is_ready_meal": true, "ready_meal_slots": string[], "serving_grams": number|null, "serving_calories": number, "serving_protein_g": number, "serving_carbs_g": number, "serving_fat_g": number}]}
List ONLY the items that are ready meals; leave everything else out. Use each item's id exactly as given.
${READY_MEAL_PROMPT_RULES}
Return ONLY the JSON object — no prose, no markdown fences.`;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonResponse({ success: false, error: "AI not configured" });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth — identity from JWT only (L-013)
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
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

    const { data: rows, error: rowsError } = await adminClient
      .from("inventory_items")
      .select("id, food_name, quantity_remaining, unit, storage_location")
      .eq("household_id", membership.household_id)
      .is("removed_at", null)
      .eq("is_leftover", false)
      .or("is_ready_meal.eq.false,serving_calories.is.null")
      .limit(MAX_ITEMS);
    if (rowsError) {
      return jsonResponse({ success: false, error: "Could not read inventory" });
    }
    if (!rows || rows.length === 0) {
      return jsonResponse({ success: true, items: [] });
    }

    const input = rows.map((r) => ({
      id: r.id,
      food_name: String(r.food_name).slice(0, 120),
      quantity: r.quantity_remaining,
      unit: r.unit,
      storage_location: r.storage_location,
    }));

    // Inventory text stays in the user message (prompt-injection mitigation)
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
        messages: [{ role: "user", content: JSON.stringify(input) }],
      }),
    });
    if (!aiResponse.ok) {
      return jsonResponse({ success: false, error: "AI classification failed" });
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.content?.[0]?.text ?? "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    let parsed: { items?: unknown };
    try {
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return jsonResponse({ success: false, error: "Could not read the AI reply. Try again." });
    }

    const byId = new Map(rows.map((r) => [r.id, r]));
    const seen = new Set<string>();
    const items = [];
    for (const it of Array.isArray(parsed.items) ? parsed.items : []) {
      if (!it || typeof it !== "object") continue;
      const o = it as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const row = byId.get(id);
      if (!row || seen.has(id)) continue;
      const fields = sanitizeReadyMealFields(o);
      if (!fields.is_ready_meal) continue;
      seen.add(id);
      items.push({
        id,
        food_name: row.food_name,
        quantity_remaining: row.quantity_remaining,
        unit: row.unit,
        storage_location: row.storage_location,
        ...fields,
      });
    }

    return jsonResponse({ success: true, items });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
});
