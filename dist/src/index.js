"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const node_server_1 = require("@hono/node-server");
const cors_1 = require("hono/cors");
require("dotenv/config");
const photos_1 = require("./routes/photos");
const app = new hono_1.Hono();
// CORS middleware
app.use('/*', (0, cors_1.cors)({
    origin: ['http://localhost:3000', 'https://your-frontend-domain.vercel.app'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
}));
app.get('/', (c) => c.text('Hello from DN House Backend!'));
// Photo routes
app.route('/api/photos', photos_1.photos);
// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
(0, node_server_1.serve)({
    fetch: app.fetch,
    port: 5000,
    // hostname: 'localhost',
}, (info) => {
    console.log(`Server is running at http://localhost:${info.port}`);
});
