import { useEffect, useRef, useState } from "react";
import { COLORS, Chart } from "../../components/common/Chart.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64 } from "../../services/api.js";
import { setFocus } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";
import { can } from "../../utils/perm.js";

const BOARDS = [
  ["overview", "Overview", "CRM-07"],
  ["health", "ATM health", "CRM-07"],
  ["complaints", "Complaints", "CRM-05"],
  ["projects", "Projects", "CRM-03"],
  ["ops", "Daily ops", "CRM-04"],
  ["finance", "Finance", "CRM-04"],
  ["tasks", "Tasks / workload", "CRM-06"],
];
const ONLY = { complaints: ["state", "ssm", "rm", "ownerUserId", "category"], ops: ["date"] };

const istToday = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const shift = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

// Date presets in IST; the financial year starts on 1 April.
function presetRange(key) {
  const t = istToday();
  if (key === "today") return { from: t, to: t };
  if (key === "yesterday") return { from: shift(t, -1), to: shift(t, -1) };
  if (key === "week") return { from: shift(t, -((new Date(t + "T00:00:00Z").getUTCDay() + 6) % 7)), to: t };
  if (key === "month") return { from: t.slice(0, 8) + "01", to: t };
  const y = Number(t.slice(0, 4));
  return { from: (Number(t.slice(5, 7)) >= 4 ? y : y - 1) + "-04-01", to: t };
}
const PRESETS = [["today", "Today"], ["yesterday", "Yesterday"], ["week", "This week"], ["month", "This month"], ["fy", "This FY"]];

function fmt(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v.toLocaleString("en-IN");
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
  return String(v);
}

function Pick({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
      </select>
    </label>
  );
}

