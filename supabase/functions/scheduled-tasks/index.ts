// Daily scheduled tick (pg_cron → pg_net → this function).
// A. Auto-draft: for households with auto_draft_enabled whose next week
//    starts tomorrow, create the meal_plan row and run generation, then
//    push "draft ready" to household subscriptions.
// B. Leftover expiry: push a nudge for unexpired leftovers that expire
//    today or tomorrow.
// Auth: x-internal-secret must match the INTERNAL_FN_SECRET function secret.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPush, type PushSubscriptionRow } from "../_shared/push.ts";

interface ForceOptions {
  householdId?: string;
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  const internalSecret = Deno.env.get("INTERNAL_FN_SECRET");
  if (!internalSecret || req.headers.get("x-internal-secret") !== internalSecret) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const force = (body as { force?: ForceOptions }).force;

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayDow = now.getUTCDay();

  const summary = {
    drafts: [] as { householdId: string; weekStart: string }[],
    skipped: [] as { householdId: string; reason: string }[],
    leftoverPushes: 0,
    draftErrors: 0,
  };

  const background = (p: Promise<unknown>) => {
    const rt = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(p);
    else p.catch(() => {});
  };

  // ---- A. Auto-draft ----
  const { data: households } = await adminClient
    .from("households")
    .select("id, week_start_day")
    .eq("auto_draft_enabled", true);

  for (const hh of households ?? []) {
    const daysUntil = (hh.week_start_day - todayDow + 7) % 7;
    const isForced = force?.householdId === hh.id;
    // Draft the day before the new week starts
    if (!isForced && daysUntil !== 1) continue;

    const weekStart = addDaysStr(todayStr, daysUntil === 0 ? 7 : daysUntil);

    const { data: admin } = await adminClient
      .from("household_members")
      .select("user_id")
      .eq("household_id", hh.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (!admin) {
      summary.skipped.push({ householdId: hh.id, reason: "no admin" });
      continue;
    }

    // Find or create the plan row (mirrors useCreateMealPlan)
    let { data: plan } = await adminClient
      .from("meal_plans")
      .select("id")
      .eq("household_id", hh.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (!plan) {
      const { data: created, error: createErr } = await adminClient
        .from("meal_plans")
        .upsert(
          { household_id: hh.id, week_start: weekStart, created_by: admin.user_id },
          { onConflict: "household_id,week_start", ignoreDuplicates: false },
        )
        .select("id")
        .single();
      if (createErr || !created) {
        summary.skipped.push({ householdId: hh.id, reason: "plan create failed" });
        continue;
      }
      plan = created;
    } else if (!isForced) {
      // Plan exists — don't clobber a week the household already worked on
      const { count: filled } = await adminClient
        .from("meal_plan_slots")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", plan.id)
        .not("meal_id", "is", null);
      if ((filled ?? 0) > 0) {
        summary.skipped.push({ householdId: hh.id, reason: "already planned" });
        continue;
      }
      const { count: priorGens } = await adminClient
        .from("plan_generations")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", plan.id);
      if ((priorGens ?? 0) > 0) {
        summary.skipped.push({ householdId: hh.id, reason: "already generated" });
        continue;
      }
    }

    const planId = plan.id;
    // Generation runs 1-2 minutes; do it after responding, then notify.
    background((async () => {
      try {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-plan`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({
            householdId: hh.id,
            planId,
            weekStart,
            priorityOrder: [],
            triggeredBy: admin.user_id,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!data?.success) throw new Error(data?.error ?? `generate-plan HTTP ${res.status}`);

        const { data: subs } = await adminClient
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("household_id", hh.id);
        await sendPush(adminClient, (subs ?? []) as PushSubscriptionRow[], {
          title: "Your draft plan is ready",
          body: `Next week's meal plan (week of ${weekStart}) has been drafted — review and adjust.`,
          url: "/plan",
        });
      } catch (err) {
        await adminClient.from("client_errors").insert({
          user_id: admin.user_id,
          household_id: hh.id,
          source: "edge:scheduled-tasks",
          message: `auto-draft failed: ${err instanceof Error ? err.message : String(err)}`,
          context: { weekStart, planId },
        });
      }
    })());
    summary.drafts.push({ householdId: hh.id, weekStart });
  }

  // ---- B. Leftover expiry nudges ----
  const dayAfterTomorrowStr = addDaysStr(todayStr, 2);
  const { data: leftovers } = await adminClient
    .from("inventory_items")
    .select("household_id, food_name, expires_at")
    .eq("is_leftover", true)
    .is("removed_at", null)
    .gt("quantity_remaining", 0)
    .gte("expires_at", todayStr)
    .lt("expires_at", dayAfterTomorrowStr);

  const byHousehold = new Map<string, { food_name: string; expires_at: string }[]>();
  for (const item of leftovers ?? []) {
    const list = byHousehold.get(item.household_id) ?? [];
    list.push(item);
    byHousehold.set(item.household_id, list);
  }

  for (const [householdId, items] of byHousehold) {
    const { data: subs } = await adminClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("household_id", householdId);
    if (!subs || subs.length === 0) continue;

    const first = items[0];
    const expiresToday = first.expires_at.slice(0, 10) === todayStr;
    const bodyText = items.length === 1
      ? `${first.food_name} expires ${expiresToday ? "today" : "tomorrow"} — plan it for lunch?`
      : `${items.length} leftovers expire in the next two days — use them up before they turn.`;
    const result = await sendPush(adminClient, subs as PushSubscriptionRow[], {
      title: "Leftovers ready to eat",
      body: bodyText,
      url: "/today",
    });
    summary.leftoverPushes += result.sent;
  }

  return new Response(JSON.stringify({ success: true, ...summary }), {
    headers: { "Content-Type": "application/json" },
  });
});
