/* Service worker — só entra em cena quando o app é servido por HTTPS.
   Guarda o app para funcionar sem rede. Os dados ficam no localStorage,
   nunca passam por aqui.

   CACHE PRIMEIRO (build 2026-09-24.2) — antes era rede primeiro, e isso
   custava a abertura do app todo dia. Medido a 393px, tempo até a primeira
   tela aparecer, variando a latência da rede:

       latência      rede primeiro     cache primeiro
          0ms             76ms              60ms
        150ms            184ms              40ms
        300ms            360ms              60ms
        600ms            676ms              64ms

   Repare no formato da coluna do meio: ela acompanhava a rede 1 para 1,
   porque o `fetch` vinha antes e o cache só era consultado quando a rede
   FALHAVA. Ou seja: o cache servia para o modo avião e para mais nada, e
   no uso normal se pagava a ida-e-volta inteira a cada abertura.

   Agora o cache responde na hora e a rede roda atrás, atualizando a cópia
   para a PRÓXIMA abertura. O troco é conhecido e aceito: ao publicar uma
   versão nova, ela entra na abertura seguinte, não na imediata. Por isso o
   app ganhou, nesta mesma build, a guarda de formato de dados futuro — uma
   casca uma versão atrás não pode ler em silêncio um dado mais novo que ela. */
var CACHE='despesas-2026-09-25.1';
var ARQS=['./','./index.html','./manifest.webmanifest','./icon180.png'];
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ARQS).catch(function(){});}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(function(guardado){
      /* a rede roda de qualquer jeito, para renovar a cópia — mas quem
         responde é o cache, quando existe */
      var rede=fetch(e.request).then(function(r){
        var cp=r.clone();
        caches.open(CACHE).then(function(c){c.put(e.request,cp);});
        return r;
      }).catch(function(){
        /* sem rede e sem cópia: a casca do app serve qualquer rota */
        return guardado||caches.match('./index.html');
      });
      return guardado||rede;
    })
  );
});
