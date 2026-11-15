/* 蚀刻防线 Service Worker —— 离线优先的运行时缓存 + 安装时预缓存 */
const VERSION = "ef-v1";
const CACHE = "etched-frontier-" + VERSION;
const CORE = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // 逐个缓存,单个失败不影响整体安装
      await Promise.all(
        CORE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res.clone());
            if (url === "/") {
              // 解析 HTML 中引用的本地资源(脚本/样式),一并预缓存
              const html = await res.clone().text();
              const found = [...html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)].map((m) => m[1]);
              await Promise.all(
                found.map(async (u) => {
                  try {
                    const r = await fetch(u);
                    if (r.ok) await cache.put(u, r);
                  } catch (e) {
                    /* ignore */
                  }
                })
              );
            }
          } catch (e) {
            /* ignore */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("etched-frontier-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航:网络优先(拿到最新版本),离线回退到缓存的应用外壳
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            cache.put("/index.html", res.clone());
            cache.put("/", res.clone());
          }
          return res;
        } catch (e) {
          return (await cache.match("/index.html")) || (await cache.match("/")) || new Response("离线中,请先联网打开一次游戏。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      })()
    );
    return;
  }

  // 其他静态资源:缓存优先 + 后台更新
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const update = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (hit) {
        event.waitUntil(update);
        return hit;
      }
      const res = await update;
      return res || new Response("", { status: 504 });
    })()
  );
});
