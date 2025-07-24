const express = require('express');
const cors = require('cors');
const photosRouter = require('../routes/photos');
const guestbookRouter = require('../routes/guestbook');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.vercel.app', 'http://192.168.5.168:3000'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('Ini DN House Backend brok');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Photos router
app.use('/api/photos', photosRouter);

// Guestbook router
app.use('/api/guestbook', guestbookRouter);

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server ready on port ${port}`);
  });
}

module.exports = app;
