const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const initializeClients = () => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  };

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  return { supabase, env };
};

// Untuk api/photos
router.get('/', async (req, res) => {
  try {
    const { supabase } = initializeClients();
    
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ photos: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Untuk api/photos/:id
router.get('/:id', async (req, res) => {
  try {
    const { supabase } = initializeClients();
    const id = parseInt(req.params.id);
    
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    res.json({ photo: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// Untuk api/photos/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { supabase } = initializeClients();
    const file = req.file;
    const { caption = '', type = '' } = req.body;

    // log request body and file info
    console.log('Request body:', req.body);

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    if (!['postcard', 'polaroid'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "postcard" or "polaroid".' });
    }

    // Unique filename
    const fileName = `${Date.now()}-${file.originalname}`;

    // Upload to Supabase Storage
    const imageUrl = await uploadToSupabaseStorage(supabase, file.buffer, fileName, file.mimetype);

    // Supabase save
    const { data, error } = await supabase
      .from('photos')
      .insert([
        {
          url: imageUrl,
          caption: caption,
          type: type
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      photo: data,
      message: 'Photo uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Generate fresh presigned URL for existing photo
router.post('/:id/refresh-url', async (req, res) => {
  try {
    const { supabase } = initializeClients();
    const id = parseInt(req.params.id);
    
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const urlParts = photo.url.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0];

    // Generate new Supabase storage URL
    const newImageUrl = getSupabaseStorageUrl(supabase, fileName);

    // Supabase update photo URL
    const { data, error } = await supabase
      .from('photos')
      .update({ url: newImageUrl })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      photo: data,
      message: 'Photo URL refreshed successfully' 
    });
  } catch (error) {
    console.error('Refresh URL error:', error);
    res.status(500).json({ error: 'Failed to refresh photo URL' });
  }
});

// untuk update photo (file image, caption, type) (api/photos/update/:id)
router.put('/update/:id', upload.single('file'), async (req, res) => {
  try {
    const { supabase } = initializeClients();
    const id = parseInt(req.params.id);
    const file = req.file;
    const { caption = '', type = '' } = req.body;

    if (!file && !caption && !type) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (file && !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    if (type && !['postcard', 'polaroid'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "postcard" or "polaroid".' });
    }

    // Fetch existing photo
    const { data: existingPhoto, error: fetchError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPhoto) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    let newUrl = existingPhoto.url;

    // If a new file is provided, upload it to Supabase Storage
    if (file) {
      const fileName = `${Date.now()}-${file.originalname}`;
      newUrl = await uploadToSupabaseStorage(supabase, file.buffer, fileName, file.mimetype);
    }

    // Update in Supabase
    const { data, error } = await supabase
      .from('photos')
      .update({
        url: newUrl,
        caption: caption || existingPhoto.caption,
        type: type || existingPhoto.type
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      photo: data,
      message: 'Photo updated successfully' 
    });
  } catch (error) {
    console.error('Update photo error:', error);
    res.status(500).json({ error: 'Failed to update photo' });
  }
});

// Delete photo
router.delete('/:id', async (req, res) => {
  try {
    const { supabase } = initializeClients();
    const id = parseInt(req.params.id);
    
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
