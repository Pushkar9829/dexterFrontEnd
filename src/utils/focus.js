import { useEffect, useState } from "react";

const KEY = "af_focus";

export function setFocus(link) {
  if (link && link.page && (link.id || link.type)) sessionStorage.setItem(KEY, JSON.stringify(link));
}

// Returns the pending notice link for this page (and clears it), or null when the link belongs elsewhere.
export function takeFocus(page) {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  let link = null;
  try {
    link = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
  if (!link || link.page !== page) return null;
  sessionStorage.removeItem(KEY);
  return link;
}

// Row highlight for pages that only need "scroll to and mark the record": rows carry id="row-<_id>".
export function useFocusRow(page, onLink, deps = []) {
  const [focusId, setFocusId] = useState("");
  useEffect(() => {
    const link = takeFocus(page);
    if (!link) return;
    if (link.id) setFocusId(link.id);
    if (onLink) onLink(link);
  }, []);
  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      const el = document.getElementById("row-" + focusId);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 400);
    return () => clearTimeout(t);
  }, [focusId, ...deps]);
  const rowProps = (r, cls) => ({ id: "row-" + r._id, className: [cls, focusId === r._id ? "focus" : ""].filter(Boolean).join(" ") || undefined });
  return { focusId, setFocusId, rowProps };
}
