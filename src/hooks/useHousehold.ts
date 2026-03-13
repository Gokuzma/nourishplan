import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Household, HouseholdMember, HouseholdInvite, MemberProfile, Profile } from '../types/database'

export interface HouseholdWithName extends Pick<HouseholdMember, 'id' | 'role'> {
  household_id: string
  households: Household | null
}

export interface MemberWithProfile extends HouseholdMember {
  profiles: Profile | null
}

/**
 * Returns the current user's household membership row, joined with the
 * household name. Returns null data if the user has no household.
 */
export function useHousehold() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['household'],
    queryFn: async (): Promise<HouseholdWithName | null> => {
      if (!session?.user.id) return null

      const { data, error } = await supabase
        .from('household_members')
        .select('id, household_id, role, households(id, name, created_at)')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error) throw error
      return data as HouseholdWithName | null
    },
    enabled: !!session?.user.id,
  })
}

/**
 * Returns all members of the current user's household, each joined with
 * the member's public profile (display name).
 */
export function useHouseholdMembers() {
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: ['household', 'members', householdId],
    queryFn: async (): Promise<MemberWithProfile[]> => {
      const { data, error } = await supabase
        .from('household_members')
        .select('id, household_id, user_id, role, joined_at, profiles(id, display_name, avatar_url, created_at)')
        .eq('household_id', householdId!)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as MemberWithProfile[]
    },
    enabled: !!householdId,
  })
}

/**
 * Creates a new household and assigns the current user as admin.
 * a. Inserts into households (name)
 * b. Inserts into household_members (household_id, user_id, role: 'admin')
 */
export function useCreateHousehold() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (name: string): Promise<Household> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')

      const { data: household, error: hhError } = await supabase
        .from('households')
        .insert({ name })
        .select()
        .single()

      if (hhError) throw hhError

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: household.id, user_id: userId, role: 'admin' })

      if (memberError) throw memberError

      return household
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}

/**
 * Joins a household via an invite token.
 * a. Reads household_invites where token matches, not expired, not used
 * b. Inserts into household_members as 'member'
 * c. Marks invite as used
 */
export function useJoinHousehold() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (token: string): Promise<HouseholdInvite> => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')

      const { data: invite, error: inviteError } = await supabase
        .from('household_invites')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (inviteError) throw inviteError
      if (!invite) throw new Error('Invalid or expired invite link.')

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: invite.household_id, user_id: userId, role: 'member' })

      if (memberError) {
        if (memberError.code === '23505') {
          throw new Error('You are already a member of a household.')
        }
        throw memberError
      }

      const { error: updateError } = await supabase
        .from('household_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id)

      if (updateError) throw updateError

      return invite
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}

/**
 * Creates a new invite token for the current user's household.
 * Returns the created invite row (including token).
 */
export function useCreateInvite() {
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (): Promise<HouseholdInvite> => {
      const { session } = await supabase.auth.getSession().then(r => r.data)
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')

      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('household_invites')
        .insert({ household_id: householdId, created_by: userId })
        .select()
        .single()

      if (error) throw error
      return data
    },
  })
}

/**
 * Returns member_profiles managed by the current user.
 */
export function useMemberProfiles() {
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: ['household', 'member_profiles', householdId],
    queryFn: async (): Promise<MemberProfile[]> => {
      const { data, error } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('managed_by', session!.user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user.id && !!householdId,
  })
}

/**
 * Creates a new managed member profile (child).
 */
export function useCreateMemberProfile() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const { data: membership } = useHousehold()

  return useMutation({
    mutationFn: async (profile: { name: string; is_child: boolean; birth_year: number | null }) => {
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')
      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('member_profiles')
        .insert({ ...profile, household_id: householdId, managed_by: userId })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household', 'member_profiles'] })
    },
  })
}

/**
 * Updates an existing managed member profile.
 */
export function useUpdateMemberProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: { name?: string; is_child?: boolean; birth_year?: number | null }
    }) => {
      const { data, error } = await supabase
        .from('member_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household', 'member_profiles'] })
    },
  })
}

/**
 * Deletes a managed member profile.
 */
export function useDeleteMemberProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('member_profiles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household', 'member_profiles'] })
    },
  })
}
