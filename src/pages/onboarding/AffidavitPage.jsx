import { useMemo, useState } from "react";
import { FormModal } from "../../components/common/FormModal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { useFocusRow } from "../../utils/focus.js";
import { can } from "../../utils/perm.js";

const AFF_STATE = { "KYC Verified": ["Verified", "good"], "KYC Rejected": ["Rejected — upload again", "bad"], "Under Verification": ["Uploaded — awaiting check", "warn"] };

export function AffidavitPage({ office, user, lookups, formats, applications, documents = [], setError, setNotice, onReload }) {
  const [view, setView] = useState("tracker");
  const { rowProps } = useFocusRow("affidavit", () => setView("tracker"), [view, applications, documents]);
  const models = (lookups && lookups.productModels && lookups.productModels.length ? lookups.productModels : ["Sapphire", "Topaz", "Emerald"]);
  const canUpload = can(user, "Create", "CRM-02");

  async function publish(e) {
    const file = e.target.file.files[0];
    if (!file) return;
    try {
      const data = await fileToB64(file);
      await api("/api/affidavit-formats", {
        method: "POST",
        body: JSON.stringify({ model: e.target.model.value, fileName: file.name, mime: file.type, data }),
      });
      setNotice("Format published (tracking only, not legal validity)");
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }
  async function dl(id) {
    try {
      const f = await api("/api/affidavit-formats/" + id + "/file");
      downloadB64(f.fileName, f.mime, f.data);
    } catch (err) {
      setError(err.message);
    }
  }
  async function uploadFor(appId, file) {
    if (!file) return;
    try {
      const data = await fileToB64(file);
      await api("/api/documents", {
        method: "POST",
        body: JSON.stringify({ parentId: appId, parentType: "application", type: "Affidavit", fileName: file.name, mime: file.type, data }),
      });
      setNotice("Notarized affidavit uploaded");
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }

  const current = (model) => formats.find((f) => f.model === model && f.current);
  const list = formats.filter((f) => office || f.current);

  const tracker = useMemo(
    () =>
      applications.map((a) => {
        const affs = documents
          .filter((d) => (d.parentType || "application") === "application" && String(d.parentId) === a._id && d.type === "Affidavit")
          .sort((x, y) => (y.version || 0) - (x.version || 0));
        return { a, latest: affs[0], versions: affs.length };
      }),
    [applications, documents]
  );
  const pending = tracker.filter((r) => !r.latest || r.latest.verificationStatus === "KYC Rejected").length;

  return (
    <div className="sensitive">
      <div className="kpis">
        <div className="kpi" style={{ "--k": "#2563eb" }}>
          <div className="l">Step 1</div>
          <div>Download the current format for the model</div>
        </div>
        <div className="kpi" style={{ "--k": "#d97706" }}>
          <div className="l">Step 2</div>
          <div>Print, sign and notarize</div>
        </div>
        <div className="kpi" style={{ "--k": "#059669" }}>
          <div className="l">Step 3</div>
          <div>Upload the signed copy against the application</div>
        </div>
        <div className="kpi" style={{ "--k": pending ? "#e11d48" : "#059669" }}>
          <div className="l">Pending affidavits</div>
          <div className="v">{pending}</div>
        </div>
      </div>
      <div className="card">
        <Tabs
          tabs={[
            ["tracker", "By application", tracker.length],
            ["formats", "Formats", list.length],
          ]}
          value={view}
          onChange={setView}
        />
        {view === "tracker" ? (
          <table>
            <thead>
              <tr>
                <th>Application</th>
                <th>Model</th>
                <th>Format to use</th>
                <th>Affidavit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracker.map(({ a, latest, versions }) => {
                const fmt = current(a.model);
                const [label, tone] = latest ? AFF_STATE[latest.verificationStatus] || [latest.verificationStatus, "none"] : ["Not uploaded", "bad"];
                return (
                  <tr key={a._id} {...rowProps(a, latest ? "" : "flag")}>
                    <td>
                      <strong>{a.siteLocationName || a._id}</strong>
                      <div className="meta">{a.city}</div>
                    </td>
                    <td>{a.model || <span className="meta">—</span>}</td>
                    <td>
                      {fmt ? (
                        <button className="btn ghost" type="button" onClick={() => dl(fmt._id)}>
                          ⤓ {fmt.model} v{fmt.version || 1}
                        </button>
                      ) : (
                        <span className="meta">No format published for {a.model || "this model"}</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge value={label} tone={tone} />
                      {latest ? <span className="meta"> v{latest.version}{versions > 1 ? " · " + versions + " versions" : ""}</span> : null}
                      {latest && latest.rejectionReason ? <div className="err">{latest.rejectionReason}</div> : null}
                    </td>
                    <td>
                      {canUpload && (!latest || latest.verificationStatus !== "KYC Verified") ? (
                        <label className="btn ghost filebtn">
                          ⤒ Upload signed copy
                          <input type="file" accept="image/*,.pdf" onChange={(e) => uploadFor(a._id, e.target.files[0]).finally(() => (e.target.value = ""))} />
                        </label>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!tracker.length ? (
                <tr>
                  <td colSpan={5} className="empty">
                    No applications yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        ) : (
          <>
            <div className="toolbar">
              <span className="meta">The newest version per model is current; older versions stay for history.</span>
              <span className="spacer" />
              {office ? (
                <FormModal button="+ Publish format" buttonClass="btn ghost" title="Publish affidavit format" submitLabel="Publish" size="sm" onSubmit={publish}>
                  <label>
                    Model
                    <select name="model">
                      {models.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Format file <input name="file" type="file" required />
                  </label>
                </FormModal>
              ) : null}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <strong>{f.model}</strong>
                    </td>
                    <td>
                      <span className="badge">v{f.version || 1}</span>
                    </td>
                    <td>
                      <StatusBadge value={f.current ? "Current" : "Older"} tone={f.current ? "good" : "none"} />
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn ghost" type="button" onClick={() => dl(f._id)}>
                          ⤓ Download
                        </button>
                        {office && !f.current ? (
                          <button
                            className="btn info"
                            type="button"
                            onClick={() =>
                              api("/api/affidavit-formats/" + f._id + "/current", { method: "PATCH" })
                                .then(() => {
                                  setNotice(f.model + " v" + (f.version || 1) + " is now current");
                                  onReload();
                                })
                                .catch((err) => setError(err.message))
                            }
                          >
                            Make current
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.length ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      No formats published yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
