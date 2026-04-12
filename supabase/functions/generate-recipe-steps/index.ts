import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IngredientSnapshot {
  name: string;
  quantity_grams: number;
}

interface RecipeStep {
  id: string;
  text: string;
  duration_minutes: number;
  is_active: boolean;
  ingredients_used: string[];
  equipment: string[];
}

interface GenerateStepsRequest {
  recipeId: string;
  householdId: string;
  recipeName: string;
  servings: number;
  ingredientsSnapshot: IngredientSnapshot[];
  existingSteps?: RecipeStep[];
  notes?: string | null;
}

interface ClaudeResponse {
  instructions: Omit<RecipeStep, "id">[];
  freezer_friendly: boolean;
  freezer_shelf_life_weeks: number | null;
  freezer_reasoning?: string;
  uncertain_user_additions?: { previous_step_text: string; reason: string; suggested_action: "remove" | "keep_as_note" }[];
}

function sanitizeString(s: string): string {
  return s.replace(/[\x00-\x1F\x7F]/g, "");
}

function generateStepId(): string {
  return crypto.randomUUID();
}

const SYSTEM_PROMPT = `You are a cooking instructions generator. Given a recipe name, ingredient list, and servings, produce a complete step-by-step cooking sequence AND a freezer classification as a single JSON object.

Each step must be an object with these exact fields (all required, no extra fields):
- text: string — single imperative sentence describing the action
- duration_minutes: number — estimate of time for this step in whole minutes (0 for instantaneous)
- is_active: boolean — true if hands-on work (chopping, stirring, assembling); false if passive waiting (oven baking, simmering, proofing, marinating)
- ingredients_used: string[] — names of ingredients this step consumes, copied verbatim from the input ingredient list
- equipment: string[] — equipment this step uses (e.g., "oven", "large pot", "cutting board", "blender")

Rules:
1. Return a JSON object only — no prose, no markdown fences, no comments
2. Steps must be ordered chronologically from mise en place to plating
3. is_active=false only when the cook genuinely walks away from the stove — use for preheat, bake, rise, rest
4. Use common equipment names; do not invent brand names
5. Estimate duration_minutes conservatively; a "chop an onion" step is 2 minutes, not 0
6. If the input includes a notes field with freeform text, parse existing instructions from it and rephrase into the standard shape — preserve the cook's intent and any custom ingredients they mention
7. Total duration_minutes across all steps should roughly match typical cook time for the recipe

Also return a freezer classification in the same response. Consider: dairy content (freezes poorly), fresh greens (do not freeze), cooked grains (freeze well), cooked legumes (excellent), raw vegetables (no), sauces and stews (excellent 3-6 months), fried foods (lose texture), breaded items (good before cooking), baked goods (variable).

Return this exact JSON shape:
{
  "instructions": [
    { "text": "...", "duration_minutes": 5, "is_active": true, "ingredients_used": ["onion"], "equipment": ["cutting board"] }
  ],
  "freezer_friendly": true,
  "freezer_shelf_life_weeks": 12,
  "freezer_reasoning": "Soup base freezes excellently for 3 months"
}

If freezer_friendly is false, set freezer_shelf_life_weeks to null.
Output ONLY the JSON object — no other text.`;

