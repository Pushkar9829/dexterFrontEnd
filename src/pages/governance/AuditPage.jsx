import { useEffect, useState } from "react";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Pick, qs, when } from "./auditHelpers.jsx";
import { api, downloadB64 } from "../../services/api.js";

const eventTone = (e) =>
  /fail|denied|locked|delet|reject|purge|breach|blocked/i.test(e) ? "bad" : /login|created|approv|verif|enabled/i.test(e) ? "good" : /change|update|edit|reset|moved|reassign/i.test(e) ? "warn" : "info";

const SECURITY_EVENTS = "LoginFailure,LoginLocked,LoginUnlocked,SessionExpiry,SessionRevoked,PasswordReset,MfaEnrolled,MfaRemoved,MfaPolicyChanged,RecoveryCodeUsed,RecoveryCodesIssued,UserDeactivated,UserActivated,CompanySwitched";
const PRESETS = [
  ["Security events", () => ({ event: SECURITY_EVENTS })],
  ["Failed logins today", () => ({ event: "LoginFailure,LoginLocked", from: new Date().toLocaleDateString("en-CA") })],
  ["Sessions ended by admin", () => ({ event: "SessionRevoked,LoginUnlocked" })],
];
const show = (v) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

function Diff({ before, after }) {
  const b = before && typeof before === "object" ? before : {};
  const a = after && typeof after === "object" ? after : {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => k !== "updatedAt");
  if (!keys.length) return <p className="meta">No field changes recorded.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Before</th>
          <th>After</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => {
          const changed = show(b[k]) !== show(a[k]);
          return (
            <tr key={k} className={changed ? "flag" : ""}>
              <td>
                <strong>{k}</strong>
              </td>
              <td className="meta" style={{ wordBreak: "break-word" }}>{k in b ? show(b[k]) : "—"}</td>
              <td style={{ wordBreak: "break-word" }}>{k in a ? show(a[k]) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function AuditPage({ setError, setNotice }) {
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ events: [], total: 0, pageSize: 100 });
  const [settings, setSettings] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);
  const [openEv, setOpenEv] = useState(null);
  const set = (k, v) => {
    setPage(1);
    setFilters((x) => ({ ...x, [k]: v }));
  };

  useEffect(() => {
    api("/api/audit/meta")
      .then((m) => {
        setMeta(m);
        setSettings({ retentionDays: m.policy.retentionDays, hideIpFromNonAdmin: m.policy.hideIpFromNonAdmin, purgeEnabled: !!m.policy.purgeEnabled });
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    api("/api/audit?" + qs({ ...filters, page, pageSize: 100 }))
      .then(setData)
      .catch((err) => setError(err.message));
  }, [filters, page]);

  async function exportCsv() {
    try {
      const r = await api("/api/audit/export?" + qs(filters));
      downloadB64(r.fileName, "text/csv", btoa(unescape(encodeURIComponent(r.csv))));
      if (r.truncated) setNotice("Export capped at " + r.rows + " rows; narrow the date range for the rest.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveSettings() {
    try {
      await api("/api/audit/settings", { method: "PATCH", body: JSON.stringify({ retentionDays: Number(settings.retentionDays), hideIpFromNonAdmin: settings.hideIpFromNonAdmin, purgeEnabled: !!settings.purgeEnabled }) });
      setNotice("Audit settings saved");
      setShowPolicy(false);
    } catch (err) {
      setError(err.message);
    }
  }

  const m = meta || { events: [], modules: [], users: [], companies: [] };
  const pages = Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || 100)));
  const coName = new Map(m.companies.map((c) => [String(c._id), c.code || c.name]));
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const allCo = filters.companyId === "all";

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <button className={"btn " + (showFilters ? "info" : "ghost")} type="button" onClick={() => setShowFilters(!showFilters)}>
            ⚲ Filters{activeFilters ? " (" + activeFilters + ")" : ""}
          </button>
          {activeFilters ? (
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setPage(1);
                setFilters({});
              }}
            >
              Clear
            </button>
          ) : null}
          <span className="meta">
            <strong>{data.total}</strong> events
          </span>
          {data.ipMasked ? <StatusBadge value="IP masked by policy" tone="warn" /> : null}
          <span className="spacer" />
          {m.canExport ? (
            <button className="btn ghost" type="button" onClick={exportCsv}>
              ⤓ Export CSV
            </button>
          ) : null}
          {m.canSettings && settings ? (
            <button className="btn ghost" type="button" onClick={() => setShowPolicy(true)}>
              ⚙ Audit policy
            </button>
          ) : null}
        </div>
        <div className="chips">
          {PRESETS.map(([label, make]) => {
            const p = make();
            const on = Object.keys(p).every((k) => filters[k] === p[k]);
            return (
              <button
                key={label}
                type="button"
                className={"badge " + (on ? "info" : "")}
                onClick={() => {
                  setPage(1);
                  setFilters(on ? {} : p);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {showFilters ? (
          <div className="grid2 section">
            <label>
              From
              <input type="date" value={filters.from || ""} onChange={(e) => set("from", e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={filters.to || ""} onChange={(e) => set("to", e.target.value)} />
            </label>
            {m.crossCompany ? (
              <Pick label="Company" value={filters.companyId} onChange={(v) => set("companyId", v)} all="Active company" options={[["all", "All granted companies"], ...m.companies.map((c) => [c._id, c.name])]} />
            ) : null}
            <Pick label="User" value={filters.userId} onChange={(v) => set("userId", v)} options={m.users.map((u) => [u._id, u.name + " (" + u.login + ")"])} />
            <Pick label="Module" value={filters.module} onChange={(v) => set("module", v)} options={m.modules} />
            <Pick label="Event" value={filters.event && filters.event.includes(",") ? "" : filters.event} onChange={(v) => set("event", v)} options={m.events} />
            <label>
              Record ID
              <input value={filters.recordId || ""} placeholder="24-char id from a record" onChange={(e) => set("recordId", e.target.value.trim())} />
            </label>
            <label>
              Search work
              <input value={filters.q || ""} onChange={(e) => set("q", e.target.value)} />
            </label>
          </div>
        ) : null}
        <table className="stack">
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>User</th>
              {allCo ? <th>Company</th> : null}
              <th>Module</th>
              <th>IP</th>
              <th>Device</th>
              <th>Work</th>
              <th>Record</th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((ev) => (
              <tr key={ev._id} style={{ cursor: "pointer" }} onClick={() => setOpenEv(ev)}>
                <td className="nowrap" data-label="When">
                  {when(ev.at)}
                </td>
                <td data-label="Event">
                  <StatusBadge value={ev.event} tone={eventTone(ev.event)} />
                </td>
                <td data-label="User">
                  <strong>{ev.login || ""}</strong>
                </td>
                {allCo ? <td data-label="Company">{coName.get(String(ev.companyId)) || ""}</td> : null}
                <td className="nowrap" data-label="Module">
                  {ev.module ? <span className="badge">{ev.module}</span> : null}
                </td>
                <td className="meta" data-label="IP">
                  {ev.ip}
                </td>
                <td className="meta" data-label="Device">
                  {(ev.device || "").slice(0, 40)}
                </td>
                <td data-label="Work">
                  {ev.work}
                  {ev.before || ev.after ? <span className="badge info">Δ diff</span> : null}
                </td>
                <td data-label="Record">
                  {ev.recordId ? (
                    <button
                      className="btn ghost sm"
                      type="button"
                      title="Show the full history of this record"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPage(1);
                        setFilters({ recordId: String(ev.recordId) });
                      }}
                    >
                      ⌕ …{String(ev.recordId).slice(-6)}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!data.events.length ? (
              <tr>
                <td colSpan={allCo ? 9 : 8} className="empty">
                  No events for these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="toolbar" style={{ marginTop: 8 }}>
          <span className="spacer" />
          <button className="btn ghost" type="button" disabled={page <= 1} onClick={() => setPage(1)}>
            « First
          </button>
          <button className="btn ghost" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ‹ Prev
          </button>
          <span className="meta">
            Page {page} of {pages}
          </span>
          <button className="btn ghost" type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next ›
          </button>
          <button className="btn ghost" type="button" disabled={page >= pages} onClick={() => setPage(pages)}>
            Last »
          </button>
        </div>
      </div>

      <Modal open={!!openEv} size="lg" title="Audit event" subtitle={openEv ? when(openEv.at) : ""} onClose={() => setOpenEv(null)}>
        {openEv ? (
          <div className="grid2">
            {[
              ["Event", <StatusBadge key="e" value={openEv.event} tone={eventTone(openEv.event)} />],
              ["User", openEv.login],
              ["Module", openEv.module],
              ["Company", coName.get(String(openEv.companyId)) || ""],
              ["IP", openEv.ip],
              ["Device", openEv.device],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="meta">{k}</div>
                <div style={{ wordBreak: "break-word" }}>{v || "—"}</div>
              </div>
            ))}
            <div className="span-all">
              <div className="meta">Work</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{openEv.work || "—"}</div>
            </div>
            {openEv.recordId ? (
              <div className="span-all">
                <div className="meta">Record</div>
                <code>{String(openEv.recordId)}</code>{" "}
                <button
                  className="btn ghost sm"
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setFilters({ recordId: String(openEv.recordId) });
                    setOpenEv(null);
                  }}
                >
                  Full history ›
                </button>
              </div>
            ) : null}
            {openEv.before || openEv.after ? (
              <div className="span-all">
                <div className="meta">Changes</div>
                <Diff before={openEv.before} after={openEv.after} />
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {m.canSettings && settings ? (
        <Modal
          open={showPolicy}
          size="md"
          title="Audit policy"
          onClose={() => setShowPolicy(false)}
          footer={
            <>
              <button className="btn ghost" type="button" onClick={() => setShowPolicy(false)}>
                Cancel
              </button>
              <button className="btn good" type="button" onClick={saveSettings}>
                Save policy
              </button>
            </>
          }
        >
          <label>
            Keep events for (days, minimum 30)
            <input type="number" min="30" value={settings.retentionDays} onChange={(e) => setSettings({ ...settings, retentionDays: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={settings.hideIpFromNonAdmin} onChange={(e) => setSettings({ ...settings, hideIpFromNonAdmin: e.target.checked })} /> Hide IP from non-Admin viewers
          </label>
          <label className="check">
            <input type="checkbox" checked={!!settings.purgeEnabled} onChange={(e) => setSettings({ ...settings, purgeEnabled: e.target.checked })} /> Purge old events (archived to a file on the server first; off = keep forever)
          </label>
        </Modal>
      ) : null}
    </>
  );
}
