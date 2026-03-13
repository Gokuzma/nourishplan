import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MacroValues {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface VerifyRequest {
  foodName: string;
  usdaValues?: MacroValues;
  offValues?: MacroValues;
}

interface VerifyResponse {
  verified: boolean;
  recommended?: MacroValues;
  reason: string;
  warnings: string[];
}

function buildOutlierWarnings(values: MacroValues, source: string): string[] {
  const warnings: string[] = [];
  const { calories, protein, fat, carbs } = values;

  // Macro-calorie math check: protein*4 + fat*9 + carbs*4 should approximate calories
  const estimatedCalories = protein * 4 + fat * 9 + carbs * 4;
  if (estimatedCalories > calories / 4 * 1.1) {
    warnings.push(
      `${source}: macro-calorie math mismatch — estimated ${Math.round(estimatedCalories)} kcal from macros vs reported ${calories} kcal`,
    );
  }

  // Negative macro check
  if (protein < 0 || fat < 0 || carbs < 0) {
    warnings.push(`${source}: one or more macros are negative`);
  }

  // Zero calories with non-zero macros
  if (calories === 0 && protein + fat + carbs > 0) {
    warnings.push(`${source}: calories reported as 0 but macros sum > 0`);
  }

  return warnings;
}

function buildPrompt(
  foodName: string,
  usdaValues?: MacroValues,
  offValues?: MacroValues,
): string {
  const lines: string[] = [
    `Check the nutrition values per 100g for "${foodName}".`,
    "",
  ];

  if (usdaValues) {
    lines.push(
      `USDA values: calories=${usdaValues.calories} kcal, protein=${usdaValues.protein}g, fat=${usdaValues.fat}g, carbs=${usdaValues.carbs}g`,
    );
  }

  if (offValues) {
    lines.push(
      `Open Food Facts values: calories=${offValues.calories} kcal, protein=${offValues.protein}g, fat=${offValues.fat}g, carbs=${offValues.carbs}g`,
    );
  }

  lines.push(
    "",
    "Are these nutrition values reasonable for this food? Flag any outliers or data quality issues.",
    "Respond with valid JSON only:",
    `{ "verified": true/false, "recommended": { "calories": number, "protein": number, "fat": number, "carbs": number }, "reason": "brief explanation", "warnings": ["warning if any"] }`,
  );

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        verified: false,
        reason: "AI verification not configured",
        warnings: [],
      } satisfies VerifyResponse),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let body: VerifyRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { foodName, usdaValues, offValues } = body;

  // Run outlier detection locally (independent of AI call)
  const localWarnings: string[] = [];
  if (usdaValues) localWarnings.push(...buildOutlierWarnings(usdaValues, "USDA"));
  if (offValues) localWarnings.push(...buildOutlierWarnings(offValues, "OFF"));

  const prompt = buildPrompt(foodName, usdaValues, offValues);

  let aiResult: { verified: boolean; recommended?: MacroValues; reason: string; warnings: string[] };
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from response (Claude may include markdown code fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Claude response");

    aiResult = JSON.parse(jsonMatch[0]);
  } catch {
    // Graceful degradation — never block food search
    return new Response(
      JSON.stringify({
        verified: false,
        reason: "AI verification unavailable",
        warnings: localWarnings,
      } satisfies VerifyResponse),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const combinedWarnings = [
    ...localWarnings,
    ...(aiResult.warnings ?? []),
  ];

  const result: VerifyResponse = {
    verified: aiResult.verified ?? false,
    recommended: aiResult.recommended,
    reason: aiResult.reason ?? "",
    warnings: combinedWarnings,
  };

  return new Response(
    JSON.stringify(result),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
