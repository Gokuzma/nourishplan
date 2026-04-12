import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecipeStepInput {
  id: string;
  text: string;
  duration_minutes: number;
  is_active: boolean;
  ingredients_used: string[];
  equipment: string[];
}

interface RecipeData {
  id: string;
  name: string;
  instructions: RecipeStepInput[] | null;
}

interface SequenceItem {
  step_id: string;
  recipe_id: string;
  owner_member_id: string | null;
}

interface CookSequenceRequest {
  cookSessionId: string;
  householdId: string;
  recipeIds: string[];
  mode: "combined" | "per-recipe";
  memberIds: string[];
}

interface ClaudeResponse {
  sequence: SequenceItem[];
  equipment_conflicts: string[];
  total_duration_minutes: number;
}

function sanitizeString(s: string): string {
  return s.replace(/[\x00-\x1F\x7F]/g, "");
}

const SYSTEM_PROMPT = `You are a cooking sequence planner for a cook who is preparing one or more recipes in one session.

Input:
{
  recipes: [{ id, name, instructions: [...rich steps with id, text, duration, is_active, equipment...] }],
  members: [{ id, name }],
  mode: "combined" | "per-recipe"
}

Task: Produce an interleaved cooking sequence.

Rules:
1. Start the longest-duration steps first (longest-first scheduling) to maximise parallelism
2. Overlap passive steps (is_active=false) with active steps from other recipes
3. Detect equipment conflicts — if two recipes need the oven at different temperatures, schedule them serially and add a note
4. If mode="combined": produce ONE flat sequence with interleaved steps from all recipes
5. If mode="per-recipe": produce N sequences, one per recipe, each in its original order, concatenated
6. If members.length == 2: assign each step to a member, balancing active-work load; pass through members.length > 2 by cycling
7. EVERY step in the output MUST reference a step_id that exists in one of the input recipes. Do not invent new step ids.
8. Each step retains its original recipe_id so the UI can show which dish the step belongs to

Return ONLY this JSON shape (no prose, no markdown):
{
  "sequence": [
    {
      "step_id": "uuid-from-input",
      "recipe_id": "uuid",
      "owner_member_id": "member-uuid-or-null"
    }
  ],
  "equipment_conflicts": ["Oven needed at 350F and 425F — scheduled serially"],
  "total_duration_minutes": 45
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body: CookSequenceRequest = await req.json();
    const { cookSessionId, householdId, recipeIds, mode, memberIds } = body;

    if (!cookSessionId || !householdId || !recipeIds || !mode) {
      return new Response(
        JSON.stringify({ success: false, error: "cookSessionId, householdId, recipeIds, and mode are required" }),
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

    // Fetch recipes with their instructions (R-02 live-bound steps)
    const { data: recipesData, error: recipesError } = await adminClient
      .from("recipes")
      .select("id, name, instructions")
      .in("id", recipeIds)
      .eq("household_id", householdId)
      .is("deleted_at", null);

    if (recipesError || !recipesData) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch recipes" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Find the latest plan to attach the rate limit row to
    const { data: latestPlan } = await adminClient
      .from("meal_plans")
      .select("id")
      .eq("household_id", householdId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Insert plan_generations row with kind='cook_sequence' BEFORE any branch (fair rate limit)
    const { data: jobRow } = await adminClient
      .from("plan_generations")
      .insert({
        household_id: householdId,
        plan_id: latestPlan?.id ?? null,
        triggered_by: user.id,
        status: "running",
        kind: "cook_sequence",
        priority_order: [],
      })
      .select("id")
      .single();

    const jobId = jobRow?.id;

    // Fast path: single recipe + single member — return instructions verbatim, skip Claude
    if (recipeIds.length === 1 && memberIds.length <= 1) {
      const recipe = recipesData[0] as RecipeData;
      if (!recipe?.instructions || !Array.isArray(recipe.instructions)) {
        if (jobId) {
          await adminClient.from("plan_generations").update({ status: "error", error_message: "Recipe has no instructions", completed_at: new Date().toISOString() }).eq("id", jobId);
        }
        return new Response(
          JSON.stringify({ success: false, error: "Recipe has no instructions — regenerate first" }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
      const sequence = recipe.instructions.map((s: RecipeStepInput) => ({
        step_id: s.id,
        recipe_id: recipe.id,
        owner_member_id: memberIds[0] ?? null,
      }));
      const totalDuration = recipe.instructions.reduce((acc: number, s: RecipeStepInput) => acc + (s.duration_minutes || 0), 0);

      if (jobId) {
        await adminClient.from("plan_generations").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", jobId);
      }

      return new Response(
        JSON.stringify({ success: true, sequence, equipment_conflicts: [], total_duration_minutes: totalDuration }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Multi-recipe or multi-member path: call Claude
    const model = (recipeIds.length > 1 || memberIds.length > 1) ? "claude-sonnet-4-5" : "claude-haiku-4-5";

    // Fetch member names for lane assignment
    let membersForClaude: { id: string; name: string }[] = [];
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await adminClient
        .from("household_members")
        .select("user_id, display_name")
        .eq("household_id", householdId)
        .in("user_id", memberIds);
      membersForClaude = (memberProfiles ?? []).map((m: { user_id: string; display_name: string | null }) => ({
        id: m.user_id,
        name: sanitizeString(m.display_name ?? m.user_id),
      }));
    }

    const recipesForClaude = (recipesData as RecipeData[]).map(r => ({
      id: r.id,
      name: sanitizeString(r.name),
      instructions: (r.instructions ?? []).map((s: RecipeStepInput) => ({
        id: s.id,
        text: sanitizeString(s.text),
        duration_minutes: s.duration_minutes,
        is_active: s.is_active,
        equipment: s.equipment,
      })),
    }));

    const userInput = {
      recipes: recipesForClaude,
      members: membersForClaude,
      mode,
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
    const responseText = claudeJson.content?.[0]?.text ?? "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
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

    if (jobId) {
      await adminClient.from("plan_generations").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", jobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sequence: parsed.sequence ?? [],
        equipment_conflicts: parsed.equipment_conflicts ?? [],
        total_duration_minutes: parsed.total_duration_minutes ?? 0,
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