const MERGE_INTENT_PROMPT = `You are regenerating cooking steps for a recipe whose ingredients just changed.

You will receive:
- The updated ingredient list
- The previous step sequence that includes user edits (text changes, custom additions, reorderings)

Your task:
1. Produce a new step sequence that reflects the updated ingredients
2. PRESERVE user intent from the previous steps — rephrase where needed but never silently drop a user addition
3. If a user added a custom note (e.g., "do not salt the beans") and the updated ingredients no longer include that ingredient, flag it as UNCERTAIN — DO NOT silently remove

Return the same JSON shape as the fresh generation prompt, plus an "uncertain_user_additions" array:
{
  "instructions": [...new steps...],
  "freezer_friendly": ...,
  "freezer_shelf_life_weeks": ...,
  "uncertain_user_additions": [
    { "previous_step_text": "do not salt the beans", "reason": "ingredient removed", "suggested_action": "remove" }
  ]
}

If no uncertain items, return an empty array for uncertain_user_additions.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body: GenerateStepsRequest = await req.json();
    const { recipeId, householdId, recipeName, servings, ingredientsSnapshot, existingSteps, notes } = body;

    if (!recipeId || !householdId || !recipeName) {
      return new Response(
        JSON.stringify({ success: false, error: "recipeId, householdId, and recipeName are required" }),
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

    // Shared Phase 22 rate limit (D-29 + R-01: raised to 20/day, kind column)
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

    // Find the latest meal_plan for this household to attach this generation row to (plan_id is NOT NULL on plan_generations).
    // For step generation there is no specific plan — use the latest one; if none exists, return an error and ask the client to create a plan first.
    const { data: latestPlan } = await adminClient
      .from("meal_plans")
      .select("id")
      .eq("household_id", householdId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestPlan) {
      return new Response(
        JSON.stringify({ success: false, error: "No meal plan exists for this household. Create a plan before generating steps." }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Rate limit counter row (R-01: kind='steps')
    const { data: jobRow } = await adminClient
      .from("plan_generations")
      .insert({
        household_id: householdId,
        plan_id: latestPlan.id,
        triggered_by: user.id,
        status: "running",
        kind: "steps",
        priority_order: [],
      })
      .select("id")
      .single();

    const jobId = jobRow?.id;

    // Build user message
    const userInput: Record<string, unknown> = {
      recipe_name: sanitizeString(recipeName),
      servings,
      ingredients: ingredientsSnapshot.map(i => ({ name: sanitizeString(i.name), quantity_grams: i.quantity_grams })),
    };
    if (notes) userInput.notes = sanitizeString(notes);
    if (existingSteps && existingSteps.length > 0) {
      userInput.previous_steps = existingSteps.map(s => ({
        text: s.text,
        duration_minutes: s.duration_minutes,
        is_active: s.is_active,
        ingredients_used: s.ingredients_used,
        equipment: s.equipment,
      }));
    }

    const systemPrompt = existingSteps && existingSteps.length > 0 ? MERGE_INTENT_PROMPT : SYSTEM_PROMPT;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        system: systemPrompt,
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

    // Validate shape + assign stable ids (R-02)
    if (!Array.isArray(parsed.instructions)) {
      if (jobId) {
        await adminClient.from("plan_generations").update({ status: "error", error_message: "Invalid instructions shape", completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "AI returned invalid instructions shape" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const withIds: RecipeStep[] = parsed.instructions.map(s => ({
      id: generateStepId(),
      text: String(s.text ?? ""),
      duration_minutes: Number(s.duration_minutes ?? 0),
      is_active: Boolean(s.is_active),
      ingredients_used: Array.isArray(s.ingredients_used) ? s.ingredients_used.map(String) : [],
      equipment: Array.isArray(s.equipment) ? s.equipment.map(String) : [],
    }));

    const freezerFriendly = Boolean(parsed.freezer_friendly);
    const shelfLifeWeeks = freezerFriendly && typeof parsed.freezer_shelf_life_weeks === "number"
      ? parsed.freezer_shelf_life_weeks
      : null;

    // Write to recipes row
    const { error: updateError } = await adminClient
      .from("recipes")
      .update({
        instructions: withIds,
        freezer_friendly: freezerFriendly,
        freezer_shelf_life_weeks: shelfLifeWeeks,
      })
      .eq("id", recipeId)
      .eq("household_id", householdId);

    if (updateError) {
      if (jobId) {
        await adminClient.from("plan_generations").update({ status: "error", error_message: updateError.message, completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "Failed to persist steps" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (jobId) {
      await adminClient.from("plan_generations").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", jobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        instructions: withIds,
        freezer_friendly: freezerFriendly,
        freezer_shelf_life_weeks: shelfLifeWeeks,
        uncertain_user_additions: parsed.uncertain_user_additions ?? [],
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
