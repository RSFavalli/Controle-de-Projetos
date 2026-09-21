/**
 * sw.js — Service Worker
 * ------------------------------------------------------------------
 * Responsável por deixar o app shell (HTML/CSS/JS/ícones) disponível
 * offline. Estratégia: cache-first para os arquivos do app shell,
 * com atualização em segundo plano (stale-while-revalidate) quando
 * há conexão.
 *
 * IMPORTANTE: sempre que os arquivos abaixo forem alterados, suba a
 * versão de CACHE_NAME (ex.: "timesheet-cache-v2") para forçar os
 * navegadores a buscarem a versão nova.
 * ------------------------------------------------------------------
 */

const CACHE_NAME = 'timesheet-cache-v5';

const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/data.js',
  './js/db.js',
  './js/api.js',
  './js/timer.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Só tratamos requisições GET dentro do próprio app (mesma origem).
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // offline: cai para o cache

      // Cache-first: responde rápido com o cache (se existir) e
      // atualiza em segundo plano; se não houver cache, aguarda a rede.
      return cachedResponse || networkFetch;
    })
  );
});
