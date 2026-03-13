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
    }
    Enums: {
      household_role: 'admin' | 'member'
    }
  }
}
