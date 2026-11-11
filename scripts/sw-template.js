/* Generated on build. User profiles stay in localStorage, separate from these app caches. */
const CACHE_NAME = __CACHE_NAME__;
const PRECACHE_URLS = __PRECACHE_URLS__;

// Safari rejects redirected responses for navigation requests. Reconstructing
// a same-origin app response removes its redirect history before caching it.
async function appResponse(response) {
  if (!response.ok || response.type === 'opaque' || response.type === 'opaqueredirect') {
    throw new Error('App download failed');
  }
  if (response.url && new URL(response.url).origin !== self.location.origin) {
    throw new Error('Do not cache a sign-in redirect');
  }
  return new Response(await response.arrayBuffer(), {
    status: response.status, statusText: response.statusText, headers: response.headers,
  });
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Validate every download before storing anything. Never cache a sign-in page.
    const downloads = await Promise.all(PRECACHE_URLS.map(async path => {
      const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' });
      if (response.url && ![path, ...(path === '/index.html' ? ['/'] : [])].includes(new URL(response.url).pathname)) {
        throw new Error('Unexpected app download redirect');
      }
      return [path, await appResponse(response)];
    }));
    await Promise.all(downloads.map(([path, response]) => cache.put(path, response)));
    // This repair must replace the broken worker even when Safari cannot open the UI.
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('versenest-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Leave authentication and other hosting routes to the browser.
  if (request.mode === 'navigate' && ['/', '/index.html'].includes(url.pathname)) {
    event.respondWith((async () => {
      try {
        // A navigation's manual redirect mode preserves hosting sign-in redirects.
        return await fetch(request, { redirect: 'manual' });
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const shell = await cache.match('/');
        if (shell) return appResponse(shell);
        throw error;
      }
    })());
  } else if (url.pathname !== '/' && PRECACHE_URLS.includes(url.pathname) && request.mode !== 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(url.pathname)) || fetch(request);
    })());
  }
});
