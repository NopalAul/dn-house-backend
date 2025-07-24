const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();

// Environment variables
const env = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ENDPOINT: process.env.R2_ENDPOINT
};

// Initialize Supabase
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.vercel.app', 'http://192.168.5.168:3000'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// R2 helper functions
const uploadToR2 = async (buffer, fileName, contentType) => {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
};

const getPresignedUrl = async (fileName, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: fileName,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
};

// Routes
app.get('/', (req, res) => {
  res.send('Hello from DN House Backend Express!');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all photos
app.get('/api/photos', async (req, res) => {
  try {
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

// Get single photo by id
app.get('/api/photos/:id', async (req, res) => {
  try {
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

// Upload photo
app.post('/api/photos/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { caption = '', type = '' } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Validate type value
    if (!['postcard', 'polaroid'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "postcard" or "polaroid".' });
    }

    // Generate unique filename
    const fileName = `${Date.now()}-${file.originalname}`;

    // Upload to R2
    await uploadToR2(file.buffer, fileName, file.mimetype);

    // Generate presigned URL (valid 7 days = 604800 seconds)
    const presignedUrl = await getPresignedUrl(fileName, 604800);

    // Save to Supabase
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
app.post('/api/photos/:id/refresh-url', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Get photo data
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Extract filename from existing URL
    const urlParts = photo.url.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0];

    // Generate new presigned URL (valid for 7 days)
    const newPresignedUrl = await getPresignedUrl(fileName, 604800);

    // Update photo URL in database
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
app.delete('/api/photos/:id', async (req, res) => {
  try {
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

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server ready on port ${port}`);
  });
}

module.exports = app;
