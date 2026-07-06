/* Month-of-use simulator. Run with: npx vite-node sim-month.ts -- <phase>
   Phases: setup | seed | week <1-4> | audit | teardown-check
   Talks to prod Supabase as a dedicated "Sim Family" household. */
import {
  aggregateIngredients, subtractInventory, assignCategories, addRestockStaples,
  computeItemCost, formatDisplayQuantity, type ResolvedSlot, type RecipeIngredientNode,
} from '../src/utils/groceryGeneration'
import { computeFifoDeductions, type FifoNeed } from '../src/utils/inventory'
import { computeRecipeCostPerServing } from '../src/utils/cost'
import { getPriceForIngredient } from '../src/hooks/useFoodPrices'
import { calcPerServingMacros } from '../src/utils/recipeMacros'
import { getWeekStart } from '../src/utils/mealPlan'
import type { InventoryItem } from '../src/types/database'

const URL_ = process.env.SIM_URL!
const SVC = process.env.SIM_SVC!
const ANON = process.env.SIM_ANON!
const EMAIL = 'sim-family@nourishplan.test'
const PASS = 'SimFamily!2026'

// ── tiny seeded RNG so runs are reproducible ─────────────────────────────
let rngState = 20260705
function rnd(): number {
  rngState |= 0; rngState = (rngState + 0x6d2b79f5) | 0
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
function hashStr(s: string): number { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }

async function rest(path: string, method = 'GET', body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${URL_}/rest/v1${path}`, {
    method,
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

async function auth(path: string, body: unknown, key = SVC) {
  const res = await fetch(`${URL_}/auth/v1${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(`auth ${path} -> ${res.status}: ${JSON.stringify(j).slice(0, 300)}`)
  return j
}

async function userToken(): Promise<string> {
  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
  const j = await res.json()
  if (!j.access_token) throw new Error('login failed: ' + JSON.stringify(j).slice(0, 200))
  return j.access_token
}

async function fn(name: string, body: unknown, token: string) {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function ctx() {
  const hh = await rest(`/households?select=id&name=eq.Sim%20Family`)
  const householdId = hh[0]?.id
  if (!householdId) throw new Error('Sim Family household not found — run setup')
  const members = await rest(`/household_members?select=user_id&household_id=eq.${householdId}`)
  const userId = members[0].user_id
  const profiles = await rest(`/member_profiles?select=id,name&household_id=eq.${householdId}&order=name`)
  return { householdId, userId, profiles }
}

function dayISO(weekStart: string, offset: number): string {
  const d = new Date(weekStart + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}
function weekStartN(n: number): string {
  // week 4 = current week; weeks 1-3 are the three weeks before
  const today = new Date()
  const cur = getWeekStart(today, 0)
  const d = new Date(cur + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (4 - n) * 7)
  return d.toISOString().slice(0, 10)
}

// Member taste model: latent per recipe + per-member offset + noise.
function tasteRating(recipeName: string, member: string): number {
  const latent = 2.2 + (hashStr(recipeName) % 28) / 10 // 2.2..4.9
  const offset = ((hashStr(member + recipeName) % 11) - 5) / 10 // -0.5..0.5
  const noise = (rnd() - 0.5) * 0.8
  return Math.max(1, Math.min(5, Math.round(latent + offset + noise)))
}

const findings: string[] = []
function note(s: string) { findings.push(s); console.log('  [finding]', s) }

// ── PHASES ────────────────────────────────────────────────────────────────
async function setup() {
  // user
  let userId: string
  try {
    const u = await auth('/admin/users', { email: EMAIL, password: PASS, email_confirm: true })
    userId = u.id
  } catch (e) {
    const list = await fetch(`${URL_}/auth/v1/admin/users?page=1&per_page=100`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).then(r => r.json())
    userId = list.users.find((u: { email: string }) => u.email === EMAIL)?.id
    if (!userId) throw e
  }
  console.log('user', userId)
  const hhExisting = await rest(`/households?select=id&name=eq.Sim%20Family`)
  let householdId = hhExisting[0]?.id
  if (!householdId) {
    const hh = await rest('/households', 'POST', { name: 'Sim Family', week_start_day: 0, weekly_budget: 220 })
    householdId = hh[0].id
  }
  const memberRows = await rest(`/household_members?select=user_id&household_id=eq.${householdId}`)
  if (memberRows.length === 0) await rest('/household_members', 'POST', { household_id: householdId, user_id: userId, role: 'admin' })
  const existingProfiles = await rest(`/member_profiles?select=id&household_id=eq.${householdId}`)
  if (existingProfiles.length === 0) {
    const profs = await rest('/member_profiles', 'POST', [
      { household_id: householdId, managed_by: userId, name: 'Kid Ada', is_child: true, birth_year: 2017 },
      { household_id: householdId, managed_by: userId, name: 'Kid Ben', is_child: true, birth_year: 2013 },
    ])
    // targets
    await rest('/nutrition_targets', 'POST', [
      { household_id: householdId, user_id: userId, member_profile_id: null, calories: 2200, protein_g: 160, fat_g: 75, carbs_g: 220 },
      { household_id: householdId, user_id: null, member_profile_id: profs[0].id, calories: 1600, protein_g: 80, fat_g: 60, carbs_g: 190 },
      { household_id: householdId, user_id: null, member_profile_id: profs[1].id, calories: 2000, protein_g: 110, fat_g: 70, carbs_g: 230 },
    ])
    // restrictions + won't-eats: Ada dislikes mushrooms; Ben allergic to peanuts
    await rest('/dietary_restrictions', 'POST', [
      { household_id: householdId, member_profile_id: profs[1].id, predefined: [], custom_entries: ['peanut allergy'] },
    ])
    await rest('/wont_eat_entries', 'POST', [
      { household_id: householdId, member_user_id: null, member_profile_id: profs[0].id, food_name: 'mushrooms', strength: 'dislikes', source: 'manual' },
      { household_id: householdId, member_user_id: null, member_profile_id: profs[1].id, food_name: 'peanuts', strength: 'allergy', source: 'manual' },
      { household_id: householdId, member_user_id: null, member_profile_id: profs[1].id, food_name: 'peanut butter', strength: 'allergy', source: 'manual' },
    ])
    // schedule: adult away Sat lunch; quick dinners Tue/Thu
    await rest('/member_schedule_slots', 'POST', [
      { household_id: householdId, member_user_id: userId, day_of_week: 6, slot_name: 'Lunch', status: 'away' },
      { household_id: householdId, member_user_id: userId, day_of_week: 2, slot_name: 'Dinner', status: 'quick' },
      { household_id: householdId, member_user_id: userId, day_of_week: 4, slot_name: 'Dinner', status: 'quick' },
    ]).catch(async () => {
      // table name fallback
      await rest('/member_schedules', 'POST', [
        { household_id: householdId, member_user_id: userId, day_of_week: 6, slot_name: 'Lunch', status: 'away' },
        { household_id: householdId, member_user_id: userId, day_of_week: 2, slot_name: 'Dinner', status: 'quick' },
        { household_id: householdId, member_user_id: userId, day_of_week: 4, slot_name: 'Dinner', status: 'quick' },
      ])
    })
  }
  console.log('household', householdId)
}

async function seed() {
  const token = await userToken()
  const { householdId } = await ctx()
  // cookbook via recipe-supply
  for (const [slot, count] of [['Breakfast', 7], ['Lunch', 7], ['Dinner', 8], ['Snacks', 5]] as const) {
    const prev = await fn('recipe-supply', { mode: 'preview', slot, count }, token)
    if (!prev.success) { note(`recipe-supply preview ${slot} failed: ${prev.error}`); continue }
    const com = await fn('recipe-supply', { mode: 'commit', recipes: prev.proposals }, token)
    console.log(slot, 'committed', com.created?.length)
  }
  const disc = await fn('recipe-supply', { mode: 'discover', count: 6, craving: 'family comfort food, kid friendly' }, token)
  if (disc.success) {
    const com = await fn('recipe-supply', { mode: 'commit', recipes: disc.proposals }, token)
    console.log('discover committed', com.created?.length)
  }
  // pantry staples with prices
  const staples: [string, number, number][] = [
    ['Olive oil', 750, 9.5], ['Rice', 2000, 6.0], ['Pasta', 1000, 2.8], ['Rolled oats', 1000, 3.5],
    ['Flour', 2000, 4.0], ['Sugar', 1000, 2.5], ['Eggs', 720, 5.5], ['Milk', 2000, 4.2],
    ['Butter', 454, 6.0], ['Garlic', 200, 1.5], ['Onion', 900, 2.4], ['Chicken broth', 900, 2.9],
    ['Soy sauce', 500, 3.8], ['Canned tomatoes', 800, 2.2], ['Cheddar cheese', 400, 6.5],
    ['Greek yogurt', 750, 5.8], ['Peanut butter', 500, 4.5], ['Honey', 500, 7.0],
  ]
  const ws0 = weekStartN(1)
  await rest('/inventory_items', 'POST', staples.map(([name, grams, price]) => ({
    household_id: householdId, added_by: undefined, food_name: name, quantity_remaining: grams,
    unit: 'g', storage_location: 'pantry', purchased_at: dayISO(ws0, -3), purchase_price: price,
  })).map(r => ({ ...r, added_by: undefined })), {}).catch(async () => {
    const { userId } = await ctx()
    await rest('/inventory_items', 'POST', staples.map(([name, grams, price]) => ({
      household_id: householdId, added_by: userId, food_name: name, quantity_remaining: grams,
      unit: 'g', storage_location: 'pantry', purchased_at: dayISO(ws0, -3), purchase_price: price,
    })))
  })
  // simulate the user pricing common ingredients in the builder: price the 12 most-used ingredient_ids
  const ings = await rest(`/recipe_ingredients?select=ingredient_id,ingredient_name,recipe_id,recipes!inner(household_id)&recipes.household_id=eq.${householdId}`)
  const byName = new Map<string, { ids: string[]; count: number }>()
  for (const i of ings) {
    const k = (i.ingredient_name ?? '').toLowerCase()
    const e = byName.get(k) ?? { ids: [], count: 0 }
    e.ids.push(i.ingredient_id); e.count++; byName.set(k, e)
  }
  const top = [...byName.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 12)
  const { userId: uid } = await ctx()
  const priceRows = top.flatMap(([name, e]) => e.ids.slice(0, 40).map(id => ({
    household_id: householdId, food_id: id, food_name: name, store: 'Sim Mart',
    cost_per_100g: 0.3 + (hashStr(name) % 20) / 10, created_by: uid,
  })))
  if (priceRows.length) await rest('/food_prices', 'POST', priceRows)
  console.log('seeded pantry + priced', top.length, 'ingredient names across', priceRows.length, 'ingredient ids')
}

async function week(n: number) {
  const token = await userToken()
  const { householdId, userId, profiles } = await ctx()
  const ws = weekStartN(n)
  console.log(`── WEEK ${n} (${ws}) ──`)
  // 1. plan row
  const planRows = await rest('/meal_plans?on_conflict=household_id,week_start', 'POST', { household_id: householdId, week_start: ws, created_by: userId }, { Prefer: 'resolution=merge-duplicates,return=representation' })
  const planId = planRows[0].id
  // 2. generate (skip if a previous attempt already filled this plan)
  const preFilled = await rest(`/meal_plan_slots?select=id&plan_id=eq.${planId}&meal_id=not.is.null`)
  const skipGen = preFilled.length >= 20
  if (skipGen) console.log('plan already generated — skipping generation')
  const mix = n <= 2 ? { favorites: 50, liked: 30, novel: 20 } : n === 3 ? { favorites: 70, liked: 20, novel: 10 } : { favorites: 60, liked: 25, novel: 15 }
  const gen = skipGen ? { success: true } : await fn('generate-plan', { householdId, planId, weekStart: ws, priorityOrder: ['Nutrition', 'Preferences', 'Budget', 'Variety', 'Inventory'], recipeMix: mix }, token)
  if (!gen.success && !gen.jobId) note(`W${n} generate-plan rejected: ${JSON.stringify(gen).slice(0, 150)}`)
  // poll job
  for (let i = 0; i < (skipGen ? 0 : 60); i++) {
    await new Promise(r => setTimeout(r, 3000))
    const job = await rest(`/plan_generations?select=status&plan_id=eq.${planId}&order=created_at.desc&limit=1`)
    if (job[0]?.status === 'done') break
    if (job[0]?.status === 'error' || job[0]?.status === 'timeout') { note(`W${n} generation ${job[0].status}`); break }
    if (i === 59) note(`W${n} generation still running after 180s`)
  }
  // 3. grocery — replicate the hook exactly, using the real utils
  const slotsData = await rest(`/meal_plan_slots?select=meal_id,slot_name,day_index,meals(id,meal_items(id,item_type,item_id,item_name,quantity_grams))&plan_id=eq.${planId}`)
  const filled = slotsData.filter((s: { meals: unknown }) => s.meals)
  console.log('slots filled:', filled.length, 'of', slotsData.length)
  const recipeIds = new Set<string>()
  for (const s of filled) for (const mi of s.meals.meal_items) if (mi.item_type === 'recipe') recipeIds.add(mi.item_id)
  const allIng = recipeIds.size ? await rest(`/recipe_ingredients?select=id,recipe_id,ingredient_type,ingredient_id,ingredient_name,quantity_grams,calories_per_100g,protein_per_100g,fat_per_100g,carbs_per_100g&recipe_id=in.(${[...recipeIds].join(',')})`) : []
  const ingByRecipe = new Map<string, RecipeIngredientNode[]>()
  for (const i of allIng) { const e = ingByRecipe.get(i.recipe_id) ?? []; e.push(i); ingByRecipe.set(i.recipe_id, e) }
  const resolved: ResolvedSlot[] = slotsData.map((s: { meal_id: string | null; meals: { meal_items: { id: string; item_type: 'food' | 'recipe'; item_id: string; item_name: string; quantity_grams: number }[] } | null }) => ({
    meal_id: s.meal_id,
    meal_items: (s.meals?.meal_items ?? []).map(mi => ({ ...mi, recipe_ingredients: mi.item_type === 'recipe' ? ingByRecipe.get(mi.item_id) ?? [] : undefined })),
  }))
  const inv: InventoryItem[] = await rest(`/inventory_items?select=*&household_id=eq.${householdId}&removed_at=is.null`)
  const prices = await rest(`/food_prices?select=*&household_id=eq.${householdId}`)
  const aggregated = aggregateIngredients(resolved, new Set())
  const { needToBuy, alreadyHave } = subtractInventory(aggregated, inv)
  const catNeed = assignCategories(needToBuy, [])
  const restock = assignCategories(addRestockStaples(new Set(needToBuy.map(i => i.food_id).filter(Boolean) as string[]), inv), [])
  const lists = await rest('/grocery_lists?on_conflict=household_id,week_start', 'POST', { household_id: householdId, week_start: ws, generated_by: userId, generated_at: dayISO(ws, 0) + 'T10:00:00Z' }, { Prefer: 'resolution=merge-duplicates,return=representation' })
  const listId = lists[0].id
  await rest(`/grocery_items?list_id=eq.${listId}&is_manual=eq.false`, 'DELETE')
  const inserts = [...catNeed, ...restock].map(item => {
    const { display_quantity, display_unit } = formatDisplayQuantity(item.quantity_grams)
    return {
      list_id: listId, household_id: householdId, food_name: item.food_name, food_id: item.food_id,
      quantity: display_quantity, unit: display_unit, category: item.category, category_source: item.category_source,
      is_checked: false, is_manual: false, is_staple_restock: item.is_staple_restock ?? false,
      estimated_cost: computeItemCost(item.quantity_grams, item.food_id, prices), notes: null,
    }
  }).concat(assignCategories(alreadyHave, []).map(item => {
    const { display_quantity, display_unit } = formatDisplayQuantity(item.quantity_grams)
    return {
      list_id: listId, household_id: householdId, food_name: item.food_name, food_id: item.food_id,
      quantity: display_quantity, unit: display_unit, category: item.category, category_source: item.category_source,
      is_checked: false, is_manual: false, is_staple_restock: false, estimated_cost: null, notes: 'inventory-covered',
    }
  }))
  if (inserts.length) await rest('/grocery_items', 'POST', inserts)
  const pricedCount = inserts.filter(i => i.estimated_cost != null && i.notes === null).length
  console.log(`grocery: ${catNeed.length} to buy (+${restock.length} restock), ${alreadyHave.length} already-have, ${pricedCount} priced`)
  if (catNeed.length > 0 && pricedCount / Math.max(1, catNeed.length) < 0.5) note(`W${n}: only ${pricedCount}/${catNeed.length} grocery items have cost estimates — budget visibility weak for AI-generated recipes`)
  // 4. shopping: check everything off, add to pantry (mirrors the new button)
  await rest(`/grocery_items?list_id=eq.${listId}&notes=is.null`, 'PATCH', { is_checked: true, checked_at: dayISO(ws, 1) + 'T17:00:00Z', checked_by: userId })
  const bought = [...catNeed, ...restock]
  if (bought.length) await rest('/inventory_items', 'POST', bought.map(item => ({
    household_id: householdId, added_by: userId, food_name: item.food_name,
    quantity_remaining: item.quantity_grams, unit: 'g', storage_location: 'pantry',
    purchased_at: dayISO(ws, 1), purchase_price: computeItemCost(item.quantity_grams, item.food_id, prices),
  })))
  // grocery spend log
  const grocerySpend = inserts.reduce((s, i) => s + (i.estimated_cost ?? 0), 0)
  if (grocerySpend > 0) await rest('/spend_logs', 'POST', { household_id: householdId, logged_by: userId, log_date: dayISO(ws, 1), week_start: ws, source: 'grocery', amount: Math.round(grocerySpend * 100) / 100, is_partial: false }).catch(() => {
    note(`W${n}: spend_logs rejected source='grocery' — only 'cook' spend is trackable`)
  })
  // 5. cook + rate + log, day by day
  const recipesMeta = new Map<string, { name: string; servings: number }>()
  for (const rid of recipeIds) {
    const r = await rest(`/recipes?select=name,servings&id=eq.${rid}`)
    recipesMeta.set(rid, r[0])
  }
  const members = [
    { key: 'user', id: userId, col: 'member_user_id', servings: 1.0, name: 'Adult' },
    { key: 'p0', id: profiles[0].id, col: 'member_profile_id', servings: 0.75, name: profiles[0].name },
    { key: 'p1', id: profiles[1].id, col: 'member_profile_id', servings: 0.9, name: profiles[1].name },
  ]
  let cooked = 0, missTotal = 0, needTotal = 0
  const foodLogRows: Record<string, unknown>[] = []
  const cookDays = [0, 1, 2, 3, 4, 6] // Sun-Thu + Sat
  for (const day of cookDays) {
    for (const slotName of day === 6 ? ['Lunch', 'Dinner'] : ['Dinner']) {
      const slot = filled.find((s: { day_index: number; slot_name: string }) => s.day_index === day && s.slot_name === slotName)
      if (!slot) continue
      const recipeItem = slot.meals.meal_items.find((mi: { item_type: string }) => mi.item_type === 'recipe')
      if (!recipeItem) continue
      const meta = recipesMeta.get(recipeItem.item_id)
      const ings = ingByRecipe.get(recipeItem.item_id) ?? []
      // FIFO deduct exactly like the app
      const invNow: InventoryItem[] = await rest(`/inventory_items?select=*&household_id=eq.${householdId}&removed_at=is.null`)
      const needs: FifoNeed[] = ings.map(i => ({ food_id: null, food_name: i.ingredient_name ?? '', quantity_grams: i.quantity_grams }))
      const { deductions, missing } = computeFifoDeductions(invNow, needs)
      missTotal += missing.length; needTotal += needs.length
      for (const d of deductions) {
        const newQty = Math.max(0, d.item.quantity_remaining - d.deductAmount)
        await rest(`/inventory_items?id=eq.${d.item.id}`, 'PATCH', newQty <= 0 ? { quantity_remaining: 0, removed_at: dayISO(ws, day) + 'T18:30:00Z', removed_reason: 'used' } : { quantity_remaining: newQty })
      }
      // spend exactly like the app: computeRecipeCostPerServing over priced ingredients
      const ingsForCost = ings.map(i => ({ quantity_grams: i.quantity_grams, cost_per_100g: getPriceForIngredient(prices, i.ingredient_id) }))
      const { costPerServing } = computeRecipeCostPerServing(ingsForCost, meta?.servings ?? 4)
      const totalCost = costPerServing * (meta?.servings ?? 4)
      if (totalCost > 0) await rest('/spend_logs', 'POST', { household_id: householdId, logged_by: userId, log_date: dayISO(ws, day), week_start: ws, source: 'cook', recipe_id: recipeItem.item_id, amount: Math.round(totalCost * 100) / 100, is_partial: false })
      cooked++
      // ratings (~70% of members rate)
      for (const m of members) {
        if (rnd() < 0.7) {
          await rest('/recipe_ratings', 'POST', {
            household_id: householdId, recipe_id: recipeItem.item_id, recipe_name: meta?.name ?? recipeItem.item_name,
            [m.col === 'member_user_id' ? 'rated_by_user_id' : 'rated_by_member_profile_id']: m.id,
            rating: tasteRating(meta?.name ?? '', m.key), rated_at: dayISO(ws, day),
          }).catch((e: Error) => { if (!e.message.includes('duplicate')) note(`rating insert failed: ${e.message.slice(0, 120)}`) })
        }
      }
      // leftovers 25%
      if (rnd() < 0.25) {
        await rest('/inventory_items', 'POST', {
          household_id: householdId, added_by: userId, food_name: `${meta?.name} (leftover)`,
          quantity_remaining: 450, unit: 'g', storage_location: 'fridge', purchased_at: dayISO(ws, day),
          expires_at: dayISO(ws, day + 3), is_leftover: true, leftover_from_recipe_id: recipeItem.item_id,
        })
      }
    }
  }
  // food logs: every member, every day, every filled B/L/D slot (88% adherence)
  for (let day = 0; day < 7; day++) {
    for (const slotName of ['Breakfast', 'Lunch', 'Dinner']) {
      const slot = filled.find((s: { day_index: number; slot_name: string }) => s.day_index === day && s.slot_name === slotName)
      if (!slot) continue
      const recipeItem = slot.meals.meal_items.find((mi: { item_type: string }) => mi.item_type === 'recipe')
      if (!recipeItem) continue
      const meta = recipesMeta.get(recipeItem.item_id)
      const macros = calcPerServingMacros(ingByRecipe.get(recipeItem.item_id) ?? [], meta?.servings ?? 4)
      for (const m of members) {
        if (rnd() > 0.88) continue
        foodLogRows.push({
          household_id: householdId, logged_by: userId,
          member_user_id: m.col === 'member_user_id' ? m.id : null,
          member_profile_id: m.col === 'member_profile_id' ? m.id : null,
          log_date: dayISO(ws, day),
          slot_name: slotName, meal_id: slot.meal_id, item_type: 'recipe', item_id: recipeItem.item_id,
          item_name: meta?.name ?? recipeItem.item_name, servings_logged: m.servings,
          calories_per_serving: Math.round(macros.calories), protein_per_serving: Math.round(macros.protein),
          fat_per_serving: Math.round(macros.fat), carbs_per_serving: Math.round(macros.carbs),
          micronutrients: {}, is_private: false,
        })
      }
    }
  }
  if (foodLogRows.length) await rest('/food_logs', 'POST', foodLogRows)
  console.log(`cooked ${cooked} meals; deduction missing ${missTotal}/${needTotal} ingredient needs; logged ${foodLogRows.length} food entries`)
  if (needTotal > 0 && missTotal / needTotal > 0.4) note(`W${n}: ${Math.round((missTotal / needTotal) * 100)}% of cooked ingredients NOT found in inventory by FIFO matching (name mismatch between recipe ingredients and purchased grocery items)`)
}

async function audit() {
  const { householdId, userId, profiles } = await ctx()
  const out: string[] = []
  const weeks = [1, 2, 3, 4].map(weekStartN)
  // slot appropriateness + monotony
  const plans = await rest(`/meal_plans?select=id,week_start&household_id=eq.${householdId}&order=week_start`)
  const recipes = await rest(`/recipes?select=id,name,meal_types&household_id=eq.${householdId}&deleted_at=is.null`)
  const rById = new Map(recipes.map((r: { id: string }) => [r.id, r]))
  for (const p of plans) {
    const slots = await rest(`/meal_plan_slots?select=slot_name,day_index,generation_rationale,meals(meal_items(item_type,item_id))&plan_id=eq.${p.id}`)
    let violations = 0
    const usage = new Map<string, number>()
    const tiers = { Favorite: 0, Liked: 0, Novel: 0, none: 0 }
    for (const s of slots) {
      const rid = s.meals?.meal_items?.find((mi: { item_type: string }) => mi.item_type === 'recipe')?.item_id
      if (!rid) continue
      const r = rById.get(rid) as { name: string; meal_types: string[] } | undefined
      if (r) {
        const slotN = s.slot_name === 'Snack' ? 'Snacks' : s.slot_name
        if (r.meal_types?.length && !r.meal_types.includes(slotN)) violations++
        usage.set(r.name, (usage.get(r.name) ?? 0) + 1)
      }
      const rat = (s.generation_rationale ?? '') as string
      if (rat.startsWith('Favorite')) tiers.Favorite++
      else if (rat.startsWith('Liked')) tiers.Liked++
      else if (rat.startsWith('Novel')) tiers.Novel++
      else tiers.none++
    }
    const repeats = [...usage.entries()].filter(([, c]) => c > 2)
    out.push(`plan ${p.week_start}: slot-violations=${violations}, >2x repeats=${repeats.map(([n, c]) => `${n}×${c}`).join(', ') || 'none'}, tiers=${JSON.stringify(tiers)}`)
  }
  // budget
  for (const ws of weeks) {
    const spend = await rest(`/spend_logs?select=amount,source&household_id=eq.${householdId}&week_start=eq.${ws}`)
    const total = spend.reduce((s: number, l: { amount: number }) => s + l.amount, 0)
    out.push(`week ${ws}: spend $${total.toFixed(2)} of $220 across ${spend.length} logs`)
  }
  // inventory health
  const inv = await rest(`/inventory_items?select=food_name,quantity_remaining,expires_at,is_leftover,removed_at&household_id=eq.${householdId}`)
  const active = inv.filter((i: { removed_at: string | null }) => !i.removed_at)
  const negative = active.filter((i: { quantity_remaining: number }) => i.quantity_remaining < 0)
  const expiredActive = active.filter((i: { expires_at: string | null }) => i.expires_at && i.expires_at < new Date().toISOString().slice(0, 10))
  const leftovers = inv.filter((i: { is_leftover: boolean }) => i.is_leftover)
  out.push(`inventory: ${active.length} active items, ${negative.length} negative-qty, ${expiredActive.length} expired-but-active, ${leftovers.length} leftovers created (${leftovers.filter((l: { removed_at: string | null }) => !l.removed_at).length} never consumed)`)
  // nutrition per member (last full week)
  const ws3 = weekStartN(3)
  const targets = await rest(`/nutrition_targets?select=user_id,member_profile_id,calories&household_id=eq.${householdId}`)
  for (const m of [{ label: 'Adult', col: 'member_user_id', id: userId }, { label: profiles[0].name, col: 'member_profile_id', id: profiles[0].id }, { label: profiles[1].name, col: 'member_profile_id', id: profiles[1].id }]) {
    const logs = await rest(`/food_logs?select=calories_per_serving,servings_logged,log_date&household_id=eq.${householdId}&${m.col}=eq.${m.id}&log_date=gte.${ws3}&log_date=lt.${weekStartN(4)}`)
    const days = new Set(logs.map((l: { log_date: string }) => l.log_date)).size || 1
    const kcal = logs.reduce((s: number, l: { calories_per_serving: number; servings_logged: number }) => s + l.calories_per_serving * l.servings_logged, 0)
    const target = targets.find((t: Record<string, unknown>) => (m.col === 'member_user_id' ? t.user_id === m.id : t.member_profile_id === m.id))
    out.push(`nutrition W3 ${m.label}: avg ${Math.round(kcal / days)} kcal/day logged vs target ${target?.calories} (${days} days logged)`)
  }
  // grocery already-have correctness sample (week 4)
  const gl = await rest(`/grocery_lists?select=id&household_id=eq.${householdId}&week_start=eq.${weekStartN(4)}`)
  if (gl[0]) {
    const gitems = await rest(`/grocery_items?select=food_name,notes&list_id=eq.${gl[0].id}`)
    out.push(`grocery W4: ${gitems.filter((g: { notes: string | null }) => g.notes === 'inventory-covered').length} marked already-have of ${gitems.length}`)
  }
  console.log('\n===== AUDIT =====')
  for (const l of out) console.log(l)
  console.log('\n===== FINDINGS (this phase run) =====')
  for (const f of findings) console.log('-', f)
}

const phase = process.argv[2]
const arg = process.argv[3]
const run = async () => {
  if (phase === 'setup') await setup()
  else if (phase === 'seed') await seed()
  else if (phase === 'week') await week(Number(arg))
  else if (phase === 'audit') await audit()
  else console.log('usage: vite-node sim-month.ts <setup|seed|week N|audit>')
}
run().then(() => console.log('phase done')).catch(e => { console.error('PHASE FAILED:', e.message); process.exit(1) })
