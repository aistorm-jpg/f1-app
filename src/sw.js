/* Apex service worker.
   Netværk først, og den gamle kopi hvis du er offline.
   Jolpica er et andet domæne, så den caches i localStorage i stedet.
   Hold fillisten ens med de filer build-scriptet lægger i dist/. */

const CACHE = "apex-static-v1";

const PRECACHE = [
  "./",
  "./index.html",
  "./koerer.html",
  "./konstruktorer.html",
  "./kalender.html",
  "./resultater.html",
  "./404.html",
  "./styles.css",
  "./assets/app.js",
  "./manifest.json",
  "./fonts/oswald.woff2",
  "./fonts/outfit.woff2",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const home = await caches.match("./index.html");
          if (home) return home;
        }
        return new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }),
  );
});
