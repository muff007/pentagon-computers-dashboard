/*
 * Dashboard service worker.
 *
 * This one exists only to make the panel installable and to show a readable
 * notice instead of a browser error when a manager opens it with no signal.
 *
 * It caches NOTHING from the dashboard itself. Every page here is behind the
 * admin login and shows the catalogue, customer addresses and order history;
 * none of that should be written to a phone's disk where it would outlive the
 * session. Only the offline notice and the app icons are stored.
 */

const VERSION = "v1";
const SHELL = `dash-shell-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png", "/icon-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Pages only, and only to replace a network failure with something legible.
  // Successful responses are passed straight through and never stored.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((hit) => hit ?? Response.error()),
      ),
    );
  }
});
