import { useState } from "react";
import { askConfirm, askText } from "../../../components/common/Dialogs.jsx";
import { Modal } from "../../../components/common/Modal.jsx";
import { StatusBadge } from "../../../components/common/StatusBadge.jsx";
import { api, downloadB64, fileToB64 } from "../../../services/api.js";

export const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "");
export const send = (path, method, body) => api(path, { method, body: JSON.stringify(body || {}) });

const MAIL_TONE = { Sent: "good", Delivered: "good", "Reply Received": "info", Queued: "warn", Draft: "warn", Failed: "bad", Bounced: "bad", Discarded: "none", "Awaiting Reply": "warn", "No Reply": "bad" };

export async function download(id, setError) {
  try {
    const f = await api("/api/documents/" + id + "/file");
    downloadB64(f.fileName, f.mime, f.data);
  } catch (err) {
    setError(err.message);
  }
}

export function FileLinks({ files, setError }) {
  return (files || []).map((f) => (
    <button key={f._id} className="btn ghost sm" type="button" onClick={() => download(f._id, setError)}>
      📎 {f.fileName}
    </button>
  ));
}

export function MailRow({ m, desk, franchiseUser, onAction, setError, meta }) {
  const canDiscard = !meta || meta.canDiscardAny || String(m.createdBy) === meta.me;
  const incoming = m.direction === "in";
  async function reply() {
    const text = await askText("Reply to: " + m.subject, "", { title: "Reply", multiline: true, required: true, okLabel: "Send reply" });
    if (text) onAction(m, "reply", text);
  }
  return (
    <tr className={m.status === "Failed" || m.status === "Bounced" ? "flag" : ""}>
      <td className="nowrap" data-label="When">
        {when(m.sentAt || m.receivedAt || m.createdAt)}
      </td>
      <td data-label="Way">
        <StatusBadge value={incoming ? "↓ Received" : "↑ Sent"} tone={incoming ? "info" : "none"} />
      </td>
      <td data-label={incoming ? "From" : "To"}>
        {incoming ? m.from : (m.to || []).join(", ")}
        {m.cc && m.cc.length ? <div className="meta">CC {m.cc.join(", ")}</div> : null}
        {desk && m.bcc && m.bcc.length ? <div className="meta">BCC {m.bcc.join(", ")}</div> : null}
      </td>
      <td data-label="Subject">
        <strong>{m.subject}</strong>
        <div className="meta" style={{ whiteSpace: "pre-wrap" }}>
          {String(m.body || "").slice(0, 400)}
        </div>
        <FileLinks files={m.files} setError={setError} />
      </td>
      <td data-label="Status">
        <StatusBadge value={m.status} tone={MAIL_TONE[m.status]} />
        {m.replyState ? <StatusBadge value={m.replyState} tone={MAIL_TONE[m.replyState]} /> : null}
        {m.transport === "demo" ? <div className="meta">demo — not delivered</div> : null}
        {m.error ? <div className="err">{m.error}</div> : null}
        {m.mappedBy ? <div className="meta">mapped: {m.mappedBy}</div> : null}
        {!m.complaintId && m.autoTicketSkipped ? <div className="meta">no auto-ticket: {m.autoTicketSkipped}</div> : null}
      </td>
      <td>
        <div className="actions-cell">
          {m.status === "Draft" ? (
            <>
              <button className="btn good" type="button" onClick={() => onAction(m, "send")}>
                Send
              </button>
              {canDiscard ? (
                <button className="btn bad" type="button" onClick={() => onAction(m, "discard")}>
                  Discard
                </button>
              ) : null}
            </>
          ) : null}
          {m.status === "Failed" ? (
            <button className="btn warn" type="button" onClick={() => onAction(m, "retry")}>
              ↻ Retry ({m.retries || 0}/5)
            </button>
          ) : null}
          {desk && !franchiseUser && m.status === "Sent" && m.direction === "out" ? (
            <button className="btn ghost" type="button" title="Record a bounce notice for this mail" onClick={() => onAction(m, "bounce")}>
              Mark bounced
            </button>
          ) : null}
          {franchiseUser && m.direction === "out" && m.sentAt ? (
            <button className="btn info" type="button" onClick={reply}>
              ↩ Reply
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function MailTable({ rows, desk, franchiseUser, onAction, setError, meta }) {
  return (
    <table className="stack">
      <thead>
        <tr>
          <th>When</th>
          <th>Way</th>
          <th>To / from</th>
          <th>Subject</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <MailRow key={m._id} m={m} desk={desk} franchiseUser={franchiseUser} onAction={onAction} setError={setError} meta={meta} />
        ))}
        {!rows.length ? (
          <tr>
            <td colSpan={6} className="empty">
              No mail.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export function useMailActions(reload, setError, setNotice) {
  return async (m, action, text) => {
    try {
      if (action === "reply") await send("/api/mail/" + m._id + "/reply", "POST", { body: text });
      else {
        if (action === "discard" && !(await askConfirm("Discard this draft?", { danger: true, okLabel: "Discard" }))) return false;
        let reason;
        if (action === "bounce") {
          reason = await askText("Paste the bounce notice or reason", "", { title: "Mark bounced: " + m.subject, multiline: true, required: true, danger: true, okLabel: "Mark bounced" });
          if (!reason) return false;
        }
        const r = await send("/api/mail/" + m._id, "PATCH", { action, reason });
        if (action !== "bounce" && (r.status === "Failed" || r.status === "Bounced")) setError("Mail " + r.status.toLowerCase() + ": " + (r.error || "see mail row"));
        else if (r.note) setNotice(r.note);
      }
      setNotice(action === "reply" ? "Reply sent" : action === "discard" ? "Draft discarded" : "Mail " + action + " done");
      await reload();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };
}

const BLANK = { templateKey: "", to: "", cc: "", bcc: "", subject: "", body: "", atmId: "", attachmentIds: [] };

export function Compose({ meta, ticket, ticketFiles, atms, onDone, setError, setNotice, button = "✉ Compose", buttonClass = "btn primary" }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(BLANK);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function applyTemplate(key) {
    set("templateKey", key);
    if (!key) return;
    try {
      const r = await send("/api/mail/render", "POST", { templateKey: key, complaintId: ticket && ticket._id, atmId: f.atmId });
      setF((x) => ({ ...x, templateKey: key, subject: r.subject, body: r.body, to: x.to || r.to.join(", ") }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(draft) {
    setBusy(true);
    try {
      const body = { ...f, draft, complaintId: ticket && ticket._id };
      if (file) body.file = { fileName: file.name, mime: file.type, data: await fileToB64(file) };
      const r = await send("/api/mail", "POST", body);
      if (r.status === "Failed") setError("Mail failed: " + r.error + " — use Retry after fixing");
      else setNotice(draft ? "Draft saved" : r.status === "Queued" ? "Queued: " + (r.note || "") : "Mail sent");
      setF(BLANK);
      setFile(null);
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id) => set("attachmentIds", f.attachmentIds.includes(id) ? f.attachmentIds.filter((x) => x !== id) : [...f.attachmentIds, id]);

  return (
    <>
      <button className={buttonClass} type="button" onClick={() => setOpen(true)}>
        {button}
      </button>
      <Modal
        open={open}
        size="lg"
        title={"Compose" + (ticket ? " on docket " + ticket.docketNumber : "")}
        subtitle={meta.mailbox ? "From " + meta.mailbox.address : "Connect your mailbox (Mail → Mailbox) to send. Drafts can still be saved."}
        onClose={() => !busy && setOpen(false)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <span className="spacer" />
            <button className="btn warn" type="button" disabled={busy} onClick={() => submit(true)}>
              Save draft
            </button>
            <button className="btn good" type="button" disabled={busy} onClick={() => submit(false)}>
              ✉ Send
            </button>
          </>
        }
      >
        <div className="grid2">
          <label>
            Template
            <select value={f.templateKey} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">—</option>
              {meta.templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          {!ticket ? (
            <label>
              ATM (optional)
              <select value={f.atmId} onChange={(e) => set("atmId", e.target.value)}>
                <option value="">—</option>
                {(atms || []).map((a) => (
                  <option key={a._id} value={a.atmId}>
                    {a.atmId} · {a.city}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {["to", "cc", "bcc"].map((k) => (
            <label key={k}>
              {k.toUpperCase()} (comma separated)
              <input value={f[k]} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
          <label className="span-all">
            Subject
            <input value={f.subject} onChange={(e) => set("subject", e.target.value)} />
          </label>
        </div>
        <label>
          Body
          <textarea rows={8} value={f.body} onChange={(e) => set("body", e.target.value)} />
        </label>
        {ticketFiles && ticketFiles.length ? (
          <div className="section">
            <h4>Attach ticket files</h4>
            <div className="chips">
              {ticketFiles.map((d) => (
                <label key={d._id} className="check">
                  <input type="checkbox" checked={f.attachmentIds.includes(d._id)} onChange={() => toggle(d._id)} /> {d.fileName}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <label>
          Upload attachment (≤5 MB)
          <input type="file" onChange={(e) => setFile(e.target.files && e.target.files[0])} />
        </label>
      </Modal>
    </>
  );
}