export function DashboardsPage({ user, atms, franchises, showTasks = true, setPage, allowedPages = [], setError }) {
  const boards = BOARDS.filter(([k, , mod]) => (k !== "tasks" || showTasks) && (!user || can(user, "View", mod))).map(([k, label]) => [k, label]);
  const [kind, setKindRaw] = useState(() => (boards[0] ? boards[0][0] : ""));
  const [filters, setFilters] = useState({});
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const seq = useRef(0);
  function setKind(next) {
    if (next === kind) return;
    const drop = Object.entries(ONLY).filter(([k]) => k !== next).flatMap(([, keys]) => keys);
    setFilters((f) => Object.fromEntries(Object.entries(f).filter(([k]) => !drop.includes(k))));
    setKindRaw(next);
  }
  const set = (k, v) => setFilters((x) => ({ ...x, [k]: v }));
  const active = Object.values(filters).filter(Boolean).length;
  const query = () =>
    Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k, v]) => k + "=" + encodeURIComponent(v))
      .join("&");

  async function load() {
    if (!kind) return;
    const my = ++seq.current;
    setLoading(true);
    setFailed("");
    try {
      const b = await api("/api/dashboard/" + kind + "?" + query());
      if (my === seq.current) setBoard(b);
    } catch (err) {
      if (my !== seq.current) return;
      setBoard(null);
      setFailed(err.message);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [kind, filters]);

  if (!boards.length) return <div className="card empty">No dashboards are open to your role.</div>;

  async function exportCsv() {
    try {
      const r = await api("/api/dashboard/" + kind + "?csv=1&" + query());
      downloadB64(r.fileName, "text/csv", btoa(unescape(encodeURIComponent(r.csv))));
    } catch (err) {
      setError(err.message);
    }
  }

  // Dashboard → filtered report list (kind) or a page / record (page + id / type).
  function go(link) {
    if (!link || !setPage) return;
    if (link.kind) {
      if (!allowedPages.includes("lists")) return setError("You don't have access to the Report lists page.");
      const carry = Object.fromEntries(["region", "client", "team", "franchiseId"].filter((k) => filters[k]).map((k) => [k, filters[k]]));
      const from = link.from || filters.from || "";
      const to = link.to || filters.to || "";
      setFocus({ page: "lists", type: link.kind, ...carry, ...(from || to ? { from, to } : {}) });
      return setPage("lists");
    }
    if (!allowedPages.includes(link.page)) return setError("You don't have access to the " + humanize(link.page) + " page.");
    setFocus(link);
    setPage(link.page);
  }
  const drill = (board && board.drill) || {};
  const preset = PRESETS.find(([k]) => {
    const r = presetRange(k);
    return filters.from === r.from && filters.to === r.to;
  });

  const o = (board && board.options) || {};
  const cols = board && board.list.length ? Object.keys(board.list[0]).filter((c) => !c.startsWith("_")) : [];

  return (
    <>
      <Tabs tabs={boards} value={kind} onChange={setKind} />
      {!["finance", "projects", "health"].includes(kind) ? (
        <div className="toolbar">
          <span className="meta">Period:</span>
          {PRESETS.map(([k, label]) => (
            <button key={k} type="button" className={"btn " + (preset && preset[0] === k ? "primary" : "ghost")} onClick={() => setFilters((f) => ({ ...f, ...presetRange(k), date: "" }))}>
              {label}
            </button>
          ))}
          {filters.from || filters.to ? (
            <button type="button" className="btn ghost" onClick={() => setFilters((f) => ({ ...f, from: "", to: "" }))}>
              All time
            </button>
          ) : null}
          {!preset && (filters.from || filters.to) ? <span className="meta">{(filters.from || "…") + " to " + (filters.to || "…")}</span> : null}
          {kind === "ops" ? <span className="meta">Daily ops shows the last day of the period.</span> : null}
        </div>
      ) : null}
      <div className="toolbar">
        <button className={"btn " + (showFilters ? "primary" : "ghost")} type="button" onClick={() => setShowFilters(!showFilters)}>
          ⚲ Filters{active ? " (" + active + ")" : ""}
        </button>
        {active ? (
          <button className="btn ghost" type="button" onClick={() => setFilters({})}>
            Clear filters
          </button>
        ) : null}
        <span className="spacer" />
        {loading ? <span className="meta">Loading…</span> : null}
        <button className="btn ghost" type="button" disabled={loading} onClick={load}>
          ↻ Refresh
        </button>
        {board && board.canExport ? (
          <button className="btn ghost" type="button" onClick={exportCsv}>
            ⤓ Export CSV
          </button>
        ) : null}
      </div>
      {showFilters ? (
        <div className="card">
          <div className="grid3">
            <Pick label="Project" value={filters.projectId} onChange={(v) => set("projectId", v)} options={((board && board.projects) || []).map((p) => [p._id, p.name])} />
            <Pick label="Franchise tree" value={filters.franchiseId} onChange={(v) => set("franchiseId", v)} options={franchises.map((f) => [f._id, f.name + " (" + f.layer + ")"])} />
            <Pick label="City" value={filters.city} onChange={(v) => set("city", v)} options={[...new Set(atms.map((a) => a.city).filter(Boolean))].sort()} />
            <Pick label="Region" value={filters.region} onChange={(v) => set("region", v)} options={[...new Set([...(o.region || []), ...atms.map((a) => a.region)].filter(Boolean))].sort()} />
            <Pick label="Client (bank)" value={filters.client} onChange={(v) => set("client", v)} options={[...new Set(atms.map((a) => a.bankName).filter(Boolean))].sort()} />
            <Pick label="ATM" value={filters.atmId} onChange={(v) => set("atmId", v)} options={atms.map((a) => a.atmId)} />
            {board && board.teams && board.teams.length ? <Pick label="Team" value={filters.team} onChange={(v) => set("team", v)} options={board.teams} /> : null}
            {["overview", "complaints", "tasks"].includes(kind) ? (
              <>
                <label>
                  From
                  <input type="date" value={filters.from || ""} onChange={(e) => set("from", e.target.value)} />
                </label>
                <label>
                  To
                  <input type="date" value={filters.to || ""} onChange={(e) => set("to", e.target.value)} />
                </label>
              </>
            ) : null}
            {kind === "complaints" ? (
              <>
                <Pick label="State" value={filters.state} onChange={(v) => set("state", v)} options={o.state || []} />
                <Pick label="SSM" value={filters.ssm} onChange={(v) => set("ssm", v)} options={o.ssm || []} />
                <Pick label="RM" value={filters.rm} onChange={(v) => set("rm", v)} options={o.rm || []} />
                <Pick label="Owner" value={filters.ownerUserId} onChange={(v) => set("ownerUserId", v)} options={(o.owner || []).map((x) => [x.id, x.name])} />
                <Pick label="Category" value={filters.category} onChange={(v) => set("category", v)} options={o.category || []} />
              </>
            ) : null}
            {kind === "ops" ? (
              <label>
                Date
                <input type="date" value={filters.date || (board && board.date) || ""} onChange={(e) => set("date", e.target.value)} />
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
      {failed && !board ? <div className="card empty">This dashboard could not load: {failed}</div> : null}
      {board ? (
        <>
          <div className="kpis">
            {Object.entries(board.totals).map(([k, v], i) =>
              drill[k] ? (
                <button key={k} type="button" className="kpi clickable" style={{ "--k": COLORS[i % COLORS.length] }} title="Open the list behind this number" onClick={() => go(drill[k])}>
                  <div className="l">{humanize(k)} ›</div>
                  <div className="v">{fmt(v)}</div>
                </button>
              ) : (
                <div key={k} className="kpi" style={{ "--k": COLORS[i % COLORS.length] }}>
                  <div className="l">{humanize(k)}</div>
                  <div className="v">{fmt(v)}</div>
                </div>
              )
            )}
          </div>
          {board.insights.length ? (
            <div className="card insights">
              <h4>Insights</h4>
              <ul>
                {board.insights.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {board.trends && board.trends.length ? (
            <div className="row">
              {board.trends.map((t) => (
                <Chart key={t.title} {...t} />
              ))}
            </div>
          ) : null}
          <div className="row">
            {Object.entries(board.breakdowns).filter(([, rows]) => rows && rows.length).map(([title, rows], bi) => {
              const max = Math.max(1, ...rows.map((r) => Number(r.n) || 0));
              const color = COLORS[bi % COLORS.length];
              return (
                <div className="card" key={title} style={{ minWidth: 220 }}>
                  <h4>
                    {title}
                    {drill[title] ? (
                      <button type="button" className="btn ghost sm" style={{ marginLeft: 8 }} onClick={() => go(drill[title])}>
                        Open list ›
                      </button>
                    ) : null}
                  </h4>
                  <table>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.key}>
                          <td>{/status|stage|result|health/i.test(title) ? <StatusBadge value={r.key} /> : r.key}</td>
                          <td className="barcell">
                            <span className="minibar" style={{ width: ((Number(r.n) || 0) / max) * 100 + "%", background: color }} />
                            <b>{fmt(r.n)}</b>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
          <div className="card">
            <h3>{board.listTitle}</h3>
            {board.list.length ? (
              <table>
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th key={c}>{humanize(c)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {board.list.map((r, i) => (
                    <tr key={i} className={r._link ? "clickable" : undefined} title={r._link ? "Open record" : undefined} onClick={r._link ? () => go(r._link) : undefined}>
                      {cols.map((c) => (
                        <td key={c}>{/status|stage|priority|result|health/i.test(c) ? <StatusBadge value={fmt(r[c])} /> : fmt(r[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty">Nothing here.</p>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
