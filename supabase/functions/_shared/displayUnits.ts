// Recipe ingredients carry a human amount ("2", "1 cup", "3 cloves") next to
// quantity_grams. Grams stay the truth for nutrition/cost/inventory.

export const DISPLAY_UNIT_SCHEMA = `"display_amount": number, "display_unit": string`;

export const DISPLAY_UNIT_RULES =
  `For every ingredient also give "display_amount" and "display_unit": how a normal home recipe writes the amount, matching quantity_grams. ` +
  `Counted whole things (eggs, onions, apples, potatoes, tortillas, chicken thighs) → display_unit "" and the count, e.g. 2 eggs = {"display_amount": 2, "display_unit": ""}; add a size word only if it matters ("large"). ` +
  `Garlic → "clove"; bread/cheese slices → "slice"; canned goods → "can (796 ml)" style with the can size; herbs → "bunch" or "tbsp". ` +
  `Liquids (broth, milk, cream, water, oil), grains, flours, sugar, sauces, spices → "cup", "tbsp" or "tsp" with kitchen fractions (0.25, 0.33, 0.5, 0.75) — 180 ml broth is 0.75 "cup", 60 ml oil is 0.25 "cup"; only liquids over 4 cups use "L". ` +
  `Chopped vegetables, florets, leafy greens, berries, shredded cheese → "cup" (200 g broccoli ≈ 2 "cup"); whole vegetables and fruit → a count; ` +
  `only meat, fish, tofu, pasta and baby carrots/potatoes by the bag use "g" or "kg". ` +
  `Always singular unit words ("cup", not "cups").`;

const MAX_UNIT_CHARS = 30;

export function sanitizeDisplayUnit(raw: unknown): { display_amount: number | null; display_unit: string | null } {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const amount = typeof o.display_amount === "number" && isFinite(o.display_amount) && o.display_amount > 0 &&
      o.display_amount <= 10000
    ? Math.round(o.display_amount * 1000) / 1000
    : null;
  if (amount === null || typeof o.display_unit !== "string") return { display_amount: null, display_unit: null };
  let unit = o.display_unit.trim().slice(0, MAX_UNIT_CHARS);
  unit = unit === "l" ? "L" : unit.toLowerCase().replace(/\bl\b/g, "L").replace(/(\d)\s*ml\b/g, "$1 ml");
  // Singular unit words ("cups" → "cup"), leaving abbreviations alone.
  unit = unit.replace(/^(cup|clove|slice|can|jar|bunch|pinch|sprig|stalk|piece|package|bag|head)(e?s)\b/, "$1");
  return { display_amount: amount, display_unit: unit };
}
