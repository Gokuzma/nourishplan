export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Household {
  id: string
  name: string
  week_start_day: number
  weekly_budget: number | null
  created_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface HouseholdInvite {
  id: string
  household_id: string
  token: string
  created_by: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface MemberProfile {
  id: string
  household_id: string
  managed_by: string
  name: string
  is_child: boolean
  birth_year: number | null
  created_at: string
}

export interface CustomFood {
  id: string
  household_id: string
  created_by: string
  name: string
  serving_description: string | null
  serving_grams: number
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  fiber_per_100g: number | null
  sugar_per_100g: number | null
  sodium_per_100g: number | null
  micronutrients: Record<string, number>
  portions: { description: string; grams: number }[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  household_id: string
  created_by: string
  name: string
  servings: number
  notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_type: 'food' | 'recipe'
  ingredient_id: string
  quantity_grams: number
  weight_state: 'raw' | 'cooked'
  sort_order: number
  ingredient_name?: string | null
  calories_per_100g?: number | null
  protein_per_100g?: number | null
  fat_per_100g?: number | null
  carbs_per_100g?: number | null
  micronutrients?: Record<string, number> | null
  created_at: string
}

export interface Meal {
  id: string
  household_id: string
  created_by: string
  name: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface MealItem {
  id: string
  meal_id: string
  item_type: 'food' | 'recipe'
  item_id: string
  quantity_grams: number
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  sort_order: number
  created_at: string
}

export interface MealPlan {
  id: string
  household_id: string
  week_start: string
  created_by: string
  created_at: string
}

export interface MealPlanSlot {
  id: string
  plan_id: string
  day_index: number
  slot_name: string
  slot_order: number
  meal_id: string | null
  is_override: boolean
  created_at: string
}

export interface MealPlanTemplate {
  id: string
  household_id: string
  name: string
  created_by: string
  created_at: string
}

export interface MealPlanTemplateSlot {
  id: string
  template_id: string
  day_index: number
  slot_name: string
  slot_order: number
  meal_id: string | null
}

export interface NutritionTarget {
  id: string
  household_id: string
  user_id: string | null
  member_profile_id: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  micronutrients: Record<string, number>
  custom_goals: Record<string, number>
  macro_mode: 'grams' | 'percent'
  created_at: string
  updated_at: string
}

export interface FoodLog {
  id: string
  household_id: string
  logged_by: string
  member_user_id: string | null
  member_profile_id: string | null
  log_date: string
  slot_name: string | null
  meal_id: string | null
  item_type: string | null
  item_id: string | null
  item_name: string
  servings_logged: number
  calories_per_serving: number
  protein_per_serving: number
  fat_per_serving: number
  carbs_per_serving: number
  micronutrients: Record<string, number>
  serving_unit: string | null
  is_private: boolean
  cost: number | null
  created_at: string
  updated_at: string
}

export interface FoodPrice {
  id: string
  household_id: string
  food_id: string
  food_name: string
  store: string
  cost_per_100g: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface SpendLog {
  id: string
  household_id: string
  logged_by: string
  log_date: string
  week_start: string
  source: 'cook' | 'food_log'
  recipe_id: string | null
  amount: number
  is_partial: boolean
  created_at: string
}

export interface MacroSummary {
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface NormalizedFoodResult {
  id: string
  name: string
  source: 'usda' | 'cnf' | 'custom'
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber?: number
  sugar?: number
  sodium?: number
  micronutrients?: Record<string, number>
  portions?: { description: string; grams: number }[]
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id'>>
      }
      households: {
        Row: Household
        Insert: Omit<Household, 'id' | 'created_at' | 'week_start_day' | 'weekly_budget'> & { id?: string; created_at?: string; week_start_day?: number; weekly_budget?: number | null }
        Update: Partial<Omit<Household, 'id'>>
      }
      household_members: {
        Row: HouseholdMember
        Insert: Omit<HouseholdMember, 'id' | 'joined_at'> & { id?: string; joined_at?: string }
        Update: Partial<Omit<HouseholdMember, 'id'>>
      }
      household_invites: {
        Row: HouseholdInvite
        Insert: Omit<HouseholdInvite, 'id' | 'token' | 'created_at' | 'used_at'> & {
          id?: string
          token?: string
          created_at?: string
          used_at?: string | null
        }
        Update: Partial<Omit<HouseholdInvite, 'id'>>
      }
      member_profiles: {
        Row: MemberProfile
        Insert: Omit<MemberProfile, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<MemberProfile, 'id'>>
      }
      custom_foods: {
        Row: CustomFood
        Insert: Omit<CustomFood, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<CustomFood, 'id' | 'created_at'>>
      }
      recipes: {
        Row: Recipe
        Insert: Omit<Recipe, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Recipe, 'id' | 'created_at'>>
      }
      recipe_ingredients: {
        Row: RecipeIngredient
        Insert: Omit<RecipeIngredient, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<RecipeIngredient, 'id' | 'created_at'>>
      }
      meals: {
        Row: Meal
        Insert: Omit<Meal, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Meal, 'id' | 'created_at'>>
      }
      meal_items: {
        Row: MealItem
        Insert: Omit<MealItem, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<MealItem, 'id' | 'created_at'>>
      }
      meal_plans: {
        Row: MealPlan
        Insert: Omit<MealPlan, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<MealPlan, 'id' | 'created_at'>>
      }
      meal_plan_slots: {
        Row: MealPlanSlot
        Insert: Omit<MealPlanSlot, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<MealPlanSlot, 'id' | 'created_at'>>
      }
      meal_plan_templates: {
        Row: MealPlanTemplate
        Insert: Omit<MealPlanTemplate, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<MealPlanTemplate, 'id' | 'created_at'>>
      }
      meal_plan_template_slots: {
        Row: MealPlanTemplateSlot
        Insert: Omit<MealPlanTemplateSlot, 'id'> & { id?: string }
        Update: Partial<Omit<MealPlanTemplateSlot, 'id'>>
      }
      nutrition_targets: {
        Row: NutritionTarget
        Insert: Omit<NutritionTarget, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<NutritionTarget, 'id' | 'created_at'>>
      }
      food_logs: {
        Row: FoodLog
        Insert: Omit<FoodLog, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<FoodLog, 'id' | 'created_at'>>
      }
      food_prices: {
        Row: FoodPrice
        Insert: Omit<FoodPrice, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<FoodPrice, 'id' | 'created_at'>>
        Relationships: []
      }
      spend_logs: {
        Row: SpendLog
        Insert: Omit<SpendLog, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<SpendLog, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Enums: {
      household_role: 'admin' | 'member'
    }
  }
}
