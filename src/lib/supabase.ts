import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)
