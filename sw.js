/* Service worker do Andou! – permite instalar o app e abrir mesmo offline.
   Para publicar uma versão nova do app, aumente o número em CACHE. */
const CACHE='andou-v2';
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png'];
const CDN=['unpkg.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const same=url.origin===location.origin;
  if(!same&&!CDN.includes(url.hostname))return;   /* Supabase e demais APIs: sempre direto na rede */
  /* páginas: rede primeiro (sempre a versão mais nova), cache se estiver offline */
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(CACHE).then(ch=>ch.put('index.html',c));return r})
      .catch(()=>caches.match('index.html').then(r=>r||caches.match('./'))));
    return;
  }
  /* arquivos estáticos e bibliotecas: usa o cache e atualiza em segundo plano */
  e.respondWith(caches.open(CACHE).then(ch=>ch.match(req).then(hit=>{
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))ch.put(req,r.clone());return r}).catch(()=>hit);
    return hit||net;
  })));
});
