const CACHE='mentora-oab49-v4';
const ASSETS=["./", "./index.html", "./styles.css", "./manifest.webmanifest", "./data/questions-1.js", "./data/questions-2.js", "./data/questions-3.js", "./data/questions-4.js", "./data/questions-5.js", "./data/questions-6.js", "./data/questions-7.js", "./data/questions-8.js", "./app-1.js", "./app-2.js", "./app-3.js", "./app-4.js", "./cloud-config.js", "./cloud-core.js", "./cloud-ai.js"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html')))));
