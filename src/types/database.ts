export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Household {
  id: string
  name: string
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
  source: 'usda' | 'off' | 'custom'
  calories: number
  protein: number
  fat: number
  carbs: number
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
        Insert: Omit<Household, 'id' | 'created_at'> & { id?: string; created_at?: string }
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
    }
    Enums: {
      household_role: 'admin' | 'member'
    }
  }
}
