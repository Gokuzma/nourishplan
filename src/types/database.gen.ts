export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_recipe_tags: {
        Row: {
          confidence: number | null
          generated_at: string
          household_id: string
          id: string
          recipe_id: string
          tag: string
        }
        Insert: {
          confidence?: number | null
          generated_at?: string
          household_id: string
          id?: string
          recipe_id: string
          tag: string
        }
        Update: {
          confidence?: number | null
          generated_at?: string
          household_id?: string
          id?: string
          recipe_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recipe_tags_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recipe_tags_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      cook_sessions: {
        Row: {
          batch_prep_session_key: string | null
          completed_at: string | null
          household_id: string
          id: string
          meal_id: string | null
          mode: string | null
          recipe_id: string | null
          recipe_ids: string[]
          started_at: string
          started_by: string
          status: string
          step_state: Json
          updated_at: string
        }
        Insert: {
          batch_prep_session_key?: string | null
          completed_at?: string | null
          household_id: string
          id?: string
          meal_id?: string | null
          mode?: string | null
          recipe_id?: string | null
          recipe_ids?: string[]
          started_at?: string
          started_by: string
          status?: string
          step_state?: Json
          updated_at?: string
        }
        Update: {
          batch_prep_session_key?: string | null
          completed_at?: string | null
          household_id?: string
          id?: string
          meal_id?: string | null
          mode?: string | null
          recipe_id?: string | null
          recipe_ids?: string[]
          started_at?: string
          started_by?: string
          status?: string
          step_state?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cook_sessions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_sessions_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_sessions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_foods: {
        Row: {
          calories_per_100g: number
          carbs_per_100g: number
          created_at: string
          created_by: string
          deleted_at: string | null
          fat_per_100g: number
          fiber_per_100g: number | null
          household_id: string
          id: string
          micronutrients: Json
          name: string
          portions: Json
          protein_per_100g: number
          serving_description: string | null
          serving_grams: number
          sodium_per_100g: number | null
          sugar_per_100g: number | null
          updated_at: string
        }
        Insert: {
          calories_per_100g: number
          carbs_per_100g: number
          created_at?: string
          created_by: string
          deleted_at?: string | null
          fat_per_100g: number
          fiber_per_100g?: number | null
          household_id: string
          id?: string
          micronutrients?: Json
          name: string
          portions?: Json
          protein_per_100g: number
          serving_description?: string | null
          serving_grams: number
          sodium_per_100g?: number | null
          sugar_per_100g?: number | null
          updated_at?: string
        }
        Update: {
          calories_per_100g?: number
          carbs_per_100g?: number
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          fat_per_100g?: number
          fiber_per_100g?: number | null
          household_id?: string
          id?: string
          micronutrients?: Json
          name?: string
          portions?: Json
          protein_per_100g?: number
          serving_description?: string | null
          serving_grams?: number
          sodium_per_100g?: number | null
          sugar_per_100g?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_foods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      dietary_restrictions: {
        Row: {
          custom_entries: string[]
          household_id: string
          id: string
          member_profile_id: string | null
          member_user_id: string | null
          predefined: string[]
          updated_at: string
        }
        Insert: {
          custom_entries?: string[]
          household_id: string
          id?: string
          member_profile_id?: string | null
          member_user_id?: string | null
          predefined?: string[]
          updated_at?: string
        }
        Update: {
          custom_entries?: string[]
          household_id?: string
          id?: string
          member_profile_id?: string | null
          member_user_id?: string | null
          predefined?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dietary_restrictions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dietary_restrictions_member_profile_id_fkey"
            columns: ["member_profile_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_logs: {
        Row: {
          calories_per_serving: number
          carbs_per_serving: number
          cost: number | null
          created_at: string
          fat_per_serving: number
          household_id: string
          id: string
          is_private: boolean
          item_id: string | null
          item_name: string
          item_type: string | null
          log_date: string
          logged_by: string
          meal_id: string | null
          member_profile_id: string | null
          member_user_id: string | null
          micronutrients: Json
          protein_per_serving: number
          serving_unit: string | null
          servings_logged: number
          slot_name: string | null
          updated_at: string
        }
        Insert: {
          calories_per_serving: number
          carbs_per_serving: number
          cost?: number | null
          created_at?: string
          fat_per_serving: number
          household_id: string
          id?: string
          is_private?: boolean
          item_id?: string | null
          item_name: string
          item_type?: string | null
          log_date: string
          logged_by: string
          meal_id?: string | null
          member_profile_id?: string | null
          member_user_id?: string | null
          micronutrients?: Json
          protein_per_serving: number
          serving_unit?: string | null
          servings_logged: number
          slot_name?: string | null
          updated_at?: string
        }
        Update: {
          calories_per_serving?: number
          carbs_per_serving?: number
          cost?: number | null
          created_at?: string
          fat_per_serving?: number
          household_id?: string
          id?: string
          is_private?: boolean
          item_id?: string | null
          item_name?: string
          item_type?: string | null
          log_date?: string
          logged_by?: string
          meal_id?: string | null
          member_profile_id?: string | null
          member_user_id?: string | null
          micronutrients?: Json
          protein_per_serving?: number
          serving_unit?: string | null
          servings_logged?: number
          slot_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_logs_member_profile_id_fkey"
            columns: ["member_profile_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_prices: {
        Row: {
          cost_per_100g: number
          created_at: string
          created_by: string
          food_id: string
          food_name: string
          household_id: string
          id: string
          store: string
          updated_at: string
        }
        Insert: {
          cost_per_100g: number
          created_at?: string
          created_by: string
          food_id: string
          food_name: string
          household_id: string
          id?: string
          store?: string
          updated_at?: string
        }
        Update: {
          cost_per_100g?: number
          created_at?: string
          created_by?: string
          food_id?: string
          food_name?: string
          household_id?: string
          id?: string
          store?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_prices_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_items: {
        Row: {
          category: string
          category_source: string
          checked_at: string | null
          checked_by: string | null
          created_at: string
          estimated_cost: number | null
          food_id: string | null
          food_name: string
          household_id: string
          id: string
          is_checked: boolean
          is_manual: boolean
          is_staple_restock: boolean
          list_id: string
          notes: string | null
          quantity: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          category_source?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          food_id?: string | null
          food_name: string
          household_id: string
          id?: string
          is_checked?: boolean
          is_manual?: boolean
          is_staple_restock?: boolean
          list_id: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          category_source?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          food_id?: string | null
          food_name?: string
          household_id?: string
          id?: string
          is_checked?: boolean
          is_manual?: boolean
          is_staple_restock?: boolean
          list_id?: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_lists: {
        Row: {
          generated_at: string
          generated_by: string
          household_id: string
          id: string
          week_start: string
        }
        Insert: {
          generated_at?: string
          generated_by: string
          household_id: string
          id?: string
          week_start: string
        }
        Update: {
          generated_at?: string
          generated_by?: string
          household_id?: string
          id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          role: Database["public"]["Enums"]["household_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_profiles_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          week_start_day: number
          weekly_budget: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          week_start_day?: number
          weekly_budget?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          week_start_day?: number
          weekly_budget?: number | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          added_by: string
          brand: string | null
          created_at: string
          expires_at: string | null
          food_id: string | null
          food_name: string
          household_id: string
          id: string
          is_leftover: boolean
          is_opened: boolean
          is_staple: boolean
          leftover_from_recipe_id: string | null
          purchase_price: number | null
          purchased_at: string
          quantity_remaining: number
          removed_at: string | null
          removed_reason: string | null
          storage_location: string
          unit: string
          updated_at: string
        }
        Insert: {
          added_by: string
          brand?: string | null
          created_at?: string
          expires_at?: string | null
          food_id?: string | null
          food_name: string
          household_id: string
          id?: string
          is_leftover?: boolean
          is_opened?: boolean
          is_staple?: boolean
          leftover_from_recipe_id?: string | null
          purchase_price?: number | null
          purchased_at?: string
          quantity_remaining: number
          removed_at?: string | null
          removed_reason?: string | null
          storage_location: string
          unit: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          brand?: string | null
          created_at?: string
          expires_at?: string | null
          food_id?: string | null
          food_name?: string
          household_id?: string
          id?: string
          is_leftover?: boolean
          is_opened?: boolean
          is_staple?: boolean
          leftover_from_recipe_id?: string | null
          purchase_price?: number | null
          purchased_at?: string
          quantity_remaining?: number
          removed_at?: string | null
          removed_reason?: string | null
          storage_location?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_items: {
        Row: {
          calories_per_100g: number
          carbs_per_100g: number
          created_at: string
          fat_per_100g: number
          id: string
          item_id: string
          item_name: string
          item_type: string
          meal_id: string
          protein_per_100g: number
          quantity_grams: number
          sort_order: number
        }
        Insert: {
          calories_per_100g: number
          carbs_per_100g: number
          created_at?: string
          fat_per_100g: number
          id?: string
          item_id: string
          item_name?: string
          item_type: string
          meal_id: string
          protein_per_100g: number
          quantity_grams: number
          sort_order?: number
        }
        Update: {
          calories_per_100g?: number
          carbs_per_100g?: number
          created_at?: string
          fat_per_100g?: number
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          meal_id?: string
          protein_per_100g?: number
          quantity_grams?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_slots: {
        Row: {
          created_at: string
          day_index: number
          generation_rationale: string | null
          id: string
          is_locked: boolean
          is_override: boolean
          meal_id: string | null
          plan_id: string
          slot_name: string
          slot_order: number
        }
        Insert: {
          created_at?: string
          day_index: number
          generation_rationale?: string | null
          id?: string
          is_locked?: boolean
          is_override?: boolean
          meal_id?: string | null
          plan_id: string
          slot_name: string
          slot_order?: number
        }
        Update: {
          created_at?: string
          day_index?: number
          generation_rationale?: string | null
          id?: string
          is_locked?: boolean
          is_override?: boolean
          meal_id?: string | null
          plan_id?: string
          slot_name?: string
          slot_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_slots_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_slots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_template_slots: {
        Row: {
          day_index: number
          id: string
          meal_id: string | null
          slot_name: string
          slot_order: number
          template_id: string
        }
        Insert: {
          day_index: number
          id?: string
          meal_id?: string | null
          slot_name: string
          slot_order?: number
          template_id: string
        }
        Update: {
          day_index?: number
          id?: string
          meal_id?: string | null
          slot_name?: string
          slot_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_template_slots_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_template_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_templates: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_templates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          household_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          household_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profiles: {
        Row: {
          birth_year: number | null
          created_at: string
          household_id: string
          id: string
          is_child: boolean
          managed_by: string
          name: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          household_id: string
          id?: string
          is_child?: boolean
          managed_by: string
          name: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          household_id?: string
          id?: string
          is_child?: boolean
          managed_by?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      member_schedule_exceptions: {
        Row: {
          created_at: string
          day_of_week: number
          household_id: string
          id: string
          member_profile_id: string | null
          member_user_id: string | null
          slot_name: string
          status: string
          week_start: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          household_id: string
          id?: string
          member_profile_id?: string | null
          member_user_id?: string | null
          slot_name: string
          status: string
          week_start: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          household_id?: string
          id?: string
          member_profile_id?: string | null
          member_user_id?: string | null
          slot_name?: string
          status?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_schedule_exceptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_schedule_exceptions_member_profile_id_fkey"
            columns: ["member_profile_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_schedule_slots: {
        Row: {
          day_of_week: number
          household_id: string
          id: string
          member_profile_id: string | null
          member_user_id: string | null
          slot_name: string
          status: string
          updated_at: string
        }
        Insert: {
          day_of_week: number
          household_id: string
          id?: string
          member_profile_id?: string | null
          member_user_id?: string | null
          slot_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          day_of_week?: number
          household_id?: string
          id?: string
          member_profile_id?: string | null
          member_user_id?: string | null
          slot_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_schedule_slots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_schedule_slots_member_profile_id_fkey"
            columns: ["member_profile_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_targets: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          custom_goals: Json
          fat_g: number | null
          household_id: string
          id: string
          macro_mode: string
          member_profile_id: string | null
          micronutrients: Json
          protein_g: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          custom_goals?: Json
          fat_g?: number | null
          household_id: string
          id?: string
          macro_mode?: string
          member_profile_id?: string | null
          micronutrients?: Json
          protein_g?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          custom_goals?: Json
          fat_g?: number | null
          household_id?: string
          id?: string
          macro_mode?: string
          member_profile_id?: string | null
          micronutrients?: Json
          protein_g?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_targets_member_profile_id_fkey"
            columns: ["member_profile_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_generations: {
        Row: {
          completed_at: string | null
          constraint_snapshot: Json
          created_at: string
          error_message: string | null
          household_id: string
          id: string
          kind: string
          pass_count: number
          plan_id: string
          priority_order: string[]
          status: string
          triggered_by: string
        }
        Insert: {
          completed_at?: string | null
          constraint_snapshot?: Json
          created_at?: string
          error_message?: string | null
          household_id: string
          id?: string
          kind?: string
          pass_count?: number
          plan_id: string
          priority_order?: string[]
          status?: string
          triggered_by: string
        }
        Update: {
          completed_at?: string | null
          constraint_snapshot?: Json
          created_at?: string
          error_message?: string | null
          household_id?: string
          id?: string
          kind?: string
          pass_count?: number
          plan_id?: string
          priority_order?: string[]
          status?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_generations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_generations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          calories_per_100g: number | null
          carbs_per_100g: number | null
          created_at: string
          fat_per_100g: number | null
          id: string
          ingredient_id: string
          ingredient_name: string | null
          ingredient_type: string
          micronutrients: Json | null
          protein_per_100g: number | null
          quantity_grams: number
          recipe_id: string
          sort_order: number
          weight_state: string
        }
        Insert: {
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          created_at?: string
          fat_per_100g?: number | null
          id?: string
          ingredient_id: string
          ingredient_name?: string | null
          ingredient_type: string
          micronutrients?: Json | null
          protein_per_100g?: number | null
          quantity_grams: number
          recipe_id: string
          sort_order?: number
          weight_state?: string
        }
        Update: {
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          created_at?: string
          fat_per_100g?: number | null
          id?: string
          ingredient_id?: string
          ingredient_name?: string | null
          ingredient_type?: string
          micronutrients?: Json | null
          protein_per_100g?: number | null
          quantity_grams?: number
          recipe_id?: string
          sort_order?: number
          weight_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ratings: {
        Row: {
          created_at: string
          household_id: string
          id: string
          rated_at: string
          rated_by_member_profile_id: string | null
          rated_by_user_id: string | null
          rating: number
          recipe_id: string
          recipe_name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          rated_at?: string
          rated_by_member_profile_id?: string | null
          rated_by_user_id?: string | null
          rating: number
          recipe_id: string
          recipe_name: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          rated_at?: string
          rated_by_member_profile_id?: string | null
          rated_by_user_id?: string | null
          rating?: number
          recipe_id?: string
          recipe_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ratings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ratings_rated_by_member_profile_id_fkey"
            columns: ["rated_by_member_profile_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ratings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          freezer_friendly: boolean | null
          freezer_shelf_life_weeks: number | null
          household_id: string
          id: string
          instructions: Json | null
          meal_types: string[]
          name: string
          notes: string | null
          servings: number
          source_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          freezer_friendly?: boolean | null
          freezer_shelf_life_weeks?: number | null
          household_id: string
          id?: string
          instructions?: Json | null
          meal_types?: string[]
          name: string
          notes?: string | null
          servings?: number
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          freezer_friendly?: boolean | null
          freezer_shelf_life_weeks?: number | null
          household_id?: string
          id?: string
          instructions?: Json | null
          meal_types?: string[]
          name?: string
          notes?: string | null
          servings?: number
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_logs: {
        Row: {
          amount: number
          created_at: string
          household_id: string
          id: string
          is_partial: boolean
          log_date: string
          logged_by: string
          recipe_id: string | null
          source: string
          week_start: string
        }
        Insert: {
          amount: number
          created_at?: string
          household_id: string
          id?: string
          is_partial?: boolean
          log_date: string
          logged_by: string
          recipe_id?: string | null
          source: string
          week_start: string
        }
        Update: {
          amount?: number
          created_at?: string
          household_id?: string
          id?: string
          is_partial?: boolean
          log_date?: string
          logged_by?: string
          recipe_id?: string | null
          source?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "spend_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      wont_eat_entries: {
        Row: {
          created_at: string
          food_name: string
          household_id: string
          id: string
          member_profile_id: string | null
          member_user_id: string | null
          source: string
          strength: string
        }
        Insert: {
          created_at?: string
          food_name: string
          household_id: string
          id?: string
          member_profile_id?: string | null
          member_user_id?: string | null
          source?: string
          strength?: string
        }
        Update: {
          created_at?: string
          food_name?: string
          household_id?: string
          id?: string
          member_profile_id?: string | null
          member_user_id?: string | null
          source?: string
          strength?: string
        }
        Relationships: [
          {
            foreignKeyName: "wont_eat_entries_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wont_eat_entries_member_profile_id_fkey"
            columns: ["member_profile_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_member_role: {
        Args: {
          member_row_id: string
          new_role: Database["public"]["Enums"]["household_role"]
        }
        Returns: undefined
      }
      get_user_household_id: { Args: never; Returns: string }
      get_user_household_role: { Args: never; Returns: string }
      has_valid_invite: { Args: { p_household_id: string }; Returns: boolean }
      leave_household: { Args: never; Returns: undefined }
      mark_invite_used: { Args: { invite_id: string }; Returns: undefined }
      remove_household_member: {
        Args: { member_row_id: string }
        Returns: undefined
      }
    }
    Enums: {
      household_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      household_role: ["admin", "member"],
    },
  },
} as const
