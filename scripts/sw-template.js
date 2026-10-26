/* Cache only the public application shell. Never store authenticated API responses. */
const scope=new URL(self.registration.scope);
const PREFIX='chagok-shell:'+scope.pathname+':';
const CACHE=PREFIX+'__BUILD_ID__';
const withinScope=url=>url.origin===scope.origin && url.pathname.startsWith(scope.pathname);
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const response=await fetch(new URL('index.html',scope),{cache:'reload'});
 if(!response.ok)throw Error('Shell unavailable');
 const html=await response.clone().text();
 const files=[...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css))"/g)].map(match=>new URL(match[1],scope));
 const cache=await caches.open(CACHE);
 for(const url of files){if(withinScope(url) && url.pathname.startsWith(scope.pathname+'assets/'))await cache.add(url);}
 await cache.put(new URL('index.html',scope),response);
})());});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX) && name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET' || !withinScope(url) || request.headers.has('authorization') || request.headers.has('apikey'))return;
 if(request.mode==='navigate' && [scope.pathname,scope.pathname+'index.html'].includes(url.pathname)){
  event.respondWith((async()=>{try{return await fetch(request);}catch{return (await caches.match(new URL('index.html',scope))) || Response.error();}})());
 }else if(url.pathname.startsWith(scope.pathname+'assets/') && /\.(js|css)$/.test(url.pathname)){
  event.respondWith((async()=>{const cached=await caches.match(request,{ignoreVary:true});return cached || fetch(request);})());
 }
});
