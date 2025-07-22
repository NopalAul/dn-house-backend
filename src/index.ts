import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => c.text('Hello from Hono Backend!'))

// declare const serve: (options: Options, listeningListener?: (info: AddressInfo) => void) => ServerType;
// type Options = {
//     fetch: FetchCallback;
//     overrideGlobalObjects?: boolean;
//     autoCleanupIncoming?: boolean;
//     port?: number;
//     hostname?: string;
// } & ServerOptions;
// serve with info log and port:
serve({
  fetch: app.fetch,
  port: 5000,
  hostname: 'localhost',
}, (info) => {
  console.log(`Server is running at http://localhost:${info.port}`)
})