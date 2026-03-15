import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Fetches the current user's profile from the profiles table.
 */
export function useProfile() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['profile', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .eq('id', session!.user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!session,
  })
}

/**
 * Mutation to update display_name and/or avatar_url for the current user.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (updates: { display_name?: string; avatar_url?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })
}

/**
 * Uploads an avatar image to Supabase Storage and returns the public URL.
 * Validates file type (jpg, png, webp) and size (max 2MB).
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Image must be smaller than 2MB.')
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path)

  return publicUrl
}
