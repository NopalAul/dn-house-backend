const express = require('express');
const cors = require('cors');
const photosRouter = require('../routes/photos');

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

// // Initialize Supabase
// const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// // Initialize R2 client
// const r2Client = new S3Client({
//   region: 'auto',
//   endpoint: env.R2_ENDPOINT,
//   credentials: {
//     accessKeyId: env.R2_ACCESS_KEY_ID,
//     secretAccessKey: env.R2_SECRET_ACCESS_KEY,
//   },
// });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.vercel.app', 'http://192.168.5.168:3000'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Hello from DN House Backend Express!');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Use photos router
app.use('/api/photos', photosRouter);

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server ready on port ${port}`);
  });
}

module.exports = app;
