import { useEffect, useState } from "react";
import { Modal } from "../../../components/common/Modal.jsx";
import { StatusBadge } from "../../../components/common/StatusBadge.jsx";
import { Tabs } from "../../../components/common/Tabs.jsx";
import { Compose, FileLinks, MailTable, send, useMailActions, when } from "./mailShared.jsx";
import { api, downloadB64, fileToB64 } from "../../../services/api.js";
import { can, isAdminLayer } from "../../../utils/perm.js";
import { humanize } from "../../../utils/format.js";

function Inbound({ onDone, setError, setNotice }) {
  const blank = { from: "", messageId: "", inReplyTo: "", references: "", subject: "", body: "", docket: "", atmId: "", createTask: false };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function submit() {
    setBusy(true);
    try {
      const r = await send("/api/mail/inbound", "POST", f);
      setNotice(r.mapped ? "Reply mapped to " + r.docketNumber + " (" + r.mappedBy + ")" + (r.task ? " · task " + r.task : "") : "Saved as unmapped — map it by docket in the Unmapped tab");
      setF(blank);
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn primary" type="button" onClick={() => setOpen(true)}>
        + Record received mail
      </button>
      <Modal
        open={open}
        size="lg"
        title="Record received mail"
        subtitle="Mapping order: Message-ID / In-Reply-To / References → docket number in subject or body → the only open ticket on the ATM. Subject alone never maps."
        onClose={() => !busy && setOpen(false)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn good" type="button" disabled={busy} onClick={submit}>
              Save received mail
            </button>
          </>
        }
      >
        <div className="grid2">
          {[
            ["from", "From"],
            ["subject", "Subject"],
            ["docket", "Docket (if known)"],
            ["atmId", "ATM ID (if known)"],
            ["messageId", "Message-ID"],
            ["inReplyTo", "In-Reply-To"],
            ["references", "References (space separated)"],
          ].map(([k, l]) => (
            <label key={k}>
              {l}
              <input value={f[k]} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
        </div>
        <label>
          Body
          <textarea rows={5} value={f.body} onChange={(e) => set("body", e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={f.createTask} onChange={(e) => set("createTask", e.target.checked)} /> Create a task from this mail (when mapped)
        </label>
      </Modal>
    </>
  );
}

function Trackers({ meta, franchiseUser, canExport, setError, setNotice }) {
  const [variant, setVariant] = useState("complaint");
  const [month, setMonth] = useState(meta.month);
  const [data, setData] = useState({ rows: [], manual: false });
  const [row, setRow] = useState(null);
  const [editId, setEditId] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const v = meta.variants.find((x) => x.key === variant);

  async function load() {
    try {
      setData(await api("/api/mail/tracker/" + variant + "?month=" + month));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
    setRow(null);
    setEditId("");
  }, [variant, month]);

  async function exportCsv() {
    try {
      const r = await api("/api/mail/tracker/" + variant + "?csv=1&month=" + month);
      downloadB64(r.fileName, "text/csv", btoa(unescape(encodeURIComponent(r.csv))));
    } catch (err) {
      setError(err.message);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const body = { ...row, month };
      if (file) body.file = { fileName: file.name, mime: file.type, data: await fileToB64(file) };
      if (editId) await send("/api/mail/tracker-row/" + editId, "PATCH", body);
      else await send("/api/mail/tracker/" + variant, "POST", body);
      setNotice("Tracker row saved");
      setRow(null);
      setEditId("");
      setFile(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const cols = data.rows.length ? Object.keys(data.rows[0]).filter((k) => k !== "_id" && k !== "files") : v && v.fields ? v.fields : [];
  const statusCol = (k) => /status|result/i.test(k);
  return (
    <div className="card">
      <Tabs tabs={meta.variants.map((x) => [x.key, x.label])} value={variant} onChange={setVariant} />
      <div className="toolbar">
        <label className="inline">
          Month
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        {!data.manual ? <StatusBadge value="Auto-filled from mail and tickets" tone="info" /> : <StatusBadge value="Manual tracker" tone="warn" />}
        <span className="meta">{data.rows.length} rows</span>
        <span className="spacer" />
        {!franchiseUser && canExport ? (
          <button className="btn ghost" type="button" onClick={exportCsv}>
            ⤓ Export CSV
          </button>
        ) : null}
        {data.manual && meta.desk ? (
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setEditId("");
              setFile(null);
              setRow({});
            }}
          >
            + Add row
          </button>
        ) : null}
      </div>
      <table>
        <thead>
          <tr>
            {cols.map((k) => (
              <th key={k}>{humanize(k)}</th>
            ))}
            {data.manual ? <th>Files</th> : null}
            {data.manual && meta.desk ? <th></th> : null}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r._id || i} className={r.status === "Expired" ? "flag" : ""}>
              {cols.map((k) => {
                const val = String(r[k] === undefined || r[k] === null ? "" : r[k]);
                return <td key={k}>{statusCol(k) && val ? <StatusBadge value={val} /> : val}</td>;
              })}
              {data.manual ? (
                <td>
                  <FileLinks files={r.files} setError={setError} />
                </td>
              ) : null}
              {data.manual && meta.desk ? (
                <td>
                  {r._id ? (
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setEditId(r._id);
                        setFile(null);
                        setRow(Object.fromEntries(v.fields.map((k) => [k, r[k] === undefined ? "" : String(r[k])])));
                      }}
                    >
                      ✎ Edit
                    </button>
                  ) : (
                    <span className="meta">from ticket</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
          {!data.rows.length ? (
            <tr>
              <td colSpan={cols.length + 2} className="empty">
                No rows for this month.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <Modal
        open={!!row && !!v}
        size={v && v.fields && v.fields.length > 8 ? "lg" : "md"}
        title={(editId ? "Edit row" : "Add row") + (v ? " · " + v.label : "")}
        subtitle={"Month " + month}
        onClose={() => !busy && setRow(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setRow(null)}>
              Cancel
            </button>
            <button className="btn good" type="button" disabled={busy} onClick={save}>
              Save row
            </button>
          </>
        }
      >
        {row && v ? (
          <>
            <div className="grid2">
              {v.fields.map((k) => (
                <label key={k}>
                  {humanize(k)}
                  <input type={k === "pvcDate" || k === "expiry" ? "date" : "text"} value={row[k] || ""} onChange={(e) => setRow({ ...row, [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <label>
              File
              <input type="file" onChange={(e) => setFile(e.target.files && e.target.files[0])} />
            </label>
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function Templates({ meta, reload, setError, setNotice }) {
  const [drafts, setDrafts] = useState(() => Object.fromEntries(meta.templates.map((t) => [t.key, { name: t.name, subject: t.subject, body: t.body }])));
  const [sig, setSig] = useState(meta.signature);
  const [pick, setPick] = useState(meta.templates.length ? meta.templates[0].key : "__sig");
  async function save(key) {
    try {
      await send("/api/mail/templates/" + key, "PUT", drafts[key]);
      setNotice("Template saved");
      reload();
    } catch (err) {
      setError(err.message);
    }
  }
  async function saveSig() {
    try {
      await send("/api/mail/signature", "PUT", { signature: sig });
      setNotice("Signature saved");
      reload();
    } catch (err) {
      setError(err.message);
    }
  }
  const d = drafts[pick];
  const set = (k, val) => setDrafts({ ...drafts, [pick]: { ...d, [k]: val } });
  return (
    <div className="card">
      <Tabs tabs={[...meta.templates.map((t) => [t.key, drafts[t.key].name || t.key]), ["__sig", "✍ Signature"]]} value={pick} onChange={setPick} />
      <p className="meta">Placeholders: {"{{docket}} {{atmId}} {{franchise}} {{status}} {{subject}} {{siteId}} {{city}} {{today}}"}</p>
      {pick === "__sig" ? (
        <>
          <label>
            Signature
            <textarea rows={4} value={sig} onChange={(e) => setSig(e.target.value)} />
          </label>
          <button className="btn primary" type="button" onClick={saveSig}>
            Save signature
          </button>
        </>
      ) : d ? (
        <>
          <div className="grid2">
            <label>
              Name
              <input value={d.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label>
              Subject
              <input value={d.subject} onChange={(e) => set("subject", e.target.value)} />
            </label>
          </div>
          <label>
            Body
            <textarea rows={8} value={d.body} onChange={(e) => set("body", e.target.value)} />
          </label>
          <div className="toolbar">
            <span className="meta">Key: {pick}</span>
            <span className="spacer" />
            <button className="btn primary" type="button" onClick={() => save(pick)}>
              Save template
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Mailbox({ meta, reload, setError, setNotice }) {
  const [address, setAddress] = useState(meta.mailbox ? meta.mailbox.address : "");
  async function save(addr) {
    try {
      await send("/api/mail/mailbox", "POST", { address: addr });
      setNotice(addr ? "Mailbox connected" : "Mailbox disconnected");
      reload();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h3>
        My mailbox <StatusBadge value={meta.mailbox ? "Connected" : "Not connected"} tone={meta.mailbox ? "good" : "warn"} />
      </h3>
      <p className="meta">
        Transport: <StatusBadge value={meta.transport} tone={meta.transport === "smtp" ? "good" : "warn"} />{" "}
        {meta.transport === "demo" ? "Demo transport marks mail Sent without delivering it; addresses ending .invalid fail so Retry can be tried." : meta.transport === "none" ? "No gateway is connected; sent mail stays Queued." : ""} Passwords are never stored.
      </p>
      <label>
        Address
        <input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <div className="actions-cell" style={{ marginTop: 8 }}>
        <button className="btn good" type="button" onClick={() => save(address.trim())}>
          Connect
        </button>
        {meta.mailbox ? (
          <button className="btn bad" type="button" onClick={() => save("")}>
            Disconnect
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MailPage({ user, atms, setError, setNotice }) {
  const franchiseUser = ["Franchise", "MasterFranchise", "SuperMasterFranchise"].includes(user.hierarchy);
  const [meta, setMeta] = useState(null);
  const [tab, setTab] = useState(franchiseUser ? "Mail" : "Outbox");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [mapTo, setMapTo] = useState({});
  const [ticketAtm, setTicketAtm] = useState({});
  const [ticketType, setTicketType] = useState({});

  async function loadMeta() {
    try {
      setMeta(await api("/api/mail/meta"));
    } catch (err) {
      setError(err.message);
    }
  }
  async function loadRows() {
    try {
      const q = tab === "Unmapped" ? "unmapped=1" : tab === "Inbox" ? "direction=in" : tab === "Outbox" ? "direction=out" : "";
      setRows((await api("/api/mail?" + q + (status ? "&status=" + encodeURIComponent(status) : ""))).rows);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    loadMeta();
  }, []);
  useEffect(() => {
    if (["Outbox", "Inbox", "Unmapped", "Mail"].includes(tab)) loadRows();
  }, [tab, status]);
  const onAction = useMailActions(loadRows, setError, setNotice);

  async function map(m) {
    try {
      await send("/api/mail/" + m._id + "/map", "PATCH", { docketNumber: mapTo[m._id] });
      setNotice("Mapped");
      loadRows();
    } catch (err) {
      setError(err.message);
    }
  }
  async function toTicket(m) {
    try {
      const r = await send("/api/mail/" + m._id + "/ticket", "POST", { atmId: ticketAtm[m._id] || m.atmId, problemType: ticketType[m._id] });
      setNotice("Ticket " + r.docketNumber + " raised from mail");
      loadRows();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!meta) return null;
  const tabs = franchiseUser ? ["Mail", "Trackers"] : ["Outbox", ...(meta.desk ? ["Inbox", "Unmapped"] : []), "Trackers", ...(meta.admin ? ["Templates"] : []), "Mailbox"];
  const icons = { Outbox: "↑ ", Inbox: "↓ ", Unmapped: "⚠ ", Trackers: "▦ ", Templates: "✎ ", Mailbox: "⚙ ", Mail: "✉ " };
  const statusOptions = franchiseUser ? ["Sent", "Reply Received"] : [...meta.statuses, ...(meta.replyStates || [])];
  return (
    <>
      <Tabs tabs={tabs.map((x) => [x, icons[x] + x])} value={tab} onChange={setTab} />
      {meta.transport !== "smtp" ? (
        <p className="meta">
          <StatusBadge value={meta.transport === "demo" ? "Demo delivery" : "No gateway"} tone="warn" /> {meta.transport === "demo" ? "Mail is marked Sent but not delivered." : "Mail stays Queued until a gateway is connected."}
        </p>
      ) : null}
      {["Outbox", "Inbox", "Mail"].includes(tab) ? (
        <div className="card">
          <div className="toolbar">
            <div className="chips">
              {["", ...statusOptions].map((s) => (
                <button key={s || "all"} type="button" className={"chip" + (status === s ? " active" : "")} onClick={() => setStatus(s)}>
                  {s || "All"}
                </button>
              ))}
            </div>
            <span className="spacer" />
            {tab === "Outbox" && meta.desk && meta.canCompose ? <Compose meta={meta} atms={atms} onDone={loadRows} setError={setError} setNotice={setNotice} /> : null}
            {tab === "Inbox" ? <Inbound onDone={loadRows} setError={setError} setNotice={setNotice} /> : null}
          </div>
          <MailTable rows={rows} desk={meta.desk} franchiseUser={franchiseUser} onAction={onAction} setError={setError} meta={meta} />
        </div>
      ) : null}
      {tab === "Unmapped" ? (
        <div className="card">
          <table className="stack">
            <thead>
              <tr>
                <th>Received</th>
                <th>From / subject</th>
                <th>Map to docket</th>
                <th>Or raise a ticket</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m._id}>
                  <td className="nowrap" data-label="Received">
                    {when(m.receivedAt)}
                  </td>
                  <td data-label="From / subject">
                    <div className="meta">{m.from}</div>
                    <strong>{m.subject}</strong>
                    <div className="meta" style={{ whiteSpace: "pre-wrap" }}>
                      {String(m.body || "").slice(0, 600)}
                    </div>
                  </td>
                  <td data-label="Map to docket">
                    <div className="actions-cell">
                      <input placeholder="Docket number" value={mapTo[m._id] || ""} onChange={(e) => setMapTo({ ...mapTo, [m._id]: e.target.value })} />
                      <button className="btn info" type="button" disabled={!mapTo[m._id]} onClick={() => map(m)}>
                        ⇢ Map
                      </button>
                    </div>
                  </td>
                  <td data-label="Raise ticket">
                    <div className="actions-cell">
                      <input placeholder="ATM ID" value={ticketAtm[m._id] || m.atmId || ""} onChange={(e) => setTicketAtm({ ...ticketAtm, [m._id]: e.target.value })} />
                      <select value={ticketType[m._id] || ""} onChange={(e) => setTicketType({ ...ticketType, [m._id]: e.target.value })}>
                        <option value="">Problem type</option>
                        {(meta.problemTypes || []).map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                      {meta.canCompose ? (
                        <button className="btn warn" type="button" onClick={() => toTicket(m)}>
                          + Ticket
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={4} className="empty">
                    Nothing unmapped.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
      {tab === "Trackers" ? <Trackers meta={meta} franchiseUser={franchiseUser} canExport={isAdminLayer(user) || can(user, "Export", "CRM-05")} setError={setError} setNotice={setNotice} /> : null}
      {tab === "Templates" ? <Templates key={meta.templates.map((t) => t.subject).join("|")} meta={meta} reload={loadMeta} setError={setError} setNotice={setNotice} /> : null}
      {tab === "Mailbox" ? <Mailbox meta={meta} reload={loadMeta} setError={setError} setNotice={setNotice} /> : null}
    </>
  );
}
