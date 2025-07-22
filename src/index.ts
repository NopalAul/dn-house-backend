import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import 'dotenv/config'
import { photos } from './routes/photos'

const app = new Hono()

// CORS middleware
app.use('/*', cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.vercel.app'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

app.get('/', (c) => c.text('Hello from DN House Backend!'))

// Photo routes
app.route('/api/photos', photos)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

serve({
  fetch: app.fetch,
  port: 5000,
  hostname: 'localhost',
}, (info) => {
  console.log(`Server is running at http://localhost:${info.port}`)
})