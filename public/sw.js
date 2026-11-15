/* 蚀刻防线 Service Worker —— 离线优先
 * - 安装时预缓存应用外壳(HTML + 页面引用的全部本地资源 + 图标 + manifest)
 * - 外壳或其依赖缓存失败 => 安装失败,下次访问自动重试(保证"装上就能离线")
 * - 页面导航:网络优先(带超时),离线/弱网回退到缓存外壳
 * - 其他同源静态资源:缓存优先 + 后台更新
 * 修改发布内容时请递增 VERSION,旧缓存会在 activate 时清除。
 */
const VERSION = "ef-v2";
const CACHE = "etched-frontier-" + VERSION;
const SHELL = "/";
const EXTRA = ["/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"];
const NAV_TIMEOUT = 3500;

// Vercel 的 cleanUrls / 重定向会让响应带有 redirected 标记,
// 这种响应不能直接用于回应页面导航,这里重新封装成干净的响应。
async function clean(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function precache() {
  const cache = await caches.open(CACHE);
  // 1) 应用外壳:必须成功
  const shellRes = await fetch(SHELL, { cache: "reload" });
  if (!shellRes.ok) throw new Error("shell fetch failed: " + shellRes.status);
  const html = await shellRes.clone().text();
  await cache.put(SHELL, await clean(shellRes));
  // 2) HTML 引用的本地资源(脚本/样式/图标):必须成功
  const found = new Set();
  for (const m of html.matchAll(/(?:src|href)=["'](\/(?!\/)[^"'#?]*)["']/g)) found.add(m[1]);
  EXTRA.forEach((u) => found.add(u));
  found.delete(SHELL);
  const critical = [...found].filter((u) => /\.(js|css|mjs|json|woff2?)$/.test(u));
  await Promise.all(
    [...found].map(async (u) => {
      try {
        const r = await fetch(u, { cache: "reload" });
        if (!r.ok) throw new Error(u + " -> " + r.status);
        await cache.put(u, await clean(r));
      } catch (err) {
        if (critical.includes(u)) throw err;
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
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

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function handleNavigate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(SHELL, { ignoreSearch: true });
  const network = fetch(event.request)
    .then(async (res) => {
      // 只有成功的、非重定向的同源响应才更新外壳缓存
      if (res && res.ok && res.type === "basic" && !res.redirected) {
        event.waitUntil(cache.put(SHELL, res.clone()));
      }
      return res;
    })
    .catch(() => null);
  if (!cached) {
    const res = await network;
    return res || new Response("离线中,请先联网打开一次游戏以完成安装。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  // 有缓存:网络优先,但最多等待 NAV_TIMEOUT,弱网也能秒开
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT));
  const res = await Promise.race([network, timeout]);
  return res || cached;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(handleNavigate(event));
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      const update = fetch(req)
        .then(async (res) => {
          if (res && res.ok && res.type === "basic") await cache.put(req, (await clean(res.clone())));
          return res;
        })
        .catch(() => null);
      if (hit) {
        event.waitUntil(update);
        return hit;
      }
      const res = await update;
      return res || new Response("", { status: 504, statusText: "offline" });
    })()
  );
});
