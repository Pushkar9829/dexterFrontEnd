// Field entries (visit, inspection, EOD, their photos) made without network are kept in IndexedDB on this device,
// tagged with the user + company that made them, and sent in order when the connection returns.
// Only requests the page marks as offline-safe are queued; nothing else is stored.

const DB = "af_offline";
const STORE = "queue";
const EVENT = "af-queue-changed";
let owner = "";

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out && "result" in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

const changed = () => window.dispatchEvent(new Event(EVENT));

export function setQueueOwner(user) {
  owner = user ? user.id + ":" + user.companyId : "";
  changed();
}

export const onQueueChange = (fn) => {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
};

export async function queued() {
  if (!owner || !window.indexedDB) return [];
  const all = (await tx("readonly", (s) => s.getAll())) || [];
  return all.filter((e) => e.owner === owner).sort((a, b) => a.id - b.id);
}

export async function enqueue(path, method, body, label) {
  if (!owner) throw new Error("not signed in");
  await tx("readwrite", (s) => s.add({ owner, path, method, body, label: label || "Entry", madeAt: new Date().toISOString(), status: "pending", error: "" }));
  changed();
}

export async function discard(id) {
  await tx("readwrite", (s) => s.delete(id));
  changed();
}

export async function retry(id) {
  const all = await queued();
  const e = all.find((x) => x.id === id);
  if (!e) return;
  await tx("readwrite", (s) => s.put({ ...e, status: "pending", error: "" }));
  changed();
  return flush();
}

// Removes everything this user queued (used on sign-out).
export async function clearMine() {
  for (const e of await queued()) await tx("readwrite", (s) => s.delete(e.id));
  changed();
}

let flushing = false;

// Sends pending entries oldest first. Stops at the first network failure; a refusal from the server (conflict,
// validation, locked record) is kept as "failed" with the server's message so the user can retry or discard it.
export async function flush() {
  if (flushing || !owner || !navigator.onLine) return { sent: 0, failed: 0 };
  flushing = true;
  const out = { sent: 0, failed: 0 };
  try {
    const { getToken, apiUrl } = await import("./api.js");
    for (const e of await queued()) {
      if (e.status !== "pending") continue;
      let res;
      try {
        res = await fetch(apiUrl(e.path), { method: e.method, body: e.body, headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken(), "X-Offline-At": e.madeAt } });
      } catch {
        break;
      }
      if (res.status === 401) break;
      if (res.ok) {
        await tx("readwrite", (s) => s.delete(e.id));
        out.sent++;
      } else {
        const data = await res.json().catch(() => ({}));
        await tx("readwrite", (s) => s.put({ ...e, status: "failed", error: data.error || "refused (" + res.status + ")" }));
        out.failed++;
      }
    }
  } finally {
    flushing = false;
    changed();
  }
  return out;
}
