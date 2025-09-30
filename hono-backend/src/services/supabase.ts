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

export const uploadToSupabaseStorage = async (file: Buffer, fileName: string, contentType: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('dn-house-photo-storage')
    .upload(fileName, file, {
      contentType,
      upsert: false
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('dn-house-photo-storage')
    .getPublicUrl(fileName)

  return publicUrlData.publicUrl
}

export const getSupabaseStorageUrl = (fileName: string): string => {
  const { data } = supabase.storage
    .from('dn-house-photo-storage')
    .getPublicUrl(fileName)

  return data.publicUrl
}
