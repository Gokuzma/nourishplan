import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  householdId: string;
  planId: string;
  weekStart: string;
  priorityOrder: string[];
  recipeMix?: { favorites: number; liked: number; novel: number };
}

interface RecipeRow {
  id: string;
  name: string;
  servings: number;
  recipe_ingredients: {
    ingredient_name: string;
    food_id: string | null;
    quantity_grams: number;
    calories_per_100g: number;
    protein_per_100g: number;
    fat_per_100g: number;
    carbs_per_100g: number;
  }[];
}

interface SlotRow {
  id: string;
  plan_id: string;
  day_index: number;
  slot_name: string;
  meal_id: string | null;
  is_locked: boolean;
  is_override: boolean;
}

interface ScheduleSlotRow {
  day_of_week: number;
  slot_name: string;
  status: "prep" | "consume" | "quick" | "away";
}

interface InventoryItemRow {
  food_name: string;
  food_id: string | null;
  quantity_remaining: number;
  unit: string;
}

interface RatingRow {
  recipe_id: string;
  rating: number;
  rated_by_user_id: string | null;
  rated_by_member_profile_id: string | null;
}

interface NutritionTargetRow {
  user_id: string | null;
  member_profile_id: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

interface AssignedSlot {
  day_index: number;
  slot_name: string;
  recipe_id: string;
  rationale: string;
}

interface SuggestedRecipe {
  name: string;
  prepMinutes: number;
  description: string;
}

interface AssignResult {
  slots: AssignedSlot[];
  violations: string[];
  suggestedRecipes?: SuggestedRecipe[];
}

function sanitizeString(s: string): string {
  return s.replace(/[\x00-\x1F\x7F]/g, "");
}

// Inlined from src/utils/cost.ts (Deno cannot import src/)
function computeRecipeCostPerServing(
  ingredients: { quantity_grams: number; cost_per_100g: number | null }[],
  servings: number,
): { costPerServing: number; pricedCount: number; totalCount: number } {
  let total = 0;
  let pricedCount = 0;
  for (const ing of ingredients) {
    if (ing.cost_per_100g != null) {
      total += (ing.quantity_grams / 100) * ing.cost_per_100g;
      pricedCount++;
    }
  }
  return {
    costPerServing: servings > 0 ? total / servings : 0,
    pricedCount,
    totalCount: ingredients.length,
  };
}

// Normalize recipeMix: clamp negatives, force sum=100, fallback to defaults
function normalizeRecipeMix(raw: unknown): { favorites: number; liked: number; novel: number } {
  const defaults = { favorites: 50, liked: 30, novel: 20 };
  if (!raw || typeof raw !== "object") return defaults;
  const r = raw as Record<string, unknown>;
  const f = Math.max(0, Number(r.favorites) || 0);
  const l = Math.max(0, Number(r.liked) || 0);
  const n = Math.max(0, Number(r.novel) || 0);
  const total = f + l + n;
  if (total === 0) return defaults;
  const favorites = Math.round((f / total) * 100);
  const liked = Math.round((l / total) * 100);
  const novel = 100 - favorites - liked;
  return { favorites, liked, novel };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body: GenerateRequest = await req.json();
    const { householdId, planId, weekStart, priorityOrder } = body;
    const recipeMix = normalizeRecipeMix(body.recipeMix);

    if (!householdId || !planId || !weekStart) {
      return new Response(
        JSON.stringify({ success: false, error: "householdId, planId, and weekStart are required" }),
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

    // Auth validation — verify user is a member of the requested household
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

    // Rate limiting — max 10 generations per household per 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentJobCount } = await adminClient
      .from("plan_generations")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .gt("created_at", twentyFourHoursAgo);

    if ((recentJobCount ?? 0) >= 10) {
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit exceeded. Maximum 10 generations per 24 hours." }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Create job row
    const { data: jobRow, error: jobError } = await adminClient
      .from("plan_generations")
      .insert({
        household_id: householdId,
        plan_id: planId,
        status: "running",
        triggered_by: user.id,
        priority_order: priorityOrder ?? [],
      })
      .select("id")
      .single();

    if (jobError || !jobRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create generation job" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const jobId = jobRow.id;

    // Wall-clock budget for the AI solver loop.
    // Edge Function platform timeout is 150000ms (150s). 90000ms (90s) leaves
    // ~60s headroom for DB writes, meal row upserts, and platform overhead.
    // Pass 1 (Haiku shortlist, ~3s) + Pass 2 (Haiku/Sonnet assign, max_tokens=4096, ~5-15s)
    // + passes 3-5 (Haiku correction, ~3-8s each if violations) fit comfortably in 90s.
    const WALL_CLOCK_BUDGET_MS = 90000;
    const startTime = Date.now();
    function hasTimeLeft(): boolean {
      return Date.now() - startTime < WALL_CLOCK_BUDGET_MS;
    }

    let finalStatus = "done";
    let passCount = 0;
    let errorMessage: string | undefined;
    let bestResult: AssignResult = { slots: [], violations: [] };
    let pass2Completed = false;
    let correctionPassesSkippedForTime = false;
    let suggestedRecipes: SuggestedRecipe[] | undefined;
    let constraintSnapshotSummary: Record<string, unknown> = {};

    interface DroppedAssignment {
      day_index: number;
      slot_name: string;
      raw_recipe_id: string | null;
      reason: string;
    }
    const droppedAssignments: DroppedAssignment[] = [];
    interface SkippedSlot {
      day_index: number;
      slot_name: string;
      reason: string;
    }
    const skippedSlots: SkippedSlot[] = [];
    const reusedFills: { day_index: number; slot_name: string; meal_id: string; source: string }[] = [];

    try {
      // Constraint snapshot assembly (parallel)
      const [
        recipesResult,
        restrictionsResult,
        wontEatResult,
        scheduleResult,
        inventoryResult,
        ratingsResult,
        nutritionResult,
        membersResult,
        profilesResult,
        slotsResult,
        spendLogsResult,
        foodPricesResult,
      ] = await Promise.all([
        adminClient
          .from("recipes")
          .select("id, name, servings, recipe_ingredients(ingredient_name, food_id, quantity_grams, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g)")
          .eq("household_id", householdId)
          .is("deleted_at", null),
        adminClient
          .from("dietary_restrictions")
          .select("member_user_id, member_profile_id, predefined, custom_entries")
          .eq("household_id", householdId),
        adminClient
          .from("wont_eat_entries")
          .select("food_name, strength")
          .eq("household_id", householdId),
        adminClient
          .from("member_schedule_slots")
          .select("day_of_week, slot_name, status")
          .eq("household_id", householdId),
        adminClient
          .from("inventory_items")
          .select("food_name, food_id, quantity_remaining, unit")
          .eq("household_id", householdId)
          .is("removed_at", null),
        adminClient
          .from("recipe_ratings")
          .select("recipe_id, rating, rated_by_user_id, rated_by_member_profile_id")
          .eq("household_id", householdId),
        adminClient
          .from("nutrition_targets")
          .select("user_id, member_profile_id, calories, protein_g, carbs_g, fat_g")
          .eq("household_id", householdId),
        adminClient
          .from("household_members")
          .select("user_id")
          .eq("household_id", householdId),
        adminClient
          .from("member_profiles")
          .select("id, name")
          .eq("household_id", householdId),
        adminClient
          .from("meal_plan_slots")
          .select("id, plan_id, day_index, slot_name, meal_id, is_locked, is_override")
          .eq("plan_id", planId),
        // Phase 24: cook history — drives cook_count, last_cooked_date
        adminClient
          .from("spend_logs")
          .select("recipe_id, log_date")
          .eq("household_id", householdId)
          .eq("source", "cook")
          .not("recipe_id", "is", null),
        // Phase 24: food prices — drives cost_per_serving
        adminClient
          .from("food_prices")
          .select("food_id, food_name, cost_per_100g")
          .eq("household_id", householdId),
      ]);

      const recipes: RecipeRow[] = (recipesResult.data ?? []) as RecipeRow[];
      const restrictions = restrictionsResult.data ?? [];
      const wontEat = wontEatResult.data ?? [];
      const scheduleSlots: ScheduleSlotRow[] = (scheduleResult.data ?? []) as ScheduleSlotRow[];
      const inventory: InventoryItemRow[] = (inventoryResult.data ?? []) as InventoryItemRow[];
      const ratings: RatingRow[] = (ratingsResult.data ?? []) as RatingRow[];
      const nutritionTargets: NutritionTargetRow[] = (nutritionResult.data ?? []) as NutritionTargetRow[];
      const members = membersResult.data ?? [];
      const profiles = profilesResult.data ?? [];
      const slots: SlotRow[] = (slotsResult.data ?? []) as SlotRow[];
      const spendLogs: { recipe_id: string | null; log_date: string }[] =
        (spendLogsResult.data ?? []) as { recipe_id: string | null; log_date: string }[];
      const foodPrices: { food_id: string; food_name: string; cost_per_100g: number }[] =
        (foodPricesResult.data ?? []) as { food_id: string; food_name: string; cost_per_100g: number }[];

      const memberCount = members.length + profiles.length;
      const hasActiveRestrictions = restrictions.length > 0 || wontEat.some((w) => w.strength === "allergy");
      const smallCatalog = recipes.length < 7;

      constraintSnapshotSummary = {
        recipeCount: recipes.length,
        memberCount,
        hasActiveRestrictions,
        smallCatalog,
        inventoryCount: inventory.length,
        weekStart,
        priorityOrder,
        recipeMix,
      };

      // Average ratings per recipe
      const avgRatings: Record<string, number> = {};
      const ratingGroups: Record<string, number[]> = {};
      for (const r of ratings) {
        if (!ratingGroups[r.recipe_id]) ratingGroups[r.recipe_id] = [];
        ratingGroups[r.recipe_id].push(r.rating);
      }
      for (const [id, vals] of Object.entries(ratingGroups)) {
        avgRatings[id] = vals.reduce((a, b) => a + b, 0) / vals.length;
      }

      // Phase 24 enrichment: cook history + per-member ratings + price lookup
      const priceByFoodId = new Map<string, number>(
        foodPrices.map((p) => [p.food_id, p.cost_per_100g]),
      );

      const cookCountByRecipe: Record<string, number> = {};
      const lastCookedByRecipe: Record<string, string | null> = {};
      for (const s of spendLogs) {
        if (!s.recipe_id) continue;
        cookCountByRecipe[s.recipe_id] = (cookCountByRecipe[s.recipe_id] || 0) + 1;
        const prev = lastCookedByRecipe[s.recipe_id];
        if (!prev || s.log_date > prev) lastCookedByRecipe[s.recipe_id] = s.log_date;
      }

      // Per-member ratings keyed by coalesce(rated_by_user_id, rated_by_member_profile_id)
      const memberRatingsByRecipe: Record<string, Record<string, number[]>> = {};
      for (const r of ratings) {
        const memberKey = r.rated_by_user_id ?? r.rated_by_member_profile_id;
        if (!memberKey) continue;
        if (!memberRatingsByRecipe[r.recipe_id]) memberRatingsByRecipe[r.recipe_id] = {};
        if (!memberRatingsByRecipe[r.recipe_id][memberKey]) {
          memberRatingsByRecipe[r.recipe_id][memberKey] = [];
        }
        memberRatingsByRecipe[r.recipe_id][memberKey].push(r.rating);
      }

      // Locked slots (from existing DB rows) — normalize to capitalized for consistent lookup
      const lockedSlots = slots.filter((s) => s.is_locked);
      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      const lockedKey = new Set(lockedSlots.map((s) => `${s.day_index}_${capitalize(s.slot_name)}`));

      // Build schedule status lookup: key = `${day_index}_${SlotName}` (capitalized)
      const scheduleStatus: Record<string, string> = {};
      for (const ss of scheduleSlots) {
        // Normalize "Snack" (DB schedule) vs "Snacks" (plan grid)
        const normalizedSlotName = ss.slot_name === "Snack" ? "Snacks" : capitalize(ss.slot_name);
        scheduleStatus[`${ss.day_of_week}_${normalizedSlotName}`] = ss.status;
      }

      // Enumerate ALL possible slots (7 days x 4 default slots), not just existing DB rows.
      // Use CAPITALIZED names to match the frontend DEFAULT_SLOTS and existing DB rows.
      const DEFAULT_SLOT_NAMES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
      const slotsToFill: { day_index: number; slot_name: string; scheduleStatus: string }[] = [];
      for (let day = 0; day < 7; day++) {
        for (const slotName of DEFAULT_SLOT_NAMES) {
          const key = `${day}_${slotName}`;
          if (lockedKey.has(key)) continue; // skip locked slots
          slotsToFill.push({
            day_index: day,
            slot_name: slotName,
            scheduleStatus: scheduleStatus[key] ?? "consume",
          });
        }
      }

      // Inventory ingredient names for AI context
      const inventoryNames = inventory.map((i) => sanitizeString(i.food_name));

      // Won't-eat and restriction ingredient lists
      const wontEatNames = wontEat.map((w) => sanitizeString(w.food_name));
      const allergenNames = wontEat.filter((w) => w.strength === "allergy").map((w) => sanitizeString(w.food_name));

      // Predefined restrictions (e.g. vegetarian, gluten-free)
      const allPredefined = restrictions.flatMap((r) => r.predefined ?? []);
      const allCustom = restrictions.flatMap((r) => r.custom_entries ?? []).map(sanitizeString);

      // Phase 24: compute enriched per-recipe record (used by Pass 2).
      // Pass 1 receives only a LEAN projection (id/name/ingredients/avg_rating/tier_hint)
      // per Pitfall 1 to keep token budget under Haiku's response ceiling.
      type EnrichedRecipe = {
        id: string;
        name: string;
        ingredient_names: string[];
        avg_rating: number | null;
        cook_count: number;
        last_cooked_date: string | null;
        member_ratings: Record<string, number>;
        cost_per_serving: number;
        tier_hint: "favorite" | "liked" | "novel";
        servings: number;
      };

      const recipeEnriched: EnrichedRecipe[] = recipes.map((r) => {
        const ings = r.recipe_ingredients ?? [];
        const ingsWithPrice = ings.map((i) => ({
          quantity_grams: i.quantity_grams,
          cost_per_100g: i.food_id ? priceByFoodId.get(i.food_id) ?? null : null,
        }));
        const { costPerServing } = computeRecipeCostPerServing(ingsWithPrice, r.servings || 1);

        const cookCount = cookCountByRecipe[r.id] || 0;
        const avgRating = avgRatings[r.id] ?? null;

        // Tier hint (pre-AI heuristic; AI makes the final call)
        let tierHint: "favorite" | "liked" | "novel";
        if (cookCount === 0) tierHint = "novel";
        else if (avgRating !== null && avgRating >= 4) tierHint = "favorite";
        else tierHint = "liked";

        const memberMap = memberRatingsByRecipe[r.id] ?? {};
        const memberRatings: Record<string, number> = {};
        for (const [k, vals] of Object.entries(memberMap)) {
          memberRatings[k] = vals.reduce((a, b) => a + b, 0) / vals.length;
        }

        return {
          id: r.id,
          name: sanitizeString(r.name),
          ingredient_names: ings.map((ri) => sanitizeString(ri.ingredient_name)),
          avg_rating: avgRating,
          cook_count: cookCount,
          last_cooked_date: lastCookedByRecipe[r.id] ?? null,
          member_ratings: memberRatings,
          cost_per_serving: costPerServing,
          tier_hint: tierHint,
          servings: r.servings,
        };
      });

      // Recipe catalog for AI shortlist (Pass 1) — LEAN shape + tier_hint only.
      const recipeCatalog = recipeEnriched.map((r) => ({
        id: r.id,
        name: r.name,
        ingredient_names: r.ingredient_names,
        avg_rating: r.avg_rating,
        tier_hint: r.tier_hint,
      }));

      // Pass 1 — Shortlist (Haiku)
      let shortlistedIds: string[] = recipes.map((r) => r.id);

      if (hasTimeLeft() && recipes.length > 0) {
        passCount++;
        const shortlistResponse = await fetch("https://api.anthropic.com/v1/messages", {
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
              "You are a household meal planner. Given a recipe catalog and household constraints, return a JSON array of recipe IDs that are good candidates for this week's plan. Consider dietary restrictions (HARD constraint — never include recipes with allergen ingredients), won't-eat lists (HARD — never include), member preferences (ratings), schedule complexity requirements, inventory availability (prefer recipes using ingredients the household has), and budget awareness. Return approximately 30 candidates. Select candidates with tier balance roughly matching the provided recipeMix ratios (favorites/liked/novel percentages). Include enough novel candidates (tier_hint='novel') to support the novel quota. Prefer recipes whose tier_hint matches the tier you are filling. Return ONLY a JSON array of ID strings, nothing else.",
            messages: [
              {
                role: "user",
                content: JSON.stringify({
                  recipes: recipeCatalog,
                  constraints: {
                    restrictions: allPredefined,
                    customRestrictions: allCustom,
                    allergens: allergenNames,
                    wontEat: wontEatNames,
                    inventory: inventoryNames,
                    priorityOrder: priorityOrder ?? [],
                  },
                  recipeMix,
                  memberCount,
                  smallCatalog,
                }),
              },
            ],
          }),
        });

        if (shortlistResponse.ok) {
          const shortlistData = await shortlistResponse.json();
          const shortlistText = shortlistData.content?.[0]?.text ?? "";
          const shortlistMatch = shortlistText.match(/\[[\s\S]*?\]/);
          if (shortlistMatch) {
            try {
              const parsed = JSON.parse(shortlistMatch[0]);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Validate IDs against household's actual recipe catalog (T-22-04)
                const validIds = new Set(recipes.map((r) => r.id));
                shortlistedIds = parsed.filter((id: unknown) => typeof id === "string" && validIds.has(id));
              }
            } catch {
              // Fallback: use all recipes
            }
          }
        }
      }

      // Recipe details for shortlisted candidates (Phase 24: enriched with cook history,
      // per-member ratings, cost_per_serving, tier_hint — Pitfall 1 says Pass 2 only).
      const shortlistedSet = new Set(shortlistedIds);
      const shortlistedRecipes = recipeEnriched.filter((r) => shortlistedSet.has(r.id));

      // Model selection per D-06: haiku for small simple households, sonnet for complex
      const assignModel =
        memberCount <= 2 && !hasActiveRestrictions ? "claude-haiku-4-5" : "claude-sonnet-4-5";

      // Pass 2 — Assign
      if (hasTimeLeft() && shortlistedRecipes.length > 0 && slotsToFill.length > 0) {
        passCount++;
        const assignResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: assignModel,
            max_tokens: 4096,
            system:
              "You are a household meal planner. Assign recipes to meal plan slots for a 7-day week. Rules: 1) NEVER assign recipes to locked slots. 2) NEVER use recipes containing allergen or won't-eat ingredients. 3) Match recipe complexity to schedule: 'prep' slots get complex recipes, 'quick' slots get simple/fast recipes, 'away' slots get NO assignment (leave slot_name as null in your response for away slots). 4) Optimize for the priority order provided (first priority = most important). 5) Prefer recipes that use ingredients the household already has in inventory. 6) Avoid repeating the same recipe more than twice in a week unless the catalog is very small. 7) NEVER leave a Snacks slot empty. If the catalog has no snack-specific recipe, either (a) reuse a full-meal recipe from the catalog as a Snacks assignment with a rationale noting 'reused as snack' or (b) add an entry to suggestedRecipes describing a canonical snack (e.g., 'Greek Yogurt with Berries', 'Hummus and Vegetables', 'Trail Mix'). All slots in slotsToFill must appear in your response — either with a recipe_id or explicitly via suggestedRecipes. Only use recipe_id values from the candidates array — NEVER invent recipe_ids. 8) Enforce tier quotas across the 28 weekly slots based on recipeMix percentages: favorites% of assignments should come from recipes with tier_hint='favorite' (high avg_rating and cook_count>0); liked% should come from tier_hint='liked' recipes, deprioritizing those with a last_cooked_date within the past 14 days; novel% should come from tier_hint='novel' recipes (cook_count=0), choosing novels by ingredient similarity to the highest-avg-rating favorite in the shortlist. 9) For generation_rationale, use these EXACT formats: Favorite tier → 'Favorite — avg {N} stars across {N} cooks' where the first {N} is avg_rating rounded to 1 decimal and the second {N} is cook_count; Liked tier → 'Liked — last cooked {N} weeks ago' where {N} = floor(daysSinceLastCooked/7); if last_cooked_date is null use 'Liked — not recently cooked'; Novel tier → 'Novel — similar ingredients to your top-rated {Recipe Name}' where Recipe Name is the highest-avg_rating favorite whose ingredient_names overlap with this novel recipe. If no history is available for a recipe, fall back to a brief nutrition-fit rationale. Return JSON: { slots: [{ day_index: number, slot_name: string, recipe_id: string, rationale: string }], violations: string[], suggestedRecipes: [{ name: string, prepMinutes: number, description: string }] }",
            messages: [
              {
                role: "user",
                content: JSON.stringify({
                  candidates: shortlistedRecipes,
                  slotsToFill,
                  lockedSlots: lockedSlots.map((s) => ({ day_index: s.day_index, slot_name: s.slot_name })),
                  inventory: inventoryNames,
                  nutritionTargets,
                  priorityOrder: priorityOrder ?? [],
                  recipeMix,
                  smallCatalog,
                  constraints: {
                    allergens: allergenNames,
                    wontEat: wontEatNames,
                    restrictions: allPredefined,
                  },
                }),
              },
            ],
          }),
        });

