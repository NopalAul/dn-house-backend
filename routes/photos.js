const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { createR2Client, uploadToR2, getPresignedUrl } = require('../utils/r2');

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
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_ENDPOINT: process.env.R2_ENDPOINT
  };

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const r2Client = createR2Client(env);

  return { supabase, r2Client, env };
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
    const { supabase, r2Client, env } = initializeClients();
    const file = req.file;
    const { caption = '', type = '' } = req.body;

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

    await uploadToR2(r2Client, file.buffer, fileName, file.mimetype, env.R2_BUCKET);

    // Presigned URL (valid 7 hari = 604800 seconds)
    const presignedUrl = await getPresignedUrl(r2Client, fileName, env.R2_BUCKET, 604800);

    // Supabase save
    const { data, error } = await supabase
      .from('photos')
      .insert([
        {
          url: presignedUrl,
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
    const { supabase, r2Client, env } = initializeClients();
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

    // Generate new presigned URL (valid for 7 hari)
    const newPresignedUrl = await getPresignedUrl(r2Client, fileName, env.R2_BUCKET, 604800);

    // Supabase update photo URL
    const { data, error } = await supabase
      .from('photos')
      .update({ url: newPresignedUrl })
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
