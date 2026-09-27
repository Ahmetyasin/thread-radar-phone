// Thread Radar phone loader: service worker.
//
// This public site holds no app code. Everything under ./app/ is fetched from
// the owner's private repo with the token saved on this phone, so the app is
// updated by pushing to that repo and this file never needs to change.
// ./app/mobile/index.html -> <repo>/mobile/index.html, and so on.

const CONFIG_CACHE = 'radar-config';
const APP_CACHE = 'radar-app';
const ALLOWED = /^(mobile|extension|docs\/post-screenshots)\//;
const TYPES = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json', png: 'image/png', svg: 'image/svg+xml',
  md: 'text/markdown; charset=utf-8', webmanifest: 'application/manifest+json',
};

const configUrl = () => new URL('__config', self.registration.scope).href;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const base = new URL('app/', self.registration.scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  const path = decodeURIComponent(url.pathname.slice(base.pathname.length));
  e.respondWith(serve(path));
});

async function readConfig() {
  const hit = await (await caches.open(CONFIG_CACHE)).match(configUrl());
  return hit ? hit.json() : null;
}

async function serve(path) {
  if (!ALLOWED.test(path) || path.includes('..')) return new Response('not served', { status: 404 });
  const cache = await caches.open(APP_CACHE);
  const key = new URL(`app/${path}`, self.registration.scope).href;
  const cfg = await readConfig();
  if (!cfg) return Response.redirect(new URL('index.html?setup=1', self.registration.scope).href, 302);

  // Network first, so a push reaches the next opening; the cache covers a
  // dead connection and a slow one (4 s).
  try {
    const res = await Promise.race([
      fetch(`https://api.github.com/repos/${cfg.repo}/contents/${path}?ref=${encodeURIComponent(cfg.branch || 'main')}`, {
        headers: { Authorization: `Bearer ${cfg.pat}`, Accept: 'application/vnd.github.raw', 'X-GitHub-Api-Version': '2022-11-28' },
        cache: 'no-store',
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 4000)),
    ]);
    if (res.status === 404) return new Response('not found', { status: 404 });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const ext = path.split('.').pop().toLowerCase();
    const out = new Response(await res.arrayBuffer(), {
      headers: { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' },
    });
    await cache.put(key, out.clone());
    return out;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return hit;
    return new Response(`Could not load ${path}: ${err.message}`, { status: 503 });
  }
}
