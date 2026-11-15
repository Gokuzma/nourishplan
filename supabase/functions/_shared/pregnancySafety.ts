// Pure module (no Deno/URL imports) so vitest can import it directly.

export const PREGNANCY_AVOID_RULE =
  "A household member is pregnant. NEVER include recipes containing: deli meats or cold cured meats (salami, prosciutto, cold cuts) unless the recipe heats them until steaming hot; raw or undercooked meat, eggs, fish or shellfish, including sushi, sashimi, tartare and ceviche; high-mercury fish (shark, swordfish, king mackerel, tilefish, bigeye tuna, marlin); unpasteurized milk or dairy, and soft mould-ripened or blue-veined cheeses (brie, camembert, gorgonzola, roquefort) unless they are pasteurized; raw sprouts (alfalfa, bean, clover, radish); liver and pâté; alcohol in any form (wine, beer, spirits, liqueur), including in sauces.";

export const PREGNANCY_BANNED_TERMS: string[] = [
  "wine", "beer", "liqueur", "rum", "vodka", "whisky", "bourbon", "brandy", "sake",
  "liver", "pâté", "pate", "shark", "swordfish", "king mackerel", "tilefish",
  "bigeye tuna", "marlin", "sushi", "sashimi", "tartare", "ceviche",
];

const MS_PER_DAY = 86400000;
const MAX_DAYS_UNTIL_DUE = 300;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BANNED_TERM_PATTERNS: RegExp[] = PREGNANCY_BANNED_TERMS.map(
  (term) => new RegExp(`(^|[^a-z0-9])${escapeRegex(term.normalize("NFC").toLowerCase())}([^a-z0-9]|$)`),
);

export function isPregnancyUnsafe(recipeName: string, ingredientNames: string[]): boolean {
  const texts = [recipeName, ...ingredientNames].map((t) => (t ?? "").normalize("NFC").toLowerCase());
  return texts.some((text) => BANNED_TERM_PATTERNS.some((pattern) => pattern.test(text)));
}

function utcDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY);
}

// A pregnant row with no due date fails safe: treated as currently pregnant.
export function isCurrentlyPregnant(
  row: { is_pregnant: boolean; due_date: string | null },
  today: Date,
): boolean {
  if (!row.is_pregnant) return false;
  if (!row.due_date) return true;
  const daysUntilDue = utcDayNumber(new Date(`${row.due_date}T00:00:00Z`)) - utcDayNumber(today);
  return daysUntilDue >= 0 && daysUntilDue <= MAX_DAYS_UNTIL_DUE;
}
