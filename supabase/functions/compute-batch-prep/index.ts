import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecipeIngredientRow {
  ingredient_name: string;
  quantity_grams: number;
}

interface RecipeRow {
  id: string;
  name: string;
  servings: number;
  instructions: unknown[] | null;
  freezer_friendly: boolean | null;
  freezer_shelf_life_weeks: number | null;
  recipe_ingredients: RecipeIngredientRow[];
}

interface SlotRow {
  id: string;
  plan_id: string;
  day_index: number;
  slot_name: string;
  meal_id: string | null;
  is_locked: boolean;
}

interface MealItemRow {
  meal_id: string;
  item_id: string;
  item_type: string;
}

interface ScheduleSlotRow {
  day_of_week: number;
  slot_name: string;
  status: string;
}

interface StorageHint {
  recipe_id: string;
  storage: "fridge" | "freezer";
  shelf_life_days: number | null;
}

interface SessionRow {
  session_id: string;
  label: string;
  day_index: number;
  slot_name: string;
  recipe_ids: string[];
  total_prep_minutes: number;
  shared_ingredients_callout: string;
  equipment_callout: string;
  storage_hints: StorageHint[];
}

interface ReassignmentRow {
  slot_id: string;
  new_day_index: number;
  new_slot_name: string;
  reason: string;
}

interface BatchPrepRequest {
  planId: string;
  householdId: string;
  weekStart: string;
}

interface ClaudeResponse {
  sessions: SessionRow[];
  reassignments: ReassignmentRow[];
  total_time_minutes: number;
}

function sanitizeString(s: string): string {
  return s.replace(/[\x00-\x1F\x7F]/g, "");
}

