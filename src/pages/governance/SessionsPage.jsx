import { useEffect, useState } from "react";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { qs, when } from "./auditHelpers.jsx";
import { api } from "../../services/api.js";

const END_TONE = (r) => (/timeout|expired|forced|revoked/i.test(r || "") ? "warn" : /logout/i.test(r || "") ? "good" : r ? "info" : "none");

export function SessionsPage({ user, setError }) {
  const canAll = user.officeAdmin || user.hierarchy === "Director";
  const [filters, setFilters] = useState({});
  const [data, setData] = useState({ rows: [] });
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api("/api/analytics/sessions?" + qs({ ...filters, view: canAll ? "" : "mine" }))
      .then(setData)
      .catch((err) => setError(err.message));
  }, [filters]);

  async function open(row) {
    try {
      const r = await api("/api/analytics/sessions/" + row.userId);
      setDetail({ row, sessions: r.sessions, canRevoke: r.canRevoke });
    } catch (err) {
      setError(err.message);
    }
  }

  async function revoke(s) {
    if (!window.confirm("End this session now? The user is signed out on their next click.")) return;
    try {
      await api("/api/analytics/sessions/" + s.id, { method: "DELETE" });
      await open(detail.row);
      setFilters({ ...filters });
    } catch (err) {
      setError(err.message);
    }
  }

  const rows = data.rows.filter((r) => !q || [r.name, r.login, r.role].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()));
  const tot = (k) => data.rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  return (
    <>
      <div className="kpis">
        {[
          ["Users", data.rows.length, "#475569"],
          ["Logins", tot("logins"), "#059669"],
          ["Failed logins", tot("failures"), "#e11d48"],
          ["Timeouts", tot("timeouts"), "#d97706"],
          ["Open sessions", tot("openSessions"), "#2563eb"],
          ["Tasks done", tot("tasksCompleted"), "#7c3aed"],
        ].map(([l, v, c]) => (
          <div key={l} className="kpi" style={{ "--k": c }}>
            <div className="l">{l}</div>
            <div className="v">{v}</div>
          </div>
        ))}
      </div>
      <div className="card table-scroll">
        <div className="toolbar">
          <input style={{ width: 220 }} placeholder="Search user, login, role" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="inline">
            From
            <input type="date" value={filters.from || ""} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </label>
          <label className="inline">
            To
            <input type="date" value={filters.to || ""} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </label>
          <span className="meta">Default range is the last 30 days.</span>
        </div>
        {data.note ? <p className="meta">{data.note}</p> : null}
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Logins</th>
              <th>Failed</th>
              <th>Logouts</th>
              <th>Timeouts</th>
              <th>Open</th>
              <th>Total min</th>
              <th>Avg min</th>
              <th>Last login</th>
              <th>Last logout</th>
              <th>Last IP</th>
              <th>Work events</th>
              <th>Ticket actions</th>
              <th>Tasks done</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>
                  <strong>{r.name}</strong> <div className="meta">{r.login}</div>
                </td>
                <td>
                  <span className="badge">{r.role}</span>
                </td>
                <td className="ok">{r.logins}</td>
                <td>{r.failures ? <StatusBadge value={String(r.failures)} tone="bad" /> : 0}</td>
                <td>{r.logouts}</td>
                <td>{r.timeouts ? <StatusBadge value={String(r.timeouts)} tone="warn" /> : 0}</td>
                <td>{r.openSessions ? <StatusBadge value={String(r.openSessions)} tone="info" /> : 0}</td>
                <td>{r.totalMinutes}</td>
                <td>{r.avgMinutes}</td>
                <td className="nowrap">{when(r.lastLogin)}</td>
                <td className="nowrap">{when(r.lastLogout)}</td>
                <td className="meta">{r.lastIp}</td>
                <td>{r.workEvents}</td>
                <td>{r.ticketActions}</td>
                <td>{r.tasksCompleted}</td>
                <td>
                  <button className="btn ghost" type="button" onClick={() => open(r)}>
                    Sessions ›
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={16} className="empty">
                  No activity in this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Modal open={!!detail} size="lg" title={detail ? "Sessions · " + detail.row.name : ""} subtitle={detail ? detail.row.login + " · " + detail.row.role : ""} onClose={() => setDetail(null)}>
        {detail ? (
          <table>
            <thead>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>How it ended</th>
                <th>Minutes</th>
                <th>IP</th>
                <th>Device</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {detail.sessions.map((s, i) => (
                <tr key={s.id || i}>
                  <td className="nowrap">{when(s.startAt)}</td>
                  <td className="nowrap">{when(s.endAt)}</td>
                  <td>
                    {s.endReason && s.endReason !== "Open" ? <StatusBadge value={s.endReason} tone={END_TONE(s.endReason)} /> : <StatusBadge value="Open" tone="info" />}
                    {s.current ? <span className="badge good">this browser</span> : null}
                  </td>
                  <td>{s.minutes}</td>
                  <td className="meta">{s.ip}</td>
                  <td className="meta">{(s.device || "").slice(0, 40)}</td>
                  <td>
                    {detail.canRevoke && !s.endAt && !s.current ? (
                      <button className="btn bad sm" type="button" onClick={() => revoke(s)}>
                        ⏻ Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!detail.sessions.length ? (
                <tr>
                  <td colSpan={7} className="empty">
                    No sessions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        ) : null}
      </Modal>
    </>
  );
}