        if (assignResponse.ok) {
          const assignData = await assignResponse.json();
          const assignText = assignData.content?.[0]?.text ?? "";
          const assignMatch = assignText.match(/\{[\s\S]*\}/);
          if (assignMatch) {
            try {
              const parsed: AssignResult = JSON.parse(assignMatch[0]);
              // Validate recipe IDs from AI response (T-22-04).
              // Any assignment that fails validation is logged to droppedAssignments
              // for observability — no more silent drops.
              const validIds = new Set(recipes.map((r) => r.id));
              const recipeByName: Record<string, string> = {};
              for (const r of recipes) {
                recipeByName[r.name.toLowerCase()] = r.id;
              }
              const rawSlotCount = (parsed.slots ?? []).length;
              const validSlots: AssignedSlot[] = [];
              for (const s of (parsed.slots ?? [])) {
                if (!s.recipe_id) {
                  droppedAssignments.push({
                    day_index: s.day_index,
                    slot_name: s.slot_name,
                    raw_recipe_id: null,
                    reason: "missing_recipe_id",
                  });
                  continue;
                }
                if (!validIds.has(s.recipe_id)) {
                  droppedAssignments.push({
                    day_index: s.day_index,
                    slot_name: s.slot_name,
                    raw_recipe_id: s.recipe_id,
                    reason: "invalid_recipe_id",
                  });
                  continue;
                }
                validSlots.push(s);
              }
              parsed.slots = validSlots;
              // Store debug info for diagnostics
              constraintSnapshotSummary = {
                ...constraintSnapshotSummary,
                _debug_rawSlots: rawSlotCount,
                _debug_validSlots: parsed.slots.length,
                _debug_assignText: assignText.substring(0, 500),
              };
              bestResult = parsed;
              suggestedRecipes = parsed.suggestedRecipes;
              pass2Completed = true;
            } catch {
              // Keep empty bestResult
            }
          }
        }
      }

      // Passes 3-5 — Verify and Correct (if violations exist)
      for (let pass = 3; pass <= 5; pass++) {
        if (!hasTimeLeft()) {
          correctionPassesSkippedForTime = true;
          break;
        }
        if ((bestResult.violations ?? []).length === 0) break;

        passCount++;
        const verifyResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 4096,
            system:
              "You are a household meal planner. Assign recipes to meal plan slots for a 7-day week. Rules: 1) NEVER assign recipes to locked slots. 2) NEVER use recipes containing allergen or won't-eat ingredients. 3) Match recipe complexity to schedule: 'prep' slots get complex recipes, 'quick' slots get simple/fast recipes, 'away' slots get NO assignment. 4) Optimize for the priority order provided. 5) Prefer recipes that use ingredients the household already has in inventory. 6) Avoid repeating the same recipe more than twice in a week unless the catalog is very small. 7) NEVER leave a Snacks slot empty. If the catalog has no snack-specific recipe, either (a) reuse a full-meal recipe from the catalog as a Snacks assignment with a rationale noting 'reused as snack' or (b) add an entry to suggestedRecipes describing a canonical snack (e.g., 'Greek Yogurt with Berries', 'Hummus and Vegetables', 'Trail Mix'). All slots in slotsToFill must appear in your response — either with a recipe_id or explicitly via suggestedRecipes. Only use recipe_id values from the candidates array — NEVER invent recipe_ids. Return JSON: { slots: [{ day_index: number, slot_name: string, recipe_id: string, rationale: string }], violations: string[], suggestedRecipes: [{ name: string, prepMinutes: number, description: string }] }",
            messages: [
              {
                role: "user",
                content: JSON.stringify({
                  previousAssignment: {
                    slots: bestResult.slots,
                    violations: bestResult.violations,
                  },
                  constraints: {
                    candidates: shortlistedRecipes,
                    slotsToFill,
                    lockedSlots: lockedSlots.map((s) => ({ day_index: s.day_index, slot_name: s.slot_name })),
                    allergens: allergenNames,
                    wontEat: wontEatNames,
                    restrictions: allPredefined,
                    inventory: inventoryNames,
                    priorityOrder: priorityOrder ?? [],
                  },
                  instruction: "Fix these violations while preserving as many good assignments as possible.",
                }),
              },
            ],
          }),
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const verifyText = verifyData.content?.[0]?.text ?? "";
          const verifyMatch = verifyText.match(/\{[\s\S]*\}/);
          if (verifyMatch) {
            try {
              const parsed: AssignResult = JSON.parse(verifyMatch[0]);
              // Validate recipe IDs (T-22-04) — log drops to droppedAssignments
              const validIds = new Set(recipes.map((r) => r.id));
              const validVerifySlots: AssignedSlot[] = [];
              for (const s of (parsed.slots ?? [])) {
                if (!s.recipe_id || !validIds.has(s.recipe_id)) {
                  droppedAssignments.push({
                    day_index: s.day_index,
                    slot_name: s.slot_name,
                    raw_recipe_id: s.recipe_id ?? null,
                    reason: !s.recipe_id ? "missing_recipe_id" : "invalid_recipe_id",
                  });
                  continue;
                }
                validVerifySlots.push(s);
              }
              parsed.slots = validVerifySlots;
              if ((parsed.violations ?? []).length < (bestResult.violations ?? []).length) {
                bestResult = parsed;
                suggestedRecipes = parsed.suggestedRecipes;
              }
            } catch {
              // Keep existing bestResult
            }
          }
        }
      }

      // Determine final status.
      // 'done'    = Pass 2 completed AND correction passes 3-5 either ran to completion or were unnecessary
      // 'partial' = Pass 2 completed but correction passes 3-5 were skipped for time (assignment is written, but not verified)
      // 'timeout' = Pass 2 did NOT complete within budget (assignment is empty or stale)
      // 'error'   = thrown exception, handled in outer catch block
      if (!pass2Completed) {
        finalStatus = "timeout";
      } else if (correctionPassesSkippedForTime) {
        finalStatus = "partial";
      } else {
        finalStatus = "done";
      }

      // Slot-level fallback (Gap A closure). For every slotToFill that ended up
      // without a valid assignment in bestResult.slots, attempt to reuse a meal
      // from elsewhere in bestResult.slots. If no reuse is possible, mark the
      // slot as skipped with a reason so the UI can show user-facing messaging.
      //
      // This honors D-22 (repeats allowed when catalog is small) and D-21
      // (suggest recipes the user could add).
      if (pass2Completed) {
        const assignedKeySet = new Set(
          bestResult.slots.map((s) => `${s.day_index}_${s.slot_name}`),
        );
        const awayKeySet = new Set(
          Object.entries(scheduleStatus)
            .filter(([, status]) => status === "away")
            .map(([k]) => k),
        );

        // Build a pool of candidate reuse assignments from bestResult.slots.
        // Prefer recipes that were NOT already assigned to the target slot_name
        // on any day, then fall back to any assigned recipe. This reduces visible
        // repetition of e.g. "Tomato Soup at Breakfast AND Snacks on same day".
        for (const slot of slotsToFill) {
          const key = `${slot.day_index}_${slot.slot_name}`;
          if (assignedKeySet.has(key)) continue;
          if (awayKeySet.has(key)) continue;

          // Try to find a reuse candidate
          const sameSlotNameUses = bestResult.slots.filter(
            (s) => s.slot_name === slot.slot_name,
          );
          const otherSlotNameUses = bestResult.slots.filter(
            (s) => s.slot_name !== slot.slot_name,
          );

          // Prefer a recipe not yet used in this slot_name (variety),
          // then any recipe from bestResult.slots.
          const reuseFrom =
            otherSlotNameUses.find((s) => !sameSlotNameUses.some((u) => u.recipe_id === s.recipe_id))
            ?? otherSlotNameUses[0]
            ?? sameSlotNameUses[0];

          if (reuseFrom) {
            bestResult.slots.push({
              day_index: slot.day_index,
              slot_name: slot.slot_name,
              recipe_id: reuseFrom.recipe_id,
              rationale: `Reused ${reuseFrom.rationale ? "(" + reuseFrom.rationale.slice(0, 60) + ")" : "from plan"} — catalog has no ${slot.slot_name.toLowerCase()}-specific recipe`,
            });
            reusedFills.push({
              day_index: slot.day_index,
              slot_name: slot.slot_name,
              meal_id: reuseFrom.recipe_id,
              source: "reuse_from_plan",
            });
            assignedKeySet.add(key);
          } else {
            // No reuse candidate — mark as skipped and ensure suggestedRecipes
            // has at least one generic snack entry so the user has an option.
            skippedSlots.push({
              day_index: slot.day_index,
              slot_name: slot.slot_name,
              reason: "no_catalog_recipe_and_no_reuse_candidate",
            });
          }
        }

        // If any Snacks slot was skipped AND suggestedRecipes doesn't already
        // contain at least one generic snack, seed a canonical snack suggestion.
        const snacksSkipped = skippedSlots.some((s) => s.slot_name === "Snacks");
        const hasSnackSuggestion = (suggestedRecipes ?? []).some((r) =>
          /snack|yogurt|trail mix|hummus|nut|fruit|granola/i.test(r.name + " " + r.description),
        );
        if (snacksSkipped && !hasSnackSuggestion) {
          suggestedRecipes = [
            ...(suggestedRecipes ?? []),
            {
              name: "Greek Yogurt with Berries and Granola",
              prepMinutes: 3,
              description: "Protein-rich snack: Greek yogurt topped with mixed berries and a tablespoon of granola. 180 kcal, 15g protein.",
            },
          ];
        }
      }

      // Pre-fetch/create meals for all recipes to avoid per-slot DB round-trips
      const mealIdByRecipeId: Record<string, string> = {};
      for (const recipe of recipes) {
        const { data: existingMeals } = await adminClient
          .from("meals")
          .select("id")
          .eq("household_id", householdId)
          .eq("name", recipe.name)
          .limit(1);

        if (existingMeals && existingMeals.length > 0) {
          mealIdByRecipeId[recipe.id] = existingMeals[0].id;
        } else {
          const { data: newMeal } = await adminClient
            .from("meals")
            .insert({ household_id: householdId, name: sanitizeString(recipe.name), created_by: user.id })
            .select("id")
            .single();
          if (newMeal) mealIdByRecipeId[recipe.id] = newMeal.id;
        }
      }

      // Bulk write slot assignments — capitalize slot_name to match frontend DEFAULT_SLOTS
      const slotOrderMap: Record<string, number> = { "Breakfast": 0, "Lunch": 1, "Dinner": 2, "Snacks": 3 };
      const upsertRows = bestResult.slots
        .filter((s) => s.recipe_id && mealIdByRecipeId[s.recipe_id])
        .map((s) => {
          // Capitalize to match existing DB rows (e.g., "breakfast" -> "Breakfast")
          const capitalizedSlotName = s.slot_name.charAt(0).toUpperCase() + s.slot_name.slice(1).toLowerCase();
          return {
            plan_id: planId,
            day_index: s.day_index,
            slot_name: capitalizedSlotName,
            slot_order: slotOrderMap[capitalizedSlotName] ?? 0,
            meal_id: mealIdByRecipeId[s.recipe_id],
            generation_rationale: s.rationale,
            is_override: false,
          };
        });

      let upsertError: string | null = null;
      if (upsertRows.length > 0) {
        const { error: ue } = await adminClient.from("meal_plan_slots").upsert(
          upsertRows,
          { onConflict: "plan_id,day_index,slot_name" },
        );
        if (ue) upsertError = ue.message;
      }

      const totalSlotsToFill = slotsToFill.filter((s) => {
        const key = `${s.day_index}_${s.slot_name}`;
        return scheduleStatus[key] !== "away";
      }).length;
      constraintSnapshotSummary = {
        ...constraintSnapshotSummary,
        _debug_upsertCount: upsertRows.length,
        _debug_upsertError: upsertError,
        _debug_bestSlots: bestResult.slots.length,
        _debug_mealIds: Object.keys(mealIdByRecipeId).length,
        droppedAssignments,
        skippedSlots,
        reusedFills,
        coverage: {
          totalSlotsToFill,
          filledSlots: upsertRows.length,
          reusedFills: reusedFills.length,
          skippedSlots: skippedSlots.length,
          droppedAssignments: droppedAssignments.length,
        },
      };

      // Update job row to done/timeout
      await adminClient.from("plan_generations").update({
        status: finalStatus,
        pass_count: passCount,
        completed_at: new Date().toISOString(),
        constraint_snapshot: {
          ...constraintSnapshotSummary,
          ...(suggestedRecipes ? { suggestedRecipes } : {}),
        },
      }).eq("id", jobId);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      await adminClient.from("plan_generations").update({
        status: "error",
        pass_count: passCount,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ success: true, jobId }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
