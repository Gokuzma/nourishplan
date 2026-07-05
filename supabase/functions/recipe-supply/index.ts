import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;
type MealSlot = (typeof VALID_MEAL_TYPES)[number];

interface GeneratedIngredient {
  name: string;
  quantity_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
}

interface ProposedRecipe {
  name: string;
  slot: MealSlot;
  servings: number;
  instructions: string;
  ingredients: GeneratedIngredient[];
  description?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Clamp a per-100g value into a plausible range; non-finite -> 0.
function clamp(n: unknown, max: number): number {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return Math.max(0, Math.min(max, v));
}

// Sanity-check + normalize an AI ingredient. Returns null if unusable.
function sanitizeIngredient(ing: unknown): GeneratedIngredient | null {
  if (!ing || typeof ing !== "object") return null;
  const i = ing as Record<string, unknown>;
  const name = typeof i.name === "string" ? i.name.trim().slice(0, 120) : "";
  if (!name) return null;
  const quantity = clamp(i.quantity_grams, 5000);
  if (quantity <= 0) return null;
  return {
    name,
    quantity_grams: quantity,
    calories_per_100g: clamp(i.calories_per_100g, 900),
    protein_per_100g: clamp(i.protein_per_100g, 100),
    fat_per_100g: clamp(i.fat_per_100g, 100),
    carbs_per_100g: clamp(i.carbs_per_100g, 100),
  };
}

async function callAnthropic(apiKey: string, maxTokens: number, system: string, userContent: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ success: false, error: "AI generation not configured" });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ success: false, error: "Authorization required" });

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) return json({ success: false, error: "Invalid auth token" });

    const { data: membership } = await adminClient
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (!membership) return json({ success: false, error: "No household found" });
    const householdId = membership.household_id;

    const payload = await req.json();
    const mode = payload?.mode;

    // ── PREVIEW ────────────────────────────────────────────────────────────────
    // Generate N slot-appropriate recipes WITHOUT saving them. Returns proposals.
    if (mode === "preview") {
      const slot = payload.slot as MealSlot;
      if (!VALID_MEAL_TYPES.includes(slot)) return json({ success: false, error: "Invalid slot" });
      const count = Math.max(1, Math.min(10, Number(payload.count) || 3));

      const slotGuidance: Record<MealSlot, string> = {
        Breakfast: "oatmeal, eggs, smoothies, yogurt bowls, overnight oats, pancakes, breakfast wraps, avocado toast — NEVER soups, stews, curries, or chili",
        Lunch: "salads, sandwiches, wraps, grain bowls, leftovers-style mains, soups",
        Dinner: "hearty mains, stir-fries, pasta, sheet-pan dinners, curries, roasts",
        Snacks: "hummus and veg, trail mix, fruit and yogurt, energy bites, cheese and crackers — light and simple",
      };

      const system =
        `You are a recipe generator for a household meal app. Generate exactly ${count} distinct, realistic ${slot} recipes a family would actually choose. Each MUST be genuinely appropriate for ${slot} (${slotGuidance[slot]}). Return ONLY a JSON array of objects matching: { "name": string, "servings": number, "instructions": "numbered steps as a single string", "ingredients": [{ "name": string, "quantity_grams": number, "calories_per_100g": number, "protein_per_100g": number, "fat_per_100g": number, "carbs_per_100g": number }] }. Use realistic per-100g nutrition. Keep instructions concise. No prose, no markdown fences.`;

      const text = await callAnthropic(apiKey, 8192, system, `Generate ${count} ${slot} recipes.`);
      if (!text) return json({ success: false, error: "AI generation failed" });

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return json({ success: false, error: "Failed to parse AI recipes" });

      let raw: unknown[];
      try {
        raw = JSON.parse(match[0]);
      } catch {
        return json({ success: false, error: "Invalid AI recipe format" });
      }

      const proposals: ProposedRecipe[] = [];
      for (const item of Array.isArray(raw) ? raw : []) {
        if (!item || typeof item !== "object") continue;
        const r = item as Record<string, unknown>;
        const name = typeof r.name === "string" ? r.name.trim().slice(0, 200) : "";
        if (!name) continue;
        const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
          .map(sanitizeIngredient)
          .filter((x): x is GeneratedIngredient => x !== null);
        if (ingredients.length === 0) continue;
        proposals.push({
          name,
          slot,
          servings: clamp(r.servings, 24) || 4,
          instructions: typeof r.instructions === "string" ? r.instructions : "",
          ingredients,
        });
      }

      return json({ success: true, proposals });
    }

    // ── DISCOVER ───────────────────────────────────────────────────────────────
    // Generate personalized recipe suggestions to browse — taste-profile aware,
    // optional craving prompt, optional slot. Returns proposals (nothing saved).
    if (mode === "discover") {
      const slotParam = payload.slot;
      const targetSlot: MealSlot | null = VALID_MEAL_TYPES.includes(slotParam) ? slotParam : null;
      const count = Math.max(1, Math.min(8, Number(payload.count) || 6));
      const craving = typeof payload.craving === "string" ? payload.craving.trim().slice(0, 200) : "";

      // Household taste profile — restrictions, won't-eats, favourites, existing names.
      const [restrictionsRes, wontEatRes, ratingsRes, existingRes] = await Promise.all([
        adminClient.from("dietary_restrictions")
          .select("predefined, custom_entries")
          .eq("household_id", householdId),
        adminClient.from("wont_eat_entries")
          .select("food_name, strength")
          .eq("household_id", householdId),
        adminClient.from("recipe_ratings")
          .select("recipe_name, rating")
          .eq("household_id", householdId)
          .gte("rating", 4)
          .limit(30),
        adminClient.from("recipes")
          .select("name")
          .eq("household_id", householdId)
          .is("deleted_at", null),
      ]);

      const restrictions = [...new Set(
        (restrictionsRes.data ?? []).flatMap((r: { predefined: string[] | null; custom_entries: string[] | null }) =>
          [...(r.predefined ?? []), ...(r.custom_entries ?? [])]),
      )];
      const allergies = [...new Set(
        (wontEatRes.data ?? [])
          .filter((w: { strength: string }) => w.strength === "allergy")
          .map((w: { food_name: string }) => w.food_name),
      )];
      const avoids = [...new Set(
        (wontEatRes.data ?? [])
          .filter((w: { strength: string }) => w.strength !== "allergy")
          .map((w: { food_name: string }) => w.food_name),
      )].slice(0, 30);
      const favourites = [...new Set(
        (ratingsRes.data ?? []).map((r: { recipe_name: string }) => r.recipe_name),
      )].slice(0, 15);
      const existingNames = (existingRes.data ?? []).map((r: { name: string }) => r.name);
      const existingLower = new Set(existingNames.map((n) => n.toLowerCase()));

      const system =
        `You suggest recipes a family will get EXCITED to cook this week. Generate exactly ${count} distinct, realistic, appealing recipes. ` +
        (targetSlot
          ? `Every recipe must genuinely suit the ${targetSlot} slot. `
          : `Spread suggestions across Breakfast, Lunch, Dinner, and Snacks. `) +
        `Return ONLY a JSON array of objects matching: { "name": string, "description": "one enticing sentence — why the family will love it", "meal_types": string[], "servings": number, "instructions": "numbered steps as a single string", "ingredients": [{ "name": string, "quantity_grams": number, "calories_per_100g": number, "protein_per_100g": number, "fat_per_100g": number, "carbs_per_100g": number }] }. ` +
        `meal_types rules: pick from Breakfast, Lunch, Dinner, Snacks. Most recipes get EXACTLY ONE slot; two ONLY when genuinely flexible. NEVER three. Breakfast is STRICT — only genuine breakfast foods (eggs, oatmeal, yogurt/smoothie bowls, pancakes, breakfast wraps, granola); never soups, stews, curries, chili, mains, or plain breads. ` +
        `Use realistic per-100g nutrition. Keep instructions concise. No prose, no markdown fences.`;

      const contextLines = [
        craving ? `The family is in the mood for: ${craving}.` : "",
        restrictions.length ? `Dietary restrictions (MUST respect): ${restrictions.join(", ")}.` : "",
        allergies.length ? `Allergies (NEVER include these): ${allergies.join(", ")}.` : "",
        avoids.length ? `Foods the family avoids: ${avoids.join(", ")}.` : "",
        favourites.length ? `Recipes they rated highly (match this taste, don't repeat them): ${favourites.join(", ")}.` : "",
        existingNames.length ? `Already in their cookbook (suggest NEW ideas, no duplicates): ${existingNames.slice(0, 80).join(", ")}.` : "",
        `Generate ${count} ${targetSlot ?? ""} recipe suggestions.`,
      ].filter(Boolean);

      const text = await callAnthropic(apiKey, 8192, system, contextLines.join("\n"));
      if (!text) return json({ success: false, error: "AI generation failed" });

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return json({ success: false, error: "Failed to parse AI suggestions" });

      let raw: unknown[];
      try {
        raw = JSON.parse(match[0]);
      } catch {
        return json({ success: false, error: "Invalid AI suggestion format" });
      }

      const proposals: ProposedRecipe[] = [];
      for (const item of Array.isArray(raw) ? raw : []) {
        if (!item || typeof item !== "object") continue;
        const r = item as Record<string, unknown>;
        const name = typeof r.name === "string" ? r.name.trim().slice(0, 200) : "";
        if (!name || existingLower.has(name.toLowerCase())) continue;
        const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
          .map(sanitizeIngredient)
          .filter((x): x is GeneratedIngredient => x !== null);
        if (ingredients.length === 0) continue;
        // Deterministic slot validation (L-036/L-038/L-039): valid names only,
        // cap at 2, force the requested slot, drop rather than insert untagged.
        let slots = (Array.isArray(r.meal_types) ? r.meal_types : [])
          .filter((s): s is MealSlot =>
            typeof s === "string" && (VALID_MEAL_TYPES as readonly string[]).includes(s))
          .slice(0, 2);
        if (targetSlot) slots = [targetSlot];
        if (slots.length === 0) continue;
        proposals.push({
          name,
          slot: slots[0],
          servings: clamp(r.servings, 24) || 4,
          instructions: typeof r.instructions === "string" ? r.instructions : "",
          ingredients,
          description: typeof r.description === "string" ? r.description.trim().slice(0, 300) : "",
        });
      }

      return json({ success: true, proposals });
    }

    // ── COMMIT ───────────────────────────────────────────────────────────────
    // Persist a list of (already-reviewed) proposed recipes, tagged by slot.
    if (mode === "commit") {
      const incoming = Array.isArray(payload.recipes) ? payload.recipes : [];
      const created: { id: string; name: string }[] = [];

      for (const item of incoming as ProposedRecipe[]) {
        const slot = item?.slot;
        if (!VALID_MEAL_TYPES.includes(slot)) continue;
        const name = typeof item.name === "string" ? item.name.trim().slice(0, 200) : "";
        if (!name) continue;
        const ingredients = (Array.isArray(item.ingredients) ? item.ingredients : [])
          .map(sanitizeIngredient)
          .filter((x): x is GeneratedIngredient => x !== null);
        if (ingredients.length === 0) continue;

        const { data: recipe, error: recipeError } = await adminClient
          .from("recipes")
          .insert({
            name,
            household_id: householdId,
            created_by: user.id,
            servings: clamp(item.servings, 24) || 4,
            notes: typeof item.instructions === "string" ? item.instructions : null,
            meal_types: [slot],
          })
          .select("id")
          .single();
        if (recipeError || !recipe) continue;

        const rows = ingredients.map((ing, i) => ({
          recipe_id: recipe.id,
          ingredient_type: "food" as const,
          ingredient_id: crypto.randomUUID(),
          ingredient_name: ing.name,
          quantity_grams: ing.quantity_grams,
          calories_per_100g: ing.calories_per_100g,
          protein_per_100g: ing.protein_per_100g,
          fat_per_100g: ing.fat_per_100g,
          carbs_per_100g: ing.carbs_per_100g,
          sort_order: i,
        }));
        await adminClient.from("recipe_ingredients").insert(rows);
        created.push({ id: recipe.id, name });
      }

      return json({ success: true, created });
    }

    // ── CLASSIFY ─────────────────────────────────────────────────────────────
    // Backfill meal_types for the household's untagged recipes.
    if (mode === "classify") {
      const { data: allRecipes, error: fetchError } = await adminClient
        .from("recipes")
        .select("id, name, meal_types, recipe_ingredients(ingredient_name)")
        .eq("household_id", householdId)
        .is("deleted_at", null);
      if (fetchError) return json({ success: false, error: fetchError.message });

      const untagged = (allRecipes ?? []).filter(
        (r: { meal_types: string[] | null }) => !Array.isArray(r.meal_types) || r.meal_types.length === 0,
      );
      if (untagged.length === 0) return json({ success: true, classified: 0, total: 0 });

      const catalog = untagged.map((r: { id: string; name: string; recipe_ingredients?: { ingredient_name: string }[] }) => ({
        id: r.id,
        name: r.name,
        ingredients: (r.recipe_ingredients ?? []).map((ri) => ri.ingredient_name).slice(0, 12),
      }));

      const system =
        `You classify recipes into meal slots. For each recipe, pick the slot(s) it naturally fits from: Breakfast, Lunch, Dinner, Snacks. Assign EXACTLY ONE slot for most recipes; assign two ONLY when genuinely flexible (a salad -> ["Lunch","Dinner"], a frittata -> ["Breakfast","Lunch"], hummus -> ["Snacks","Lunch"]). NEVER assign three slots. Breakfast is STRICT: tag a recipe Breakfast ONLY if it is a genuine breakfast food — eggs, oatmeal/porridge, yogurt or smoothie bowls, smoothies, pancakes/waffles/French toast, breakfast pastries, breakfast wraps/burritos, cereal/granola. Breads and flatbreads (roti, naan, biscuits, dinner rolls), plain sides, mains, soups, stews, curries, and chili are NEVER Breakfast. Every recipe must get at least one slot. Return ONLY a JSON object mapping recipe id -> array of slot strings, e.g. {"<id>":["Dinner"]}. No prose.`;

      const text = await callAnthropic(apiKey, 8192, system, JSON.stringify({ recipes: catalog }));
      if (!text) return json({ success: false, error: "AI classification failed" });

      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return json({ success: false, error: "Failed to parse classification" });

      let mapping: Record<string, unknown>;
      try {
        mapping = JSON.parse(match[0]);
      } catch {
        return json({ success: false, error: "Invalid classification format" });
      }

      let classified = 0;
      for (const r of untagged) {
        const raw = mapping[(r as { id: string }).id];
        const slots = (Array.isArray(raw) ? raw : []).filter(
          (s): s is string => typeof s === "string" && (VALID_MEAL_TYPES as readonly string[]).includes(s),
        );
        if (slots.length === 0) continue;
        const { error: updateError } = await adminClient
          .from("recipes")
          .update({ meal_types: slots })
          .eq("id", (r as { id: string }).id);
        if (!updateError) classified++;
      }

      return json({ success: true, classified, total: untagged.length });
    }

    return json({ success: false, error: "Unknown mode" });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});
