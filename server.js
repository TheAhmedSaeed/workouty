// Minimal static server for the built SPA.
//
// We use Express (not `serve`) because `serve` behind Railway's HTTP/2 edge
// intermittently breaks asset transfers with net::ERR_HTTP2_PROTOCOL_ERROR
// (blank screen). Express sends a correct Content-Length and we deliberately
// do NOT compress at the origin — Railway's edge handles compression, and
// double-compression is what corrupts the HTTP/2 stream.

import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const app = express();

app.disable('x-powered-by');

// Compress at the origin and advertise Content-Encoding: gzip. Railway's HTTP/2
// edge then passes the bytes through instead of re-compressing them — which is
// what was corrupting the stream (net::ERR_HTTP2_PROTOCOL_ERROR / blank screen).
app.use(compression({ threshold: 0 }));

// Simple liveness/version check for debugging deploys.
app.get('/healthz', (_req, res) => res.type('text').send('ok'));

app.use(
  express.static(dist, {
    setHeaders(res, filePath) {
      // hashed assets are safe to cache forever; HTML/SW must stay fresh so a
      // redeploy is picked up immediately
      if (filePath.endsWith('.html') || filePath.endsWith(`${path.sep}sw.js`)) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

// SPA fallback — every unknown route serves index.html
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(dist, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Workouty serving on :${port}`);
});
