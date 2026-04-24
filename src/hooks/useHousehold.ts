import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { queryKeys } from '../lib/queryKeys'
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
    queryKey: queryKeys.household.root(session?.user.id),
    queryFn: async (): Promise<HouseholdWithName | null> => {
      if (!session?.user.id) return null

      const { data, error } = await supabase
        .from('household_members')
        .select('id, household_id, role, households(id, name, week_start_day, weekly_budget, created_at)')
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
  const { session } = useAuth()
  const { data: membership } = useHousehold()
  const householdId = membership?.household_id

  return useQuery({
    queryKey: queryKeys.household.members(session?.user.id, householdId),
    queryFn: async (): Promise<MemberWithProfile[]> => {
      const { data, error } = await supabase
        .from('household_members')
        .select('id, household_id, user_id, role, joined_at, profiles(id, display_name, avatar_url, created_at)')
        .eq('household_id', householdId!)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as MemberWithProfile[]
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

      const householdId = crypto.randomUUID()

      const { error: hhError } = await supabase
        .from('households')
        .insert({ id: householdId, name })

      if (hhError) throw hhError

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: householdId, user_id: userId, role: 'admin' })

      if (memberError) throw memberError

      return { id: householdId, name, week_start_day: 0, weekly_budget: null, created_at: new Date().toISOString() }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['household'] })
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
        .insert({ household_id: invite.household_id, user_id: userId, role: invite.role ?? 'member' })

      if (memberError) {
        if (memberError.code === '23505') {
          throw new Error('You are already a member of a household.')
        }
        throw memberError
      }

      const { error: updateError } = await supabase
        .rpc('mark_invite_used' as never, { invite_id: invite.id } as never)

      if (updateError) throw updateError

      return invite
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['household'] })
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
    mutationFn: async (role?: 'admin' | 'member'): Promise<HouseholdInvite> => {
      const { session } = await supabase.auth.getSession().then(r => r.data)
      const userId = session?.user.id
      if (!userId) throw new Error('Not authenticated')

      const householdId = membership?.household_id
      if (!householdId) throw new Error('No household found')

      const { data, error } = await supabase
        .from('household_invites')
        .insert({ household_id: householdId, created_by: userId, role: role ?? 'member' })
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
    queryKey: queryKeys.household.memberProfiles(session?.user.id, householdId),
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
      queryClient.invalidateQueries({ queryKey: ['household'] })
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
      queryClient.invalidateQueries({ queryKey: ['household'] })
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
      queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}

/**
 * Promotes a member to admin or demotes an admin to member (Phase 30 SPEC Req #1).
 * - Callable by any admin in the same household as the target member.
 * - DB-enforced: rejects with 'At least one admin required' (exact string) if it would
 *   reduce the household's admin count to zero.
 * - `member_row_id` is the `household_members.id` (the row UUID, NOT the user_id).
 */
export function useChangeMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { member_row_id: string; new_role: 'admin' | 'member' }) => {
      const { error } = await supabase
        .rpc('change_member_role' as never, {
          member_row_id: params.member_row_id,
          new_role: params.new_role,
        } as never)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}

/**
 * Removes a member from the caller's household (Phase 30 SPEC Req #3).
 * - Callable by any admin in the same household as the target member.
 * - DB-enforced last-admin protection.
 */
export function useRemoveHouseholdMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (member_row_id: string) => {
      const { error } = await supabase
        .rpc('remove_household_member' as never, { member_row_id } as never)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}

/**
 * Current user leaves their household voluntarily (Phase 30 SPEC Req #4).
 * - Callable by any member (admin OR member) — does NOT require admin role.
 * - DB-enforced: rejects with 'At least one admin required' if caller is the sole admin.
 */
export function useLeaveHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .rpc('leave_household' as never, {} as never)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['household'] })
    },
  })
}
