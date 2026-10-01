import { useEffect, useState } from "react";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { api, downloadB64 } from "../../services/api.js";
import { setFocus, takeFocus } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";
import { csvToB64, printReport } from "../../utils/report.js";

const MODULE_LABEL = { "CRM-02": "Onboarding / KYC", "CRM-03": "Projects", "CRM-04": "Operations & TXN", "CRM-05": "Service & complaints", "CRM-06": "Tasks", "CRM-07": "Analytics" };
const CARRY = ["from", "to", "region", "client", "team", "franchiseId"];

function fmt(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v.toLocaleString("en-IN");
  return String(v);
}

export function ReportListsPage({ franchises, setPage, allowedPages = [], setError, setNotice }) {
  const [meta, setMeta] = useState(null);
  const [kind, setKind] = useState("");
  const [filters, setFilters] = useState({});
  const [rep, setRep] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [subs, setSubs] = useState(null);
  const [sub, setSub] = useState({ frequency: "daily", format: "csv" });
  const set = (k, v) => setFilters((x) => ({ ...x, [k]: v }));
  const query = () =>
    Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k, v]) => "&" + k + "=" + encodeURIComponent(v))
      .join("");

  useEffect(() => {
    api("/api/report-lists/meta")
      .then((m) => {
        setMeta(m);
        const link = takeFocus("lists");
        if (link && m.kinds.some((k) => k.key === link.type)) {
          const carried = Object.fromEntries(CARRY.filter((k) => link[k]).map((k) => [k, link[k]]));
          setFilters({ month: link.from || link.to ? "" : m.month, ...carried });
          setShowFilters(Object.keys(carried).length > 0);
          setKind(link.type);
        } else {
          setFilters({ month: m.month });
          if (m.kinds.length) setKind(m.kinds[0].key);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!kind) return;
    api("/api/report-lists/" + kind + "?" + query())
      .then(setRep)
      .catch((err) => {
        setRep(null);
        setError(err.message);
      });
  }, [kind, filters]);

  async function loadSubs() {
    try {
      setSubs(await api("/api/report-lists/subscriptions"));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (showSubs && !subs) loadSubs();
  }, [showSubs]);

  async function download(type) {
    try {
      const r = await api("/api/report-lists/" + kind + "?" + type + "=1" + query());
      if (type === "xlsx") downloadB64(r.fileName, r.mime, r.data);
      else downloadB64(r.fileName, "text/csv", csvToB64(r.csv));
    } catch (err) {
      setError(err.message);
    }
  }

  async function subscribe() {
    try {
      const f = Object.fromEntries(["region", "client", "team", "franchiseId"].filter((k) => filters[k]).map((k) => [k, filters[k]]));
      await api("/api/report-lists/subscriptions", { method: "POST", body: JSON.stringify({ kind, frequency: sub.frequency, format: sub.format, filters: f }) });
      setNotice("Scheduled: you will get this report " + sub.frequency + " by email");
      loadSubs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function unsubscribe(id) {
    try {
      await api("/api/report-lists/subscriptions/" + id, { method: "DELETE" });
      loadSubs();
    } catch (err) {
      setError(err.message);
    }
  }

  function openRow(link) {
    if (!link || !setPage) return;
    if (!allowedPages.includes(link.page)) return setError("You don't have access to the " + humanize(link.page) + " page.");
    setFocus(link);
    setPage(link.page);
  }

  if (!meta) return null;
  const extra = CARRY.filter((k) => filters[k]).length;
  const groups = [...new Set(meta.kinds.map((k) => k.module || ""))];
  const pick = (k, label, list) => (
    <label>
      {label}
      <select value={filters[k] || ""} onChange={(e) => set(k, e.target.value)}>
        <option value="">All</option>
        {list.map((x) => (Array.isArray(x) ? <option key={x[0]} value={x[0]}>{x[1]}</option> : <option key={x}>{x}</option>))}
      </select>
    </label>
  );
  const linked = rep && rep.rows.some((r) => r._link);
  return (
    <>
      <div className="toolbar">
        <label className="inline">
          Report
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {groups.map((g) => (
              <optgroup key={g} label={MODULE_LABEL[g] || g || "Other"}>
                {meta.kinds
                  .filter((k) => (k.module || "") === g)
                  .map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="inline">
          Month
          <input type="month" value={filters.month || ""} onChange={(e) => setFilters((x) => ({ ...x, month: e.target.value, from: "", to: "" }))} />
        </label>
        <button className={"btn " + (showFilters ? "primary" : "ghost")} type="button" onClick={() => setShowFilters(!showFilters)}>
          ⚲ Filters{extra ? " (" + extra + ")" : ""}
        </button>
        <span className="spacer" />
        {rep && rep.canExport ? (
          <>
            <button className="btn ghost" type="button" onClick={() => download("csv")}>
              ⤓ CSV
            </button>
            <button className="btn ghost" type="button" onClick={() => download("xlsx")}>
              ⤓ Excel
            </button>
            <button className={"btn " + (showSubs ? "primary" : "ghost")} type="button" onClick={() => setShowSubs(!showSubs)}>
              ✉ Schedule
            </button>
          </>
        ) : null}
        <button className="btn ghost" type="button" onClick={printReport}>
          ⎙ Print / PDF
        </button>
      </div>
      {showFilters ? (
        <div className="card">
          <div className="grid3">
            <label>
              From
              <input type="date" value={filters.from || ""} onChange={(e) => set("from", e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={filters.to || ""} onChange={(e) => set("to", e.target.value)} />
            </label>
            {pick("region", "Region", meta.regions)}
            {pick("client", "Client (bank)", meta.clients)}
            {pick("team", "Team", meta.teams)}
            {franchises.length > 1 ? pick("franchiseId", "Franchise tree", franchises.map((f) => [f._id, f.name + " (" + f.layer + ")"])) : null}
          </div>
        </div>
      ) : null}
      {showSubs ? (
        <div className="card">
          <h3>Scheduled report mail</h3>
          <p className="meta">
            The report is built with your access and mailed as an attachment after 07:00 IST. Daily covers yesterday, weekly the last Monday–Sunday, monthly the last month. Region, client, team and franchise filters set above are saved with the subscription.
            {subs ? (subs.email ? " Sent to " + subs.email + "." : " Add an email address to your user profile first.") : ""}
          </p>
          <div className="toolbar">
            <label className="inline">
              Every
              <select value={sub.frequency} onChange={(e) => setSub({ ...sub, frequency: e.target.value })}>
                <option value="daily">Day</option>
                <option value="weekly">Week (Monday)</option>
                <option value="monthly">Month (1st)</option>
              </select>
            </label>
            <label className="inline">
              As
              <select value={sub.format} onChange={(e) => setSub({ ...sub, format: e.target.value })}>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
              </select>
            </label>
            <button className="btn primary" type="button" disabled={!subs || !subs.email} onClick={subscribe}>
              Subscribe to “{(meta.kinds.find((k) => k.key === kind) || {}).title}”
            </button>
          </div>
          {subs && subs.subscriptions.length ? (
            <table>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Every</th>
                  <th>Format</th>
                  <th>Filters</th>
                  <th>Last sent</th>
                  <th>State</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {subs.subscriptions.map((x) => (
                  <tr key={x._id}>
                    <td>{x.title}</td>
                    <td>{x.frequency}</td>
                    <td>{x.format.toUpperCase()}</td>
                    <td>{Object.entries(x.filters).map(([k, v]) => k + ": " + (k === "franchiseId" ? (franchises.find((f) => f._id === v) || {}).name || v : v)).join(" · ") || "—"}</td>
                    <td>{x.lastSentAt ? new Date(x.lastSentAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) + (x.lastRows !== null ? " · " + x.lastRows + " rows" : "") : "Not yet"}</td>
                    <td>{x.active ? (x.lastError ? <StatusBadge value="Error" /> : <StatusBadge value="Active" />) : <span title={x.pausedReason}><StatusBadge value="Paused" /> {x.pausedReason}</span>}</td>
                    <td>
                      <button className="btn ghost sm" type="button" onClick={() => unsubscribe(x._id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : subs ? (
            <p className="empty">No scheduled reports yet.</p>
          ) : null}
        </div>
      ) : null}
      {rep ? (
        <div className="card print-area table-scroll">
          <h3>{rep.title}</h3>
          {rep.note ? <p className="meta">{rep.note}</p> : null}
          {linked ? <p className="meta">Click a row to open the record.</p> : null}
          {rep.rows.length ? (
            <table>
              <thead>
                <tr>
                  {rep.columns.map((c) => (
                    <th key={c}>{(rep.labels && rep.labels[c]) || humanize(c)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rep.rows.map((r, i) => (
                  <tr key={i} className={[r.eod === "Missing" ? "flag" : "", r._link ? "clickable" : "", r.group === "Total" || r.date === "Total" || r.bucket === "Total" ? "total" : ""].filter(Boolean).join(" ") || undefined} onClick={r._link ? () => openRow(r._link) : undefined}>
                    {rep.columns.map((c) => (
                      <td key={c}>{/status|^eod$|result|lifecycle|^band$|^label$/i.test(c) && typeof r[c] === "string" && r[c] ? <StatusBadge value={r[c]} /> : fmt(r[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty">No rows for these filters.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
