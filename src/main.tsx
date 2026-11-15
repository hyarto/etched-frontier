import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA:注册 Service Worker,实现离线可玩;申请持久化存储,避免存档被浏览器清理
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const reg = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  if (document.readyState === "complete") reg();
  else window.addEventListener("load", reg);
}
try {
  void navigator.storage?.persist?.();
} catch {
  /* ignore */
}
