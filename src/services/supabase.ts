import { createClient } from '@supabase/supabase-js'
import { env } from '../env'

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)

export interface Photo {
  id: number
  url: string
  caption: string
  filename?: string
  created_at: string
  type: string // "postcard" or "polaroid"
}
