import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecipeStep {
  id: string;
  text: string;
  duration_minutes: number;
  is_active: boolean;
  ingredients_used: string[];
  equipment: string[];
}

interface ReheatRequest {
  recipeId: string;
  householdId: string;
  storageHint: "fridge" | "freezer";
  servings?: number;
}

interface ClaudeResponse {
  steps: Omit<RecipeStep, "id">[];
}

function sanitizeString(s: string): string {
  return s.replace(/[\x00-\x1F\x7F]/g, "");
}

const SYSTEM_PROMPT = `You are a reheating instructions generator.

Input:
{
  recipe_name: "Lentil Soup",
  storage: "fridge" | "freezer",
  servings: 4
}

Task: Produce 2-3 short reheat steps.

Rules:
1. For freezer storage: first step is usually "thaw overnight in fridge" OR "microwave defrost 5 min"
2. For fridge storage: skip thawing
3. Final step is always "serve" or similar
4. Use safe internal temperatures where relevant (poultry 165F, other 145F)

Return ONLY this JSON shape (no prose, no markdown):
{
  "steps": [
    { "text": "Thaw overnight in the fridge", "duration_minutes": 480, "is_active": false, "ingredients_used": [], "equipment": ["fridge"] },
    { "text": "Reheat in a covered pot over medium heat, 10-15 minutes", "duration_minutes": 12, "is_active": true, "ingredients_used": [], "equipment": ["stovetop", "pot"] },
    { "text": "Serve hot", "duration_minutes": 0, "is_active": true, "ingredients_used": [], "equipment": [] }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body: ReheatRequest = await req.json();
    const { recipeId, householdId, storageHint, servings } = body;

    if (!recipeId || !householdId || !storageHint) {
      return new Response(
        JSON.stringify({ success: false, error: "recipeId, householdId, and storageHint are required" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (storageHint !== "fridge" && storageHint !== "freezer") {
      return new Response(
        JSON.stringify({ success: false, error: "storageHint must be 'fridge' or 'freezer'" }),
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

    // Shared rate limit (R-01: 20/day)
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

    // Fetch recipe name from DB
    const { data: recipe } = await adminClient
      .from("recipes")
      .select("id, name, servings")
      .eq("id", recipeId)
      .eq("household_id", householdId)
      .maybeSingle();

    if (!recipe) {
      return new Response(
        JSON.stringify({ success: false, error: "Recipe not found" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Find the latest meal_plan for rate limit row
    const { data: latestPlan } = await adminClient
      .from("meal_plans")
      .select("id")
      .eq("household_id", householdId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Insert plan_generations row with kind='reheat'
    const { data: jobRow } = await adminClient
      .from("plan_generations")
      .insert({
        household_id: householdId,
        plan_id: latestPlan?.id ?? null,
        triggered_by: user.id,
        status: "running",
        kind: "reheat",
        priority_order: [],
      })
      .select("id")
      .single();

    const jobId = jobRow?.id;

    const userInput = {
      recipe_name: sanitizeString(recipe.name),
      storage: storageHint,
      servings: servings ?? recipe.servings ?? 4,
    };

    // Always Haiku for reheat — trivial task
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
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

    if (!Array.isArray(parsed.steps)) {
      if (jobId) {
        await adminClient.from("plan_generations").update({ status: "error", error_message: "Invalid steps shape", completed_at: new Date().toISOString() }).eq("id", jobId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "AI returned invalid steps shape" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Assign stable server-generated IDs to each step
    const withIds: RecipeStep[] = parsed.steps.map((s: Omit<RecipeStep, "id">) => ({
      id: crypto.randomUUID(),
      text: String(s.text ?? ""),
      duration_minutes: Number(s.duration_minutes ?? 0),
      is_active: Boolean(s.is_active),
      ingredients_used: Array.isArray(s.ingredients_used) ? s.ingredients_used.map(String) : [],
      equipment: Array.isArray(s.equipment) ? s.equipment.map(String) : [],
    }));

    if (jobId) {
      await adminClient.from("plan_generations").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ success: true, steps: withIds }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
