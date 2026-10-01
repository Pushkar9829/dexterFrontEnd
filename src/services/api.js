import { enqueue, flush, queued } from "./offlineQueue.js";

const TOKEN_KEY = "af_token";
// Empty means same origin: the Vite dev proxy, or the API serving the built UI.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const apiUrl = (path) => API_BASE + path;
// Figma capture tabs sign in as different demo users side by side, so each keeps its own token.
const tokenStore = import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo") ? sessionStorage : localStorage;

export function getToken() {
  return tokenStore.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) tokenStore.setItem(TOKEN_KEY, token);
  else tokenStore.removeItem(TOKEN_KEY);
}

// options.offline = "label": a field entry that may be kept on the device and sent later when there is no network.
// It then resolves { queued: true, label } instead of throwing.
export async function api(path, options = {}) {
  const { offline, ...opts } = options;
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;
  const keep = async () => {
    await enqueue(path, opts.method || "POST", opts.body || "{}", offline);
    return { queued: true, label: offline };
  };
  if (offline && !navigator.onLine) return keep();
  if (offline && (await queued()).some((e) => e.status === "pending")) {
    const r = await keep();
    flush();
    return r;
  }
  let res;
  try {
    res = await fetch(apiUrl(path), { ...opts, headers });
  } catch (err) {
    if (offline) return keep();
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    setToken("");
    window.dispatchEvent(new Event("af-session-ended"));
  }
  if (!res.ok) {
    const err = new Error(data.error || "request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export function clientEvent(kind) {
  if (!getToken()) return;
  const page = (window.location.hash || "").slice(1, 60);
  api("/api/audit/client-event", { method: "POST", body: JSON.stringify({ kind, page }) }).catch(() => {});
}

export async function fileToB64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function downloadB64(fileName, mime, data) {
  const a = document.createElement("a");
  a.href = "data:" + (mime || "application/octet-stream") + ";base64," + data;
  a.download = fileName || "file";
  a.click();
}
