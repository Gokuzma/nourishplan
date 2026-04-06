import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClassifyRequest {
  memberId: string;
  memberType: "user" | "profile";
  restrictions: string[];
  customEntries: string[];
  householdId: string;
}

interface AIIngredient {
  food_name: string;
  strength: "allergy" | "refuses";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body: ClassifyRequest = await req.json();
    const { memberId, memberType, restrictions, customEntries, householdId } = body;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "AI classification not configured" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate that memberId belongs to the caller's household
    if (memberType === "user") {
      const { data: member } = await adminClient
        .from("household_members")
        .select("household_id")
        .eq("user_id", memberId)
        .eq("household_id", householdId)
        .maybeSingle();
      if (!member) {
        return new Response(
          JSON.stringify({ success: false, error: "Member not found in household" }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    } else {
      const { data: profile } = await adminClient
        .from("member_profiles")
        .select("household_id")
        .eq("id", memberId)
        .eq("household_id", householdId)
        .maybeSingle();
      if (!profile) {
        return new Response(
          JSON.stringify({ success: false, error: "Profile not found in household" }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    const allRestrictions = [...restrictions, ...customEntries].filter(Boolean);
    if (allRestrictions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, mapped_count: 0 }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
          "You are a food ingredient classifier. Given dietary restrictions, list specific food ingredients that should be avoided. Return a JSON array of objects with { food_name: string, strength: 'allergy' | 'refuses' }. For allergens (nut allergy, shellfish allergy), use 'allergy' strength. For dietary preferences (vegetarian, vegan, gluten-free, dairy-free, halal, kosher), use 'refuses' strength.",
        messages: [
          {
            role: "user",
            content: `Restrictions: ${restrictions.join(", ")}. Custom entries: ${customEntries.join(", ")}. List all specific food ingredients that should be avoided.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned ${response.status}`);
    }

    const aiData = await response.json();
    const text = aiData.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ success: false, error: "No JSON array in AI response" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const ingredients: AIIngredient[] = JSON.parse(jsonMatch[0]);

    const memberFk: Record<string, string> =
      memberType === "user"
        ? { member_user_id: memberId }
        : { member_profile_id: memberId };

    let mappedCount = 0;
    for (const ingredient of ingredients) {
      if (!ingredient.food_name) continue;
      const row = {
        household_id: householdId,
        ...memberFk,
        food_name: ingredient.food_name,
        strength: ingredient.strength ?? "refuses",
        source: "ai_restriction",
      };
      const { error } = await adminClient
        .from("wont_eat_entries")
        .upsert(row, { onConflict: `household_id,food_name,${memberType === "user" ? "member_user_id" : "member_profile_id"}` });
      if (!error) mappedCount++
    }

    return new Response(
      JSON.stringify({ success: true, mapped_count: mappedCount }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
