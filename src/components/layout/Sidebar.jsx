import { useEffect, useRef, useState } from "react";
import { GROUP_STYLE, groupOf, navGroups } from "../../app/navigation.js";
import { t } from "../../i18n/index.js";

const KEY = "af_nav_open";

function readOpen() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function Sidebar({ pages, page, setPage, badges = {} }) {
  const navRef = useRef(null);
  const [open, setOpen] = useState(readOpen);
  const current = groupOf(page);

  useEffect(() => {
    if (current && !open.includes(current)) setOpen((o) => [...o, current]);
  }, [current]);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(open));
  }, [open]);

  useEffect(() => {
    const nav = navRef.current;
    const btn = nav && nav.querySelector("button.active");
    if (!btn) return;
    const n = nav.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    if (b.top < n.top) nav.scrollTop -= n.top - b.top + 8;
    else if (b.bottom > n.bottom) nav.scrollTop += b.bottom - n.bottom + 8;
    if (b.left < n.left) nav.scrollLeft -= n.left - b.left + 8;
    else if (b.right > n.right) nav.scrollLeft += b.right - n.right + 8;
  }, [page]);

  const toggle = (group) => setOpen((o) => (o.includes(group) ? o.filter((x) => x !== group) : [...o, group]));

  return (
    <nav className="pages" ref={navRef}>
      {navGroups(pages).map(([group, items]) => {
        const g = GROUP_STYLE[group] || GROUP_STYLE.More;
        const isOpen = open.includes(group);
        const hasActive = items.some(([id]) => id === page);
        return (
          <div key={group} className={"navgroup" + (isOpen ? " open" : " closed") + (hasActive ? " current" : "")} style={{ "--accent": g.color }}>
            <button type="button" className="navhead" aria-expanded={isOpen} onClick={() => toggle(group)}>
              <span className="navicon">{g.icon}</span>
              <span className="navlabel">{group}</span>
              <span className="navcount">{items.length}</span>
              <span className="navcaret">▸</span>
            </button>
            <div className="navitems">
              {items.map(([id, label]) => (
                <button key={id} className={page === id ? "active" : ""} type="button" onClick={() => setPage(id)}>
                  {t(label)}
                  {badges[id] ? <span className="navbadge">{badges[id] > 99 ? "99+" : badges[id]}</span> : null}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
