import { useEffect, useState } from "react";
import { GROUP_STYLE, navGroups } from "../../app/navigation.js";
import { t } from "../../i18n/index.js";
import { api } from "../../services/api.js";
import { setFocus } from "../../utils/focus.js";

const TONE = { bad: "var(--bad)", warn: "var(--warn)", info: "var(--accent)" };

export function HomePage({ user, office, companyName, pages, reminders, unread, setPage }) {
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(false);
  const allowed = new Set(pages.map(([id]) => id));

  function loadWork() {
    setLoading(true);
    api("/api/home/summary")
      .then((d) => setWork(d.items || []))
      .catch(() => setWork([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadWork();
  }, [unread]);

  function go(item) {
    if (item.focus) setFocus(item.focus);
    setPage(item.page);
  }

  function openAffidavit(a) {
    setFocus({ page: "affidavit", id: a._id });
    setPage("affidavit");
  }

  const items = (work || []).filter((x) => allowed.has(x.page));
  const urgent = items.filter((x) => x.tone === "bad").reduce((s, x) => s + x.count, 0);
  const affidavits = allowed.has("affidavit") && reminders && reminders.affidavitPending ? reminders.affidavitPending : null;

  return (
    <>
      <div className="card">
        <h3>
          {t("Welcome")}, {user.name}
        </h3>
        <p className="meta">
          {companyName} · {user.fieldStaff ? "Your assigned visits, inspections and tasks." : office || user.hierarchy === "Director" ? "Company workspace." : "Your franchise workspace."}
        </p>
      </div>
      <div className="card">
        <h3>
          Your work today
          {urgent ? <span className="badge bad">{urgent} urgent</span> : null}
          <span className="spacer" />
          <button className="btn ghost" type="button" disabled={loading} onClick={loadWork}>
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </h3>
        {work === null ? (
          <p className="meta">Loading…</p>
        ) : items.length ? (
          <div className="kpis">
            {items.map((x) => (
              <button key={x.key} type="button" className="kpi" style={{ "--k": TONE[x.tone] || TONE.info, cursor: "pointer", textAlign: "left" }} onClick={() => go(x)}>
                <div className="l">{x.title}</div>
                <div className="v">{x.count}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="meta">Nothing waiting on you right now.</p>
        )}
      </div>
      <div className="card">
        {navGroups(pages.filter(([id]) => id !== "home")).map(([group, items]) => {
          const g = GROUP_STYLE[group] || GROUP_STYLE.More;
          return (
            <div key={group} className="tile-group" style={{ "--accent": g.color }}>
              <div className="navhead">
                <span className="navicon">{g.icon}</span>
                {group}
              </div>
              <div className="tiles">
                {items.map(([id, label]) => (
                  <button key={id} type="button" className="tile" onClick={() => setPage(id)}>
                    {t(label)}
                    {id === "notices" && unread ? <span className="navbadge">{unread}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!user.fieldStaff && affidavits ? (
        <div className="card">
          <h4>Reminders</h4>
          {affidavits.length ? (
            <>
              <p className="meta">{affidavits.length} application(s) waiting for a signed affidavit.</p>
              <ul>
                {affidavits.slice(0, showAllReminders ? undefined : 8).map((a) => (
                  <li key={a._id}>
                    <button type="button" className="linklike" onClick={() => openAffidavit(a)}>
                      {a.siteLocationName || a._id}
                    </button>{" "}
                    <span className="meta">({a.model || "model not set"}, {a.status})</span>
                  </li>
                ))}
              </ul>
              {affidavits.length > 8 ? (
                <button className="btn ghost" type="button" onClick={() => setShowAllReminders(!showAllReminders)}>
                  {showAllReminders ? "Show fewer" : "Show all " + affidavits.length}
                </button>
              ) : null}
            </>
          ) : (
            <p className="meta">No pending affidavits.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
