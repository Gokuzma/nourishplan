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
}

interface RecipeRow {
  id: string;
  name: string;
  servings: number;
  recipe_ingredients: {
    ingredient_name: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body: GenerateRequest = await req.json();
    const { householdId, planId, weekStart, priorityOrder } = body;

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

    // Time budget — check before each AI pass; 8500ms leaves 1.5s for DB writes
    const startTime = Date.now();
    function hasTimeLeft(): boolean {
      return Date.now() - startTime < 8500;
    }

    let finalStatus = "done";
    let passCount = 0;
    let errorMessage: string | undefined;
    let bestResult: AssignResult = { slots: [], violations: [] };
    let suggestedRecipes: SuggestedRecipe[] | undefined;
    let constraintSnapshotSummary: Record<string, unknown> = {};

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
      ] = await Promise.all([
        adminClient
          .from("recipes")
          .select("id, name, servings, recipe_ingredients(ingredient_name, quantity_grams, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g)")
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
          .select("recipe_id, rating")
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

      // Locked slots (from existing DB rows)
      const lockedSlots = slots.filter((s) => s.is_locked);
      const lockedKey = new Set(lockedSlots.map((s) => `${s.day_index}_${s.slot_name}`));

      // Build schedule status lookup: key = `${day_index}_${slot_name}`
      const scheduleStatus: Record<string, string> = {};
      for (const ss of scheduleSlots) {
        // Normalize "Snack" (DB schedule) vs "Snacks" (plan grid)
        const normalizedSlotName = ss.slot_name === "Snack" ? "Snacks" : ss.slot_name;
        scheduleStatus[`${ss.day_of_week}_${normalizedSlotName.toLowerCase()}`] = ss.status;
      }

      // Enumerate ALL possible slots (7 days x 4 default slots), not just existing DB rows.
      // Existing DB rows may only cover slots that already have meals assigned.
      const DEFAULT_SLOT_NAMES = ["breakfast", "lunch", "dinner", "snacks"];
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

      // Recipe catalog for AI shortlist
      const recipeCatalog = recipes.map((r) => ({
        id: r.id,
        name: sanitizeString(r.name),
        ingredient_names: (r.recipe_ingredients ?? []).map((ri) => sanitizeString(ri.ingredient_name)),
        avg_rating: avgRatings[r.id] ?? null,
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
              "You are a household meal planner. Given a recipe catalog and household constraints, return a JSON array of recipe IDs that are good candidates for this week's plan. Consider dietary restrictions (HARD constraint — never include recipes with allergen ingredients), won't-eat lists (HARD — never include), member preferences (ratings), schedule complexity requirements, inventory availability (prefer recipes using ingredients the household has), and budget awareness. Return approximately 30 candidates. Return ONLY a JSON array of ID strings, nothing else.",
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

      // Recipe details for shortlisted candidates
      const shortlistedRecipes = recipes
        .filter((r) => shortlistedIds.includes(r.id))
        .map((r) => ({
          id: r.id,
          name: sanitizeString(r.name),
          ingredient_names: (r.recipe_ingredients ?? []).map((ri) => sanitizeString(ri.ingredient_name)),
          avg_rating: avgRatings[r.id] ?? null,
          servings: r.servings,
        }));

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
              "You are a household meal planner. Assign recipes to meal plan slots for a 7-day week. Rules: 1) NEVER assign recipes to locked slots. 2) NEVER use recipes containing allergen or won't-eat ingredients. 3) Match recipe complexity to schedule: 'prep' slots get complex recipes, 'quick' slots get simple/fast recipes, 'away' slots get NO assignment (leave slot_name as null in your response for away slots). 4) Optimize for the priority order provided (first priority = most important). 5) Prefer recipes that use ingredients the household already has in inventory. 6) Avoid repeating the same recipe more than twice in a week unless the catalog is very small. Return JSON: { slots: [{ day_index: number, slot_name: string, recipe_id: string, rationale: string }], violations: string[], suggestedRecipes: [{ name: string, prepMinutes: number, description: string }] }",
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
              // Validate recipe IDs from AI response (T-22-04)
              const validIds = new Set(recipes.map((r) => r.id));
              parsed.slots = (parsed.slots ?? []).filter(
                (s) => s.recipe_id && validIds.has(s.recipe_id),
              );
              bestResult = parsed;
              suggestedRecipes = parsed.suggestedRecipes;
            } catch {
              // Keep empty bestResult
            }
          }
        }
      }

      // Passes 3-5 — Verify and Correct (if violations exist)
      for (let pass = 3; pass <= 5; pass++) {
        if (!hasTimeLeft()) break;
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
              "You are a household meal planner. Assign recipes to meal plan slots for a 7-day week. Rules: 1) NEVER assign recipes to locked slots. 2) NEVER use recipes containing allergen or won't-eat ingredients. 3) Match recipe complexity to schedule: 'prep' slots get complex recipes, 'quick' slots get simple/fast recipes, 'away' slots get NO assignment. 4) Optimize for the priority order provided. 5) Prefer recipes that use ingredients the household already has in inventory. 6) Avoid repeating the same recipe more than twice in a week unless the catalog is very small. Return JSON: { slots: [{ day_index: number, slot_name: string, recipe_id: string, rationale: string }], violations: string[], suggestedRecipes: [{ name: string, prepMinutes: number, description: string }] }",
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
              // Validate recipe IDs (T-22-04)
              const validIds = new Set(recipes.map((r) => r.id));
              parsed.slots = (parsed.slots ?? []).filter(
                (s) => s.recipe_id && validIds.has(s.recipe_id),
              );
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

      // Check time budget status
      if (!hasTimeLeft()) {
        finalStatus = "timeout";
      }

      // Bulk write slot assignments
      for (const slotAssignment of bestResult.slots) {
        // Find or create a meal that wraps this recipe
        const recipe = recipes.find((r) => r.id === slotAssignment.recipe_id);
        if (!recipe) continue;

        // Look for an existing meal that references this recipe
        const { data: existingMeals } = await adminClient
          .from("meals")
          .select("id")
          .eq("household_id", householdId)
          .eq("name", recipe.name)
          .limit(1);

        let mealId: string;
        if (existingMeals && existingMeals.length > 0) {
          mealId = existingMeals[0].id;
        } else {
          // Create a new meal wrapping this recipe
          const { data: newMeal, error: mealError } = await adminClient
            .from("meals")
            .insert({ household_id: householdId, name: sanitizeString(recipe.name) })
            .select("id")
            .single();
          if (mealError || !newMeal) continue;
          mealId = newMeal.id;
        }

        // Compute slot_order from slot_name for correct display order
        const slotOrderMap: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snacks: 3 };
        const slotOrder = slotOrderMap[slotAssignment.slot_name.toLowerCase()] ?? 0;

        // Upsert into meal_plan_slots
        await adminClient.from("meal_plan_slots").upsert(
          {
            plan_id: planId,
            day_index: slotAssignment.day_index,
            slot_name: slotAssignment.slot_name,
            slot_order: slotOrder,
            meal_id: mealId,
            generation_rationale: slotAssignment.rationale,
            is_override: false,
          },
          { onConflict: "plan_id,day_index,slot_name" },
        );
      }

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
