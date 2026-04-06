import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { householdId } = await req.json();

    if (!householdId) {
      return new Response(
        JSON.stringify({ success: false, error: "householdId is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "AI analysis not configured" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch ratings for the household
    const { data: ratings, error: ratingsError } = await adminClient
      .from("recipe_ratings")
      .select("recipe_id, recipe_name, rating, member_user_id")
      .eq("household_id", householdId);

    if (ratingsError) throw ratingsError;

    if (!ratings || ratings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tags_generated: 0 }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Fetch recipes for the household
    const { data: recipes, error: recipesError } = await adminClient
      .from("recipes")
      .select("id, name")
      .eq("household_id", householdId);

    if (recipesError) throw recipesError;

    // Call Anthropic API
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system:
          "You are a family meal preference analyzer. Given recipe ratings from household members, generate tags for recipes and identify patterns. Return JSON: { tags: [{ recipe_id, tag, confidence }], insights: [{ headline, detail, comparison }] }. Tags should be from: crowd-pleaser, divisive, filling, family favourite, light meal. Only tag recipes with 3+ ratings.",
        messages: [
          {
            role: "user",
            content: JSON.stringify({ ratings, recipes }),
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "AI analysis failed" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const aiResult = await anthropicResponse.json();
    const content = aiResult.content?.[0]?.text ?? "{}";

    let parsed: { tags?: { recipe_id: string; tag: string; confidence: number }[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse AI response" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const tags = parsed.tags ?? [];
    if (tags.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tags_generated: 0 }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Upsert AI tags into ai_recipe_tags table
    const rows = tags.map((t) => ({
      household_id: householdId,
      recipe_id: t.recipe_id,
      tag: t.tag,
      confidence: t.confidence ?? null,
      generated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await adminClient
      .from("ai_recipe_tags")
      .upsert(rows, { onConflict: "household_id,recipe_id,tag" });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ success: true, tags_generated: rows.length }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
