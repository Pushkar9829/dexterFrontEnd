// Dev-only helpers for capturing screens into Figma. Example:
//   http://localhost:5173/?demo=admin@demo.local&page=users&click=New user|Role#figmacapture=...
// click: "|"-separated steps, each one visible label (matched ignoring icons, case and counts).
//   "=Open ›" matches the exact text, "nav:Label" / "top:Label" limit the search to the sidebar / topbar, "Label@2" takes the 2nd match,
//   "row:1" clicks the 1st table row, "css:selector" clicks a selector, "wait:800" pauses.
// focus: JSON link handed to the page through the existing setFocus deep link.
import { DEMO_LOGINS } from "../pages/auth/demoLogins.js";

const params = import.meta.env.DEV ? new URLSearchParams(window.location.search) : new URLSearchParams();
const capturing = import.meta.env.DEV && window.location.hash.includes("figmacapture");
export const CAPTURE_MODE = import.meta.env.DEV && (params.has("demo") || capturing);
export const capturePage = params.get("page") || "";
const clicks = (params.get("click") || "").split("|").map((s) => s.trim()).filter(Boolean);
const demoLogin = params.get("demo") || "";
const demoAccount = DEMO_LOGINS.flatMap(([, , accounts]) => accounts).find(([, login]) => login === demoLogin);
export const captureWaitsForSignIn = !!demoAccount;

if (CAPTURE_MODE && params.get("focus")) sessionStorage.setItem("af_focus", params.get("focus"));

if (CAPTURE_MODE && params.get("name")) {
  const name = params.get("name");
  document.title = name;
  new MutationObserver(() => document.title !== name && (document.title = name)).observe(document.querySelector("title"), { childList: true });
}

// Captures are full-page, so window-sized fixed/sticky layers would stop part-way down the frame.
if (CAPTURE_MODE) {
  const style = document.createElement("style");
  style.textContent =
    "nav.pages{position:static;max-height:none;overflow:visible}.topbar{position:static}" +
    "body.modal-open .watermark{height:100vh;min-height:0;overflow:hidden}";
  document.head.appendChild(style);
}

export async function captureSignIn(api, setToken) {
  if (!demoAccount) return;
  const [, login, password] = demoAccount;
  let data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ login, password }) });
  if (!data.token && data.ticket && data.otpDemo) {
    data = await api("/api/auth/mfa", { method: "POST", body: JSON.stringify({ ticket: data.ticket, otp: data.otpDemo }) });
  }
  if (data.token) setToken(data.token);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, " ").trim();
const ownText = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ");
const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
const CLICKABLE = "button, a, [role=tab], summary, label, tr, li, .chip, .tile, .card";

function scopes(prefix) {
  if (prefix === "nav") return [document.querySelector("nav.pages")];
  if (prefix === "top") return [document.querySelector("header.topbar")];
  const modals = document.querySelectorAll(".modal");
  const list = [];
  if (modals.length) list.push(modals[modals.length - 1]);
  list.push(document.querySelector("main") || document.querySelector(".app") || document.body, document.body);
  return list.filter(Boolean);
}

function findTarget(step) {
  if (step.startsWith("css:")) return document.querySelector(step.slice(4));
  if (step.startsWith("row:")) {
    const rows = Array.from(document.querySelectorAll((document.querySelector(".modal") ? ".modal " : "") + "tbody tr")).filter((r) => visible(r) && r.cells.length > 1);
    return rows[Number(step.slice(4)) - 1];
  }
  let prefix = "";
  let label = step;
  const m = /^(nav|top):(.*)$/.exec(step);
  if (m) [, prefix, label] = m;
  let nth = 1;
  const at = /^(.*)@(\d+)$/.exec(label);
  if (at) {
    label = at[1];
    nth = Number(at[2]);
  }
  const exact = label.startsWith("=");
  const q = exact ? label.slice(1).trim() : norm(label);
  const same = (s) => (exact ? (s || "").replace(/\s+/g, " ").trim() === q : norm(s) === q);
  for (const scope of scopes(prefix)) {
    const skip = prefix ? null : [document.querySelector("nav.pages"), document.querySelector("header.topbar")];
    const hits = [];
    const plain = [];
    scope.querySelectorAll("*").forEach((el) => {
      if (!visible(el) || (skip && scope === document.body && skip.some((s) => s && s.contains(el)))) return;
      if (same(ownText(el)) || (el.children.length === 0 && same(el.textContent))) {
        const target = el.closest(CLICKABLE);
        const list = target ? hits : plain;
        if (!list.includes(target || el)) list.push(target || el);
      }
    });
    // Headings often repeat a tab's label, so real controls win over plain text.
    if (hits.length >= nth) return hits[nth - 1];
    if (!hits.length && plain.length >= nth) return plain[nth - 1];
  }
  return null;
}

async function runClicks() {
  for (const step of clicks) {
    if (step.startsWith("wait:")) {
      await sleep(Number(step.slice(5)) || 500);
      continue;
    }
    let el = null;
    for (let i = 0; i < 40 && !el; i++) {
      el = findTarget(step);
      if (!el) await sleep(250);
    }
    // A missing step means this role doesn't have that screen, so nothing should be submitted.
    if (!el) {
      console.warn("[figma capture] no match for " + step);
      return false;
    }
    el.scrollIntoView({ block: "center" });
    el.click();
    await sleep(900);
  }
  window.scrollTo(0, 0);
  return true;
}

let loaded = false;
// The Figma script snapshots the page as soon as it loads, so it must wait until the screen has its data.
export function loadCaptureScript(delayMs = 0) {
  if (!capturing || loaded) return;
  loaded = true;
  setTimeout(async () => {
    if (!(await runClicks())) return;
    await sleep(clicks.length ? 1200 : 0);
    const s = document.createElement("script");
    s.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
    s.async = true;
    document.head.appendChild(s);
  }, delayMs);
}
