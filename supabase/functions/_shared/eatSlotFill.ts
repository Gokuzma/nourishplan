// Deterministic fill for "Eat" (consume) slots: an Eat slot may only hold food
// that will actually exist — leftovers of a meal cooked earlier in the week, or a
// ready meal from inventory. Otherwise the AI's recipe stays, labelled make-ahead.
// Quick slots the AI left empty may take a ready meal.

export const SLOT_ORDER = ["Breakfast", "Lunch", "Dinner", "Snacks"];

// A Cook slot can stretch to one Eat slot; a Batch slot is cooked to cover more.
const SOURCE_CAPACITY: Record<string, number> = { prep: 1, batch: 3 };
const MAX_LEFTOVER_DAYS = 3;

export interface PlanSlotInput {
  day_index: number;
  slot_name: string;
  status: string;
  recipe_id: string | null;
  eaters: number;
}

export interface ReadyMealInput {
  id: string;
  name: string;
  storage_location: string;
  slots: string[];
  servings: number;
  expires_at: string | null;
}

export interface SlotFill {
  fill_source: "leftover" | "ready_meal" | "make_ahead";
  fill_note: string;
  recipe_id: string | null;
  ready_meal_id: string | null;
}

export interface EatFillResult {
  fills: Map<string, SlotFill>;
  extraPortions: Map<string, number>;
  readyMealServingsUsed: Map<string, number>;
}

export function slotKey(dayIndex: number, slotName: string): string {
  return `${dayIndex}|${slotName}`;
}

function mealKind(slotName: string): string {
  return slotName === "Lunch" || slotName === "Dinner" ? "main" : slotName;
}

function timeIndex(dayIndex: number, slotName: string): number {
  return dayIndex * SLOT_ORDER.length + SLOT_ORDER.indexOf(slotName);
}

function locationLabel(location: string): string {
  return location.charAt(0).toUpperCase() + location.slice(1);
}

export function fillEatSlots(
  slots: PlanSlotInput[],
  readyMeals: ReadyMealInput[],
  dayNames: string[],
  isUnsafe: (name: string) => boolean,
): EatFillResult {
  const fills = new Map<string, SlotFill>();
  const extraPortions = new Map<string, number>();
  const readyMealServingsUsed = new Map<string, number>();
  const sourceUses = new Map<string, number>();

  const ordered = [...slots]
    .filter((s) => SLOT_ORDER.includes(s.slot_name))
    .sort((a, b) => timeIndex(a.day_index, a.slot_name) - timeIndex(b.day_index, b.slot_name));

  function pickReadyMeal(slot: PlanSlotInput): ReadyMealInput | null {
    const needed = Math.max(1, slot.eaters);
    const candidates = readyMeals.filter((m) =>
      m.slots.includes(slot.slot_name) &&
      m.servings - (readyMealServingsUsed.get(m.id) ?? 0) >= needed &&
      !isUnsafe(m.name)
    );
    candidates.sort((a, b) => {
      if (a.expires_at && b.expires_at && a.expires_at !== b.expires_at) return a.expires_at < b.expires_at ? -1 : 1;
      if (a.expires_at && !b.expires_at) return -1;
      if (!a.expires_at && b.expires_at) return 1;
      const leftA = a.servings - (readyMealServingsUsed.get(a.id) ?? 0);
      const leftB = b.servings - (readyMealServingsUsed.get(b.id) ?? 0);
      return leftB - leftA;
    });
    return candidates[0] ?? null;
  }

  function useReadyMeal(slot: PlanSlotInput, meal: ReadyMealInput) {
    const needed = Math.max(1, slot.eaters);
    readyMealServingsUsed.set(meal.id, (readyMealServingsUsed.get(meal.id) ?? 0) + needed);
    fills.set(slotKey(slot.day_index, slot.slot_name), {
      fill_source: "ready_meal",
      fill_note: `${locationLabel(meal.storage_location)} · uses ${needed} of ${meal.servings}`,
      recipe_id: null,
      ready_meal_id: meal.id,
    });
  }

  for (const slot of ordered) {
    const key = slotKey(slot.day_index, slot.slot_name);

    if (slot.status === "quick") {
      if (!slot.recipe_id) {
        const meal = pickReadyMeal(slot);
        if (meal) useReadyMeal(slot, meal);
      }
      continue;
    }
    if (slot.status !== "consume") continue;

    const here = timeIndex(slot.day_index, slot.slot_name);
    const source = ordered
      .filter((s) =>
        (s.status === "prep" || s.status === "batch") &&
        s.recipe_id &&
        !fills.has(slotKey(s.day_index, s.slot_name)) &&
        mealKind(s.slot_name) === mealKind(slot.slot_name) &&
        timeIndex(s.day_index, s.slot_name) < here &&
        slot.day_index - s.day_index <= MAX_LEFTOVER_DAYS &&
        (sourceUses.get(slotKey(s.day_index, s.slot_name)) ?? 0) < SOURCE_CAPACITY[s.status]
      )
      .sort((a, b) => timeIndex(b.day_index, b.slot_name) - timeIndex(a.day_index, a.slot_name))[0];

    if (source) {
      const sourceKey = slotKey(source.day_index, source.slot_name);
      sourceUses.set(sourceKey, (sourceUses.get(sourceKey) ?? 0) + 1);
      extraPortions.set(sourceKey, (extraPortions.get(sourceKey) ?? 0) + Math.max(1, slot.eaters));
      fills.set(key, {
        fill_source: "leftover",
        fill_note: `from ${dayNames[source.day_index]} ${source.slot_name.toLowerCase()}`,
        recipe_id: source.recipe_id,
        ready_meal_id: null,
      });
      continue;
    }

    const meal = pickReadyMeal(slot);
    if (meal) {
      useReadyMeal(slot, meal);
      continue;
    }

    if (slot.recipe_id) {
      fills.set(key, {
        fill_source: "make_ahead",
        fill_note: "prep ahead",
        recipe_id: slot.recipe_id,
        ready_meal_id: null,
      });
    }
  }

  return { fills, extraPortions, readyMealServingsUsed };
}

// Servings a ready-meal inventory row provides: one per unit, or weight / serving size.
export const DEFAULT_SERVING_GRAMS = 350;

export function readyMealServings(quantity: number, unit: string, servingGrams: number | null): number {
  if (unit === "units") return Math.floor(quantity);
  const grams = unit === "kg" ? quantity * 1000 : unit === "g" ? quantity : unit === "L" ? quantity * 1000 : quantity;
  return Math.floor(grams / (servingGrams && servingGrams > 0 ? servingGrams : DEFAULT_SERVING_GRAMS));
}
