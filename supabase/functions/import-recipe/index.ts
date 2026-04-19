import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_TIMEOUT_MS = 10000;
const MAX_CONTENT_CHARS = 12000;
const MIN_USABLE_TEXT_CHARS = 200;
const FETCH_FAILURE_MSG =
  "Could not fetch that URL. Try copying and pasting the recipe text directly instead.";
const AI_PARSE_FAILURE_MSG =
  "The import did not return a complete recipe. Try pasting the recipe text directly.";

interface ImportedIngredient {
  name: string;
  quantity_grams: number;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
}

interface ImportedStep {
  text: string;
  duration_minutes: number;
  is_active: boolean;
  ingredients_used: string[];
  equipment: string[];
}

interface ImportedRecipe {
  name: string;
  servings: number;
  ingredients: ImportedIngredient[];
  steps: ImportedStep[];
  error?: string;
}

interface RecipeStep {
  id: string;
  text: string;
  duration_minutes: number;
  is_active: boolean;
  ingredients_used: string[];
  equipment: string[];
}

const SYSTEM_PROMPT = `You are a recipe extractor. Given recipe content (from a blog post, YouTube video transcript, or raw text), extract a complete recipe.

Return ONLY valid JSON matching this exact schema:
{
  "name": "Recipe Name",
  "servings": <number>,
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity_grams": <number>,
      "category": "meat|poultry|fish|vegetables|legumes|grains|dairy|other",
      "calories_per_100g": <number>,
      "protein_per_100g": <number>,
      "fat_per_100g": <number>,
      "carbs_per_100g": <number>
    }
  ],
  "steps": [
    {
      "text": "imperative sentence describing one action",
      "duration_minutes": <number>,
      "is_active": <boolean>,
      "ingredients_used": ["ingredient name"],
      "equipment": ["equipment name"]
    }
  ]
}

Rules:
1. Convert ALL ingredient quantities to grams.
2. Use realistic per-100g nutritional values.
3. For the category field, choose from: meat, poultry, fish, vegetables, legumes, grains, dairy, other.
4. If content is too vague to extract a recipe, return { "error": "Could not extract recipe" }.
5. Return ONLY the JSON object — no prose, no markdown fences.`;

function detectInputType(input: string): "youtube" | "url" | "text" {
  const trimmed = input.trim();
  if (/^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/.test(trimmed)) return "youtube";
  if (/^https?:\/\//.test(trimmed)) return "url";
  return "text";
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
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

async function fetchBlogText(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible)",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = stripHtml(html).slice(0, MAX_CONTENT_CHARS);
    if (text.length < MIN_USABLE_TEXT_CHARS) return null;
    return text;
  } catch {
    return null;
  }
}

