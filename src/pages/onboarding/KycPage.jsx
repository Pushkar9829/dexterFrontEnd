import { useMemo, useState } from "react";
import { askText } from "../../components/common/Dialogs.jsx";
import { FormModal } from "../../components/common/FormModal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { can } from "../../utils/perm.js";

const DOC_TYPES = ["PAN", "Aadhaar", "Cancelled cheque", "Bank statement", "GST", "Business proof", "Rent agreement", "Affidavit", "PPT", "Photo", "Applicant photo", "Franchise signature"];
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "");
const CHECK_TYPES = ["PAN", "Aadhaar", "Cancelled cheque", "Bank statement", "GST", "Business proof", "Rent agreement", "Affidavit"];
const SHORT = { "KYC Verified": "Verified", "KYC Rejected": "Rejected", "Under Verification": "Pending" };
const TONE = { "KYC Verified": "good", "KYC Rejected": "bad", "Under Verification": "warn" };
const LABEL = { "Under Verification": "Documents Submitted", "KYC Rejected": "Resubmission Required" };

function expiryBadge(expiry) {
  if (!expiry) return "";
  const days = Math.ceil((new Date(expiry + "T23:59:59+05:30") - Date.now()) / 86400000);
  if (Number.isNaN(days)) return expiry;
  if (days < 0) return <StatusBadge value={"Expired " + expiry} tone="bad" />;
  if (days <= 30) return <StatusBadge value={"Expires in " + days + "d"} tone="warn" />;
  return <span className="meta">{expiry}</span>;
}

