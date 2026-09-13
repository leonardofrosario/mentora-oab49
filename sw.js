const CACHE='mentora-oab49-ma-coach';
const ASSETS=['./','./index.html','./styles.css','./ui-v6.css','./coach-ui.css','./manifest.webmanifest','./data/questions-1.js','./data/questions-2.js','./data/questions-3.js','./data/questions-4.js','./data/questions-5.js','./data/questions-6.js','./data/questions-7.js','./data/questions-8.js','./app-1.js','./app-2.js','./app-3.js','./app-4.js','./learning-ui.js','./cloud-config.js','./cloud-core.js','./cloud-ai.js','./ma-ui.js','./coach-ui.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return r}).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===location.origin){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request)));
});