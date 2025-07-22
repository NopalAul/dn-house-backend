import { Hono } from 'hono'
import { supabase, Photo } from '../supabase'
import { uploadToR2 } from '../r2'

const photos = new Hono()

// Get all photos
photos.get('/', async (c) => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return c.json({ error: error.message }, 500)
    }

    return c.json({ photos: data })
  } catch (error) {
    return c.json({ error: 'Failed to fetch photos' }, 500)
  }
})

// Get single photo by id
photos.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return c.json({ error: error.message }, 404)
    }

    return c.json({ photo: data })
  } catch (error) {
    return c.json({ error: 'Failed to fetch photo' }, 500)
  }
})

// Upload photo
photos.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const caption = formData.get('caption') as string || ''

    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'File must be an image' }, 400)
    }

    // Generate unique filename
    const fileName = `${Date.now()}-${file.name}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload to R2
    const imageUrl = await uploadToR2(fileBuffer, fileName, file.type)

    // Save to Supabase
    const { data, error } = await supabase
      .from('photos')
      .insert([
        {
          url: imageUrl,
          caption: caption
        }
      ])
      .select()
      .single()

    if (error) {
      return c.json({ error: error.message }, 500)
    }

    return c.json({ 
      success: true, 
      photo: data,
      message: 'Photo uploaded successfully' 
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Failed to upload photo' }, 500)
  }
})

// Delete photo
photos.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id)

    if (error) {
      return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true, message: 'Photo deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to delete photo' }, 500)
  }
})

export { photos }