export function KycPage({ documents, applications, office, canDecide = office, user, photoSlots, setError, setNotice, onReload }) {
  const override = user && ["Admin", "DexterIndiaCompanyTeam"].includes(user.hierarchy);
  const decided = (d) => ["KYC Verified", "KYC Rejected"].includes(d.verificationStatus);
  const [appFilter, setAppFilter] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("list");
  const [latestOnly, setLatestOnly] = useState(true);

  const allVersions = useMemo(() => documents.filter((d) => (d.parentType || "application") === "application"), [documents]);
  const all = useMemo(() => {
    if (!latestOnly) return allVersions;
    const top = new Map();
    allVersions.forEach((d) => {
      const k = d.parentId + "|" + d.type;
      if (!top.has(k) || (top.get(k).version || 0) < (d.version || 0)) top.set(k, d);
    });
    return allVersions.filter((d) => top.get(d.parentId + "|" + d.type) === d);
  }, [allVersions, latestOnly]);
  const counts = useMemo(() => {
    const c = {};
    all.forEach((d) => (c[d.verificationStatus || "Pending"] = (c[d.verificationStatus || "Pending"] || 0) + 1));
    return c;
  }, [all]);
  const rows = all.filter((d) => (!appFilter || String(d.parentId) === appFilter) && (!status || (d.verificationStatus || "Pending") === status));
  const appName = (id) => (applications.find((a) => a._id === String(id)) || {}).siteLocationName || "";

  async function upload(e) {
    const t = e.target;
    const file = t.file.files[0];
    if (!file) return;
    try {
      const data = await fileToB64(file);
      await api("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          parentType: "application",
          parentId: t.parentId.value,
          type: t.type.value === "Photo" && t.slot.value ? "Photo: " + t.slot.value : t.type.value,
          fileName: file.name,
          mime: file.type,
          expiry: t.expiry.value || null,
          data,
        }),
      });
      setNotice("Document uploaded (new version kept)");
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }

  async function dl(id) {
    try {
      const f = await api("/api/documents/" + id + "/file");
      downloadB64(f.fileName, f.mime, f.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function call(p, done) {
    try {
      const r = await p;
      if (done) setNotice(typeof done === "function" ? done(r) : done);
      onReload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function verify(d) {
    let reason = "";
    if (decided(d)) {
      reason = await askText("Changing a decided document. Reason (audited)", "", { title: "Override: verify " + d.type, required: true, multiline: true });
      if (!reason) return;
    }
    call(api("/api/documents/" + d._id + "/verify", { method: "PATCH", body: JSON.stringify({ approve: true, reason }) }), "Document verified");
  }

  async function reject(d) {
    const reason = await askText(decided(d) ? "Changing a decided document. Rejection reason (audited)" : "Rejection reason", "", {
      title: (decided(d) ? "Override: reject " : "Reject ") + d.type,
      required: true,
      multiline: true,
      danger: true,
      okLabel: "Reject",
    });
    if (!reason) return;
    call(api("/api/documents/" + d._id + "/verify", { method: "PATCH", body: JSON.stringify({ approve: false, rejectionReason: reason, reason }) }), "Document rejected");
  }

  async function editRemarks(d) {
    const remarks = await askText("Verifier remarks for " + d.type + " v" + d.version, d.remarks || "", { title: "Document remarks", multiline: true });
    if (remarks === null || remarks === undefined) return;
    call(api("/api/documents/" + d._id + "/remarks", { method: "PATCH", body: JSON.stringify({ remarks }) }), "Remarks saved");
  }

  async function remove(d) {
    const reason = await askText("Reason (audited)", "", { title: "Delete " + d.type + " v" + d.version + "?", required: true, danger: true, okLabel: "Delete" });
    if (!reason) return;
    call(api("/api/documents/" + d._id, { method: "DELETE", body: JSON.stringify({ reason }) }), "Document deleted");
  }

  const latestOf = (appId, type) =>
    allVersions.filter((d) => String(d.parentId) === appId && d.type === type).sort((a, b) => (b.version || 0) - (a.version || 0))[0];
  const photoCount = (appId) => new Set(allVersions.filter((d) => String(d.parentId) === appId && String(d.type).startsWith("Photo: ")).map((d) => d.type)).size;

  return (
    <div className="card sensitive">
      <Tabs
        tabs={[
          ["list", "Documents", all.length],
          ["checklist", "Checklist by application", applications.length],
        ]}
        value={view}
        onChange={setView}
      />
      {view === "checklist" ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Application</th>
                <th>Status</th>
                {CHECK_TYPES.map((t) => (
                  <th key={t}>{t}</th>
                ))}
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => {
                const n = photoCount(a._id);
                const need = (photoSlots || []).length || 15;
                return (
                  <tr key={a._id}>
                    <td>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          setAppFilter(a._id);
                          setView("list");
                        }}
                      >
                        {a.siteLocationName || a._id}
                      </button>
                    </td>
                    <td>
                      <StatusBadge value={a.status} />
                    </td>
                    {CHECK_TYPES.map((t) => {
                      const d = latestOf(a._id, t);
                      return <td key={t}>{d ? <StatusBadge value={SHORT[d.verificationStatus] || d.verificationStatus} tone={TONE[d.verificationStatus]} /> : <span className="meta">—</span>}</td>;
                    })}
                    <td>
                      <StatusBadge value={n + " / " + need} tone={n >= need ? "good" : n ? "warn" : "none"} />
                    </td>
                  </tr>
                );
              })}
              {!applications.length ? (
                <tr>
                  <td colSpan={CHECK_TYPES.length + 3} className="empty">
                    No applications.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
      <>
      <div className="toolbar">
        <select value={appFilter} onChange={(e) => setAppFilter(e.target.value)}>
          <option value="">All applications</option>
          {applications.map((a) => (
            <option key={a._id} value={a._id}>
              {a.siteLocationName || a._id}
            </option>
          ))}
        </select>
        <div className="chips">
          <button type="button" className={"chip" + (!status ? " active" : "")} onClick={() => setStatus("")}>
            All <b>{all.length}</b>
          </button>
          {Object.keys(counts).map((s) => (
            <button key={s} type="button" className={"chip" + (status === s ? " active" : "")} onClick={() => setStatus(status === s ? "" : s)}>
              {LABEL[s] || s} <b>{counts[s]}</b>
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={latestOnly} onChange={(e) => setLatestOnly(e.target.checked)} /> Latest versions only
        </label>
        <span className="spacer" />
        {can(user, "Create", "CRM-02") ? (
        <FormModal button="⤒ Upload document" title="Upload KYC / checklist document" subtitle="Each upload is kept as a new version." submitLabel="Upload" onSubmit={upload}>
          <div className="grid2">
            <label>
              Application
              <select name="parentId" required defaultValue={appFilter}>
                {applications.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.siteLocationName || a._id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select name="type">
                {DOC_TYPES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Photo slot (when type is Photo)
              <select name="slot">
                <option value="">—</option>
                {(photoSlots || []).map((s, i) => (
                  <option key={s} value={s}>
                    {i + 1}. {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Expiry (if any) <input name="expiry" type="date" />
            </label>
            <label className="span-all">
              File <input name="file" type="file" required />
            </label>
          </div>
        </FormModal>
        ) : null}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Application</th>
              <th>Type</th>
              <th>Ver</th>
              <th>Uploaded</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Expiry</th>
              <th>Reason / ID check</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d._id}>
                <td>
                  <strong>{appName(d.parentId)}</strong>
                </td>
                <td>{d.type}</td>
                <td>
                  <span className="badge">v{d.version}</span>
                </td>
                <td>
                  {d.uploadedByName || ""}
                  <div className="meta">{when(d.uploadedAt)}</div>
                </td>
                <td>
                  <StatusBadge value={LABEL[d.verificationStatus] || d.verificationStatus || "Pending"} tone={TONE[d.verificationStatus]} />
                </td>
                <td>
                  {d.verifiedByName || ""}
                  <div className="meta">{when(d.verifiedAt)}</div>
                </td>
                <td>{expiryBadge(d.expiry)}</td>
                <td>
                  {d.rejectionReason ? <span className="err">{d.rejectionReason}</span> : null}
                  {d.remarks ? <div className="meta">Remarks: {d.remarks}</div> : null}
                  {d.identityCheck ? (
                    <div>
                      <StatusBadge value={"ID " + d.identityCheck.status} tone={/verif|match|ok|pass/i.test(d.identityCheck.status) ? "good" : /fail|mismatch/i.test(d.identityCheck.status) ? "bad" : "warn"} />
                      {d.identityCheck.error ? <span className="meta"> {d.identityCheck.error}</span> : null}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className="actions-cell">
                    {!office || String(d.uploadedBy) === (user && user.id) || can(user, "Export", "CRM-02") || canDecide ? (
                      <button className="btn ghost" type="button" onClick={() => dl(d._id)}>
                        ⤓
                      </button>
                    ) : null}
                    {canDecide && /\b(pan|aadhaar|aadhar|driving|dl|licen[cs]e)\b/i.test(d.type || "") ? (
                      <button
                        className="btn info"
                        type="button"
                        onClick={() => call(api("/api/documents/" + d._id + "/id-check", { method: "POST", body: "{}" }), (r) => "ID check: " + r.identityCheck.status)}
                      >
                        ID check
                      </button>
                    ) : null}
                    {canDecide && d.verificationStatus !== "KYC Verified" && (!decided(d) || override) ? (
                      <button className="btn good" type="button" onClick={() => verify(d)}>
                        {decided(d) ? "Override: verify" : "Verify"}
                      </button>
                    ) : null}
                    {canDecide && d.verificationStatus !== "KYC Rejected" && (!decided(d) || override) ? (
                      <button className="btn warn" type="button" onClick={() => reject(d)}>
                        {decided(d) ? "Override: reject" : "Reject"}
                      </button>
                    ) : null}
                    {canDecide ? (
                      <button className="btn ghost" type="button" title="Verifier remarks" onClick={() => editRemarks(d)}>
                        Remarks
                      </button>
                    ) : null}
                    {can(user, "Delete", "CRM-02") || (user && String(d.uploadedBy) === user.id && d.verificationStatus === "Under Verification") ? (
                      <button className="btn bad" type="button" onClick={() => remove(d)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={9} className="empty">
                  No documents.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}