async function fetchYoutubeTranscript(url: string): Promise<string | null> {
  try {
    const pageRes = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible)",
        "Accept-Language": "en",
      },
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();
    const playerMatch = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
    if (!playerMatch) return null;

    let player: unknown;
    try {
      player = JSON.parse(playerMatch[1]);
    } catch {
      return null;
    }

    const tracks = (player as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: { baseUrl?: string }[];
        };
      };
    })?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    const baseUrl = tracks?.[0]?.baseUrl;
    if (!baseUrl) return null;

    const xmlRes = await fetchWithTimeout(baseUrl);
    if (!xmlRes.ok) return null;
    const xml = await xmlRes.text();
    const segments = xml.match(/<text[^>]*>(.*?)<\/text>/gs);
    if (!segments || segments.length === 0) return null;

    const text = segments
      .map((s) => s.replace(/<text[^>]*>/, "").replace(/<\/text>/, ""))
      .map((s) =>
        s
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n))),
      )
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, MAX_CONTENT_CHARS);

    if (text.length < MIN_USABLE_TEXT_CHARS) return null;
    return text;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "input is required" }),
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

    // Auth — identity from JWT only (L-013)
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

    // D-04: auto-detect input type
    const trimmedInput = input.trim();
    const inputType = detectInputType(trimmedInput);

    // D-05, D-06: server-side fetch of source content
    let contentText: string | null = null;
    if (inputType === "youtube") {
      contentText = await fetchYoutubeTranscript(trimmedInput);
    } else if (inputType === "url") {
      contentText = await fetchBlogText(trimmedInput);
    } else {
      contentText = trimmedInput.slice(0, MAX_CONTENT_CHARS);
    }

    if (!contentText || contentText.length < MIN_USABLE_TEXT_CHARS) {
      return new Response(
        JSON.stringify({ success: false, error: FETCH_FAILURE_MSG }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // D-15: default servings to household member count
    const { count: memberCount } = await adminClient
      .from("household_members")
      .select("id", { count: "exact", head: true })
      .eq("household_id", membership.household_id);

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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Extract the recipe from this content:\n\n${contentText}`,
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
        JSON.stringify({ success: false, error: AI_PARSE_FAILURE_MSG }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    let generated: ImportedRecipe;
    try {
      generated = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: AI_PARSE_FAILURE_MSG }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (generated.error) {
      return new Response(
        JSON.stringify({ success: false, error: AI_PARSE_FAILURE_MSG }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // RecipeStep[] — Phase 23 format (Pitfall 5)
    const steps: RecipeStep[] = (generated.steps || []).map((s) => ({
      id: crypto.randomUUID(),
      text: String(s.text ?? ""),
      duration_minutes: Number(s.duration_minutes ?? 0),
      is_active: Boolean(s.is_active ?? true),
      ingredients_used: Array.isArray(s.ingredients_used) ? s.ingredients_used.map(String) : [],
      equipment: Array.isArray(s.equipment) ? s.equipment.map(String) : [],
    }));

    // D-11: store the URL on source_url for attribution; raw text imports have no URL
    const sourceUrl = inputType !== "text" ? trimmedInput : null;

    // Create recipe (instructions as RecipeStep[], not notes string)
    const { data: recipe, error: recipeError } = await adminClient
      .from("recipes")
      .insert({
        name: generated.name || "Imported Recipe",
        household_id: membership.household_id,
        created_by: user.id,
        servings: generated.servings || memberCount || 4,
        source_url: sourceUrl,
        instructions: steps,
      })
      .select("id")
      .single();

    if (recipeError || !recipe) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create recipe" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // D-19, D-21: match existing custom_foods by name, create new if not found
    const generatedIngredients = generated.ingredients || [];
    const ingredientRows: {
      recipe_id: string;
      ingredient_type: "food";
      ingredient_id: string;
      ingredient_name: string;
      quantity_grams: number;
      calories_per_100g: number;
      protein_per_100g: number;
      fat_per_100g: number;
      carbs_per_100g: number;
      sort_order: number;
    }[] = [];

    for (let i = 0; i < generatedIngredients.length; i++) {
      const ing = generatedIngredients[i];
      const name = String(ing.name ?? "").trim();
      if (!name) continue;

      const { data: existing } = await adminClient
        .from("custom_foods")
        .select("id")
        .eq("household_id", membership.household_id)
        .ilike("name", name)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      let ingredientId: string;
      if (existing) {
        ingredientId = existing.id;
      } else {
        ingredientId = crypto.randomUUID();
        // custom_foods has no `category` column; AI-supplied category is used
        // downstream for YIELD_FACTORS lookup via recipe_ingredients, not stored here.
        await adminClient.from("custom_foods").insert({
          id: ingredientId,
          household_id: membership.household_id,
          created_by: user.id,
          name,
          serving_grams: 100,
          calories_per_100g: ing.calories_per_100g || 0,
          protein_per_100g: ing.protein_per_100g || 0,
          fat_per_100g: ing.fat_per_100g || 0,
          carbs_per_100g: ing.carbs_per_100g || 0,
        });
      }

      ingredientRows.push({
        recipe_id: recipe.id,
        ingredient_type: "food",
        ingredient_id: ingredientId,
        ingredient_name: name,
        quantity_grams: ing.quantity_grams || 100,
        calories_per_100g: ing.calories_per_100g || 0,
        protein_per_100g: ing.protein_per_100g || 0,
        fat_per_100g: ing.fat_per_100g || 0,
        carbs_per_100g: ing.carbs_per_100g || 0,
        sort_order: i,
      });
    }

    if (ingredientRows.length > 0) {
      const { error: ingError } = await adminClient
        .from("recipe_ingredients")
        .insert(ingredientRows);

      if (ingError) {
        return new Response(
          JSON.stringify({
            success: true,
            recipeId: recipe.id,
            warning: "Ingredients failed to save: " + ingError.message,
          }),
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
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
