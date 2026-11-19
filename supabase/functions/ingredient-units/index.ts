import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DISPLAY_UNIT_RULES, sanitizeDisplayUnit } from "../_shared/displayUnits.ts";

// One-time conversion of a household's existing recipe ingredients from grams
// to recipe-style amounts ("2", "1 cup", "3 cloves"). Only display_amount and
// display_unit are written; quantity_grams is never touched. Each call handles
// one batch and reports how many are left, so the client can call again.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_TIMEOUT_MS = 90000;
const BATCH_SIZE = 120;

const SYSTEM_PROMPT = `You convert recipe ingredient amounts from grams into how a normal home recipe writes them.
Input: a JSON array of {"i": number, "recipe": string, "name": string, "grams": number}.
Return ONLY a JSON object: {"items": [{"i": number, "display_amount": number, "display_unit": string}]} with one entry per input, same "i".
The display amount must describe the same quantity as the grams.
${DISPLAY_UNIT_RULES}
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
      .from("recipe_ingredients")
      .select("id, ingredient_type, ingredient_name, quantity_grams, recipes!inner(household_id, name)")
      .eq("recipes.household_id", membership.household_id)
      .is("display_unit", null)
      .limit(BATCH_SIZE);
    if (rowsError) {
      return jsonResponse({ success: false, error: "Could not read recipes" });
    }
    if (!rows || rows.length === 0) {
      return jsonResponse({ success: true, updated: 0, remaining: 0 });
    }

    // Sub-recipes are measured by weight; everything else goes to the AI.
    const updates = new Map<string, { display_amount: number; display_unit: string }>();
    const foods = rows.filter((r) => r.ingredient_type === "food" && r.ingredient_name);
    for (const r of rows) {
      if (!foods.includes(r)) updates.set(r.id, { display_amount: Number(r.quantity_grams), display_unit: "g" });
    }

    if (foods.length > 0) {
      const input = foods.map((r, i) => ({
        i,
        recipe: String((r.recipes as unknown as { name: string }).name ?? "").slice(0, 80),
        name: String(r.ingredient_name).slice(0, 120),
        grams: Number(r.quantity_grams),
      }));
      // Recipe text stays in the user message (prompt-injection mitigation)
      const aiResponse = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: JSON.stringify(input) }],
        }),
      });
      if (!aiResponse.ok) {
        return jsonResponse({ success: false, error: "AI conversion failed" });
      }
      const aiData = await aiResponse.json();
      const aiText = aiData.content?.[0]?.text ?? "";
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      let parsed: { items?: unknown } = {};
      try {
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        return jsonResponse({ success: false, error: "Could not read the AI reply. Try again." });
      }
      for (const it of Array.isArray(parsed.items) ? parsed.items : []) {
        const o = (it ?? {}) as Record<string, unknown>;
        const row = typeof o.i === "number" ? foods[o.i] : undefined;
        if (!row || updates.has(row.id)) continue;
        const d = sanitizeDisplayUnit(o);
        if (d.display_amount !== null && d.display_unit !== null) {
          updates.set(row.id, { display_amount: d.display_amount, display_unit: d.display_unit });
        }
      }
      // Anything the AI skipped keeps its weight, so it isn't retried forever.
      for (const r of foods) {
        if (!updates.has(r.id)) updates.set(r.id, { display_amount: Number(r.quantity_grams), display_unit: "g" });
      }
    }

    const entries = [...updates.entries()];
    for (let i = 0; i < entries.length; i += 20) {
      await Promise.all(
        entries.slice(i, i + 20).map(([id, d]) =>
          adminClient.from("recipe_ingredients").update(d).eq("id", id).is("display_unit", null)
        ),
      );
    }

    const { count } = await adminClient
      .from("recipe_ingredients")
      .select("id, recipes!inner(household_id)", { count: "exact", head: true })
      .eq("recipes.household_id", membership.household_id)
      .is("display_unit", null);

    return jsonResponse({ success: true, updated: entries.length, remaining: count ?? 0 });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return jsonResponse({ success: false, error: "Took too long. Try again." });
    }
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
});
