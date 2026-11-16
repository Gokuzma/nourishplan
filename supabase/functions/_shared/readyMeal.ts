// Shared ready-meal detection fields for inventory AI parsing/classification.

export const READY_MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export const READY_MEAL_PROMPT_RULES = `Ready meals: set "is_ready_meal": true for food that is eaten as a meal or snack with no cooking beyond heating or toasting — frozen or fridge prepared meals, home-cooked meals that were frozen or saved, breakfast burritos, frozen pizza, pizza pops, chicken nuggets, fish sticks, frozen waffles, pot pies, dumplings, meal kits that only need heating, and single-serve snacks like mini hummus cups. A ready meal must be a complete dish someone would serve as the whole meal or snack by itself. Single components are NOT ready meals even when already cooked: plain cooked meat or chicken, cooked beans, corn, rice or pasta, raw meat, vegetables, fruit, plain frozen vegetables or fruit, bread, flour, sauces, dips and spreads in tubs or jars (hummus, guacamole, salsa), cheese blocks, condiments. When unsure, it is NOT a ready meal.
For a ready meal also give:
- "ready_meal_slots": the meals it suits, any of "Breakfast", "Lunch", "Dinner", "Snacks" (e.g. breakfast burritos -> ["Breakfast"], frozen pizza -> ["Lunch","Dinner"], mini hummus -> ["Snacks"]).
- "serving_grams": typical grams in one adult serving, only when the quantity unit is a weight or volume; null for counted units.
- "servings_per_unit": only for counted units — how many adult servings ONE unit makes (a frozen pizza ≈ 3, a breakfast burrito = 1, a pizza pop = 1, a waffle ≈ 0.5, a fish stick ≈ 0.2, a mini hummus cup = 1); null for weights.
- "serving_calories", "serving_protein_g", "serving_carbs_g", "serving_fat_g": your best estimate for ONE adult serving (not one unit, unless one unit is one serving), as numbers.
For anything that is not a ready meal, set "is_ready_meal": false and OMIT the other ready-meal fields (keeps the reply short).`;

export interface ReadyMealFields {
  is_ready_meal: boolean;
  ready_meal_slots: string[] | null;
  serving_grams: number | null;
  servings_per_unit: number | null;
  serving_calories: number | null;
  serving_protein_g: number | null;
  serving_carbs_g: number | null;
  serving_fat_g: number | null;
}

function nonNegative(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !isFinite(value) || value < 0 || value > max) return null;
  return Math.round(value * 10) / 10;
}

// Clamp AI output for the ready-meal fields — never trust it blindly.
export function sanitizeReadyMealFields(o: Record<string, unknown>): ReadyMealFields {
  if (o.is_ready_meal !== true) {
    return {
      is_ready_meal: false,
      ready_meal_slots: null,
      serving_grams: null,
      servings_per_unit: null,
      serving_calories: null,
      serving_protein_g: null,
      serving_carbs_g: null,
      serving_fat_g: null,
    };
  }
  const slots = Array.isArray(o.ready_meal_slots)
    ? [...new Set(o.ready_meal_slots.filter((s): s is string => READY_MEAL_SLOTS.includes(s as typeof READY_MEAL_SLOTS[number])))]
    : [];
  const grams = nonNegative(o.serving_grams, 3000);
  const perUnit = typeof o.servings_per_unit === "number" && isFinite(o.servings_per_unit) &&
      o.servings_per_unit > 0 && o.servings_per_unit <= 50
    ? Math.round(o.servings_per_unit * 100) / 100
    : null;
  return {
    is_ready_meal: true,
    ready_meal_slots: slots.length > 0 ? slots : ["Lunch", "Dinner"],
    serving_grams: grams && grams > 0 ? grams : null,
    servings_per_unit: perUnit,
    serving_calories: nonNegative(o.serving_calories, 5000),
    serving_protein_g: nonNegative(o.serving_protein_g, 500),
    serving_carbs_g: nonNegative(o.serving_carbs_g, 1000),
    serving_fat_g: nonNegative(o.serving_fat_g, 500),
  };
}