const SYSTEM_PROMPT = `You are a batch prep planner for a household's weekly meal plan.

Input:
{
  weekStart: "YYYY-MM-DD",
  slots: [{ id, day_index, slot_name, meal_id, recipe_id, schedule_status: 'prep'|'consume'|'quick'|'away' }],
  recipes: [{ id, name, instructions: [...], freezer_friendly, freezer_shelf_life_weeks, ingredients: [{name, quantity_grams}] }]
}

Task: Produce an optimal batch prep schedule for the week.

Rules:
1. Identify shared ingredients across recipes — group recipes that share significant ingredients (e.g., 2+ cups of the same grain)
2. Identify shared equipment — group recipes that use the same oven/pot at compatible temperatures
3. Prefer cooking large batches of base ingredients ONCE for multiple meals
4. For each recipe, decide storage: "fridge" if consumed within 3 days of the prep session; "freezer" if consumed later AND the recipe is freezer_friendly=true; otherwise "fridge" with a shorter shelf-life note
5. If a consume slot has no preceding prep session in the week, find the nearest prep slot (prefer preceding, fall back to following) and reassign the recipe. Include the reassignment in reassignments[]
6. Respect freezer_shelf_life_weeks — never recommend freezing a recipe longer than its shelf life

Return ONLY this JSON shape (no prose, no markdown fences):
{
  "sessions": [
    {
      "session_id": "generated-key-1",
      "label": "Sunday afternoon — shared rice & beans",
      "day_index": 0,
      "slot_name": "Lunch",
      "recipe_ids": ["uuid", "uuid"],
      "total_prep_minutes": 35,
      "shared_ingredients_callout": "2 cups rice cooked once for 3 meals",
      "equipment_callout": "Uses the large pot for all three",
      "storage_hints": [
        { "recipe_id": "uuid", "storage": "fridge", "shelf_life_days": 3 },
        { "recipe_id": "uuid", "storage": "freezer", "shelf_life_days": null }
      ]
    }
  ],
  "reassignments": [
    { "slot_id": "uuid", "new_day_index": 0, "new_slot_name": "Lunch", "reason": "Moved to shared cooking session" }
  ],
  "total_time_minutes": 90
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body: BatchPrepRequest = await req.json();
    const { planId, householdId, weekStart } = body;

    if (!planId || !householdId || !weekStart) {
      return new Response(
        JSON.stringify({ success: false, error: "planId, householdId, and weekStart are required" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "AI generation not configured" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // L-025 auth: validate internally
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid auth token" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { data: membership } = await adminClient
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("household_id", householdId)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ success: false, error: "User is not a member of this household" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Verify planId belongs to this household (WR-04: prevent cross-household plan mutation)
    const { data: plan } = await adminClient
      .from("meal_plans")
      .select("id")
      .eq("id", planId)
      .eq("household_id", householdId)
      .maybeSingle();

    if (!plan) {
      return new Response(
        JSON.stringify({ success: false, error: "Plan not found or access denied" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Shared rate limit (R-01: 20/day across all AI calls)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentJobCount } = await adminClient
      .from("plan_generations")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .gt("created_at", twentyFourHoursAgo);

    if ((recentJobCount ?? 0) >= 20) {
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit exceeded. Maximum 20 AI calls per 24 hours." }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Fetch plan data, recipes, and schedule in parallel
    const [slotsResult, recipesResult, scheduleResult] = await Promise.all([
      adminClient.from("meal_plan_slots")
        .select("id, plan_id, day_index, slot_name, meal_id, is_locked")
        .eq("plan_id", planId),
      adminClient.from("recipes")
        .select("id, name, servings, instructions, freezer_friendly, freezer_shelf_life_weeks, recipe_ingredients(ingredient_name, quantity_grams)")
        .eq("household_id", householdId)
        .is("deleted_at", null),
      adminClient.from("member_schedule_slots")
        .select("day_of_week, slot_name, status")
        .eq("household_id", householdId),
    ]);

    const slots: SlotRow[] = slotsResult.data ?? [];
    const recipes: RecipeRow[] = (recipesResult.data ?? []) as RecipeRow[];

    // L-008 Snack normalisation: "Snack" in schedule DB → "Snacks" in plan grid
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const scheduleStatus: Record<string, string> = {};
    for (const ss of (scheduleResult.data ?? []) as ScheduleSlotRow[]) {
      const normalizedSlotName = ss.slot_name === "Snack" ? "Snacks" : capitalize(ss.slot_name);
      scheduleStatus[`${ss.day_of_week}_${normalizedSlotName}`] = ss.status;
    }

    // Bridge meal_plan_slots → meals → recipe_id via meal_items
    const mealIds = slots.filter(s => s.meal_id).map(s => s.meal_id as string);
    let mealToRecipe: Record<string, string> = {};
    if (mealIds.length > 0) {
      const { data: mealItems } = await adminClient
        .from("meal_items")
        .select("meal_id, item_id, item_type")
        .in("meal_id", mealIds)
        .eq("item_type", "recipe");
      for (const mi of (mealItems ?? []) as MealItemRow[]) {
        mealToRecipe[mi.meal_id] = mi.item_id;
      }
    }

    // Build slot payload for Claude
    const slotsForClaude = slots.map(s => ({
      id: s.id,
      day_index: s.day_index,
      slot_name: s.slot_name,
      meal_id: s.meal_id,
      recipe_id: s.meal_id ? mealToRecipe[s.meal_id] ?? null : null,
      schedule_status: scheduleStatus[`${s.day_index}_${s.slot_name}`] ?? "quick",
    }));

    const recipesForClaude = recipes.map(r => ({
      id: r.id,
      name: sanitizeString(r.name),
      instructions: r.instructions ?? [],
      freezer_friendly: r.freezer_friendly ?? false,
      freezer_shelf_life_weeks: r.freezer_shelf_life_weeks ?? null,
      ingredients: (r.recipe_ingredients ?? []).map((i: RecipeIngredientRow) => ({
        name: sanitizeString(i.ingredient_name),
        quantity_grams: i.quantity_grams,
      })),
    }));

    // Model selection: Sonnet when > 4 recipes, Haiku otherwise
    const recipeCount = recipes.length;
    const model = recipeCount > 4 ? "claude-sonnet-4-5" : "claude-haiku-4-5";

    // Insert plan_generations row with kind='batch_prep'
    const { data: jobRow } = await adminClient
      .from("plan_generations")
      .insert({
        household_id: householdId,
        plan_id: planId,
        triggered_by: user.id,
        status: "running",
        kind: "batch_prep",
        priority_order: [],
      })
      .select("id")
      .single();

    const jobId = jobRow?.id;

    const userInput = {
      weekStart: sanitizeString(weekStart),
      slots: slotsForClaude,
      recipes: recipesForClaude,
    };

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(userInput) }],
      }),
    });

    if (!claudeRes.ok) {
      if (jobId) {
        await adminClient.from("plan_generations").update({ status: "error", error_message: `Claude API ${claudeRes.status}`, completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "AI service error" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const claudeJson = await claudeRes.json();
    const text = claudeJson.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      if (jobId) {
        await adminClient.from("plan_generations").update({ status: "error", error_message: "No JSON in response", completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "AI returned no parseable JSON" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    let parsed: ClaudeResponse;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      if (jobId) {
        await adminClient.from("plan_generations").update({ status: "error", error_message: "JSON parse error", completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "AI returned malformed JSON" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // D-16: Write reassignments back to meal_plan_slots
    // L-018: MOVE existing meal_id rows via UPDATE — never INSERT new meals
    for (const r of parsed.reassignments ?? []) {
      if (!r.slot_id || typeof r.new_day_index !== "number" || !r.new_slot_name) continue;
      await adminClient
        .from("meal_plan_slots")
        .update({
          day_index: r.new_day_index,
          slot_name: r.new_slot_name,
          is_override: true,
        })
        .eq("id", r.slot_id)
        .eq("plan_id", planId); // SAFETY: scope to this plan only
    }

    if (jobId) {
      await adminClient.from("plan_generations").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", jobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessions: parsed.sessions ?? [],
        reassignments: parsed.reassignments ?? [],
        total_time_minutes: parsed.total_time_minutes ?? 0,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
