import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratedIngredient {
  name: string;
  quantity_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
}

interface GeneratedRecipe {
  servings: number;
  instructions: string;
  ingredients: GeneratedIngredient[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { name, description } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ success: false, error: "Recipe name is required" }),
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

    // Auth
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
      .limit(1)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ success: false, error: "No household found" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Generate full recipe with AI
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        system: "You are a recipe generator. Given a recipe name and optional description, generate a complete recipe with ingredients (including accurate nutritional data per 100g) and cooking instructions. Return ONLY valid JSON matching this schema: { \"servings\": number, \"instructions\": \"step-by-step cooking method as a single string with numbered steps\", \"ingredients\": [{ \"name\": \"ingredient name\", \"quantity_grams\": number, \"calories_per_100g\": number, \"protein_per_100g\": number, \"fat_per_100g\": number, \"carbs_per_100g\": number }] }. Use realistic nutritional values. Keep instructions concise but complete.",
        messages: [
          {
            role: "user",
            content: `Generate a complete recipe for: ${name}${description ? ` (${description})` : ""}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "AI generation failed" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.content?.[0]?.text ?? "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse AI recipe" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    let generated: GeneratedRecipe;
    try {
      generated = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid AI recipe format" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Create recipe
    const { data: recipe, error: recipeError } = await adminClient
      .from("recipes")
      .insert({
        name,
        household_id: membership.household_id,
        created_by: user.id,
        servings: generated.servings || 4,
        notes: generated.instructions || null,
      })
      .select("id")
      .single();

    if (recipeError || !recipe) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create recipe" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Insert ingredients
    const ingredients = (generated.ingredients || []).map((ing, i) => ({
      recipe_id: recipe.id,
      ingredient_type: "food" as const,
      ingredient_id: crypto.randomUUID(),
      ingredient_name: ing.name,
      quantity_grams: ing.quantity_grams || 100,
      calories_per_100g: ing.calories_per_100g || 0,
      protein_per_100g: ing.protein_per_100g || 0,
      fat_per_100g: ing.fat_per_100g || 0,
      carbs_per_100g: ing.carbs_per_100g || 0,
      sort_order: i,
    }));

    if (ingredients.length > 0) {
      const { error: ingError } = await adminClient
        .from("recipe_ingredients")
        .insert(ingredients);

      if (ingError) {
        // Recipe was created but ingredients failed — still return the recipe
        return new Response(
          JSON.stringify({ success: true, recipeId: recipe.id, warning: "Ingredients failed to save: " + ingError.message }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, recipeId: recipe.id }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
