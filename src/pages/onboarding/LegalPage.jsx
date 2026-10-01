import { useState } from "react";
import { askConfirm, askText } from "../../components/common/Dialogs.jsx";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { FormModal } from "../../components/common/FormModal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { downloadDoc, uploadFor } from "../../utils/documents.js";
import { useFocusRow } from "../../utils/focus.js";
import { can } from "../../utils/perm.js";

const AGR_MOVES = [
  ["Under Review", "info"],
  ["Approved", "good"],
  ["Resubmission Required", "warn"],
  ["Rejected", "bad"],
];

const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function shiftIso(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const LIFE_TONE = { Draft: "none", Active: "good", "Expiring Soon": "info", "Renewal Due": "warn", Expired: "bad", Renewed: "info", Terminated: "bad" };

export function agreementTerm(x, renewDays = 60) {
  if (x.lifecycle) return [x.lifecycle, LIFE_TONE[x.lifecycle] || "none"];
  if (x.status === "Terminated") return ["Terminated", "bad"];
  if (!x.endDate) return ["Draft", "none"];
  const today = todayIso();
  if (x.endDate < today) return ["Expired", "bad"];
  if ((x.renewalDate || shiftIso(x.endDate, -renewDays)) <= today) return ["Renewal Due", "warn"];
  return ["Active", "good"];
}

function LegalFiles({ parentType, row, documents, setError, setNotice, onReload }) {
  const mine = (documents || []).filter((d) => d.parentType === parentType && String(d.parentId) === String(row._id));
  async function pick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const r = await uploadFor(parentType, row._id, parentType === "loi" ? "LOI" : "Agreement", file);
      setNotice(parentType.toUpperCase() + " file uploaded (v" + r.version + ")");
      onReload();
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  }
  return (
    <div className="actions-cell">
      {mine.map((d) => (
        <button key={d._id} className="btn ghost" type="button" title="Download" onClick={() => downloadDoc(d._id).catch((err) => setError(err.message))}>
          ⤓ v{d.version}
        </button>
      ))}
      <label className="btn ghost filebtn">
        ⤒ Upload
        <input type="file" onChange={pick} />
      </label>
    </div>
  );
}

function AppAndFranchise({ applications, franchises }) {
  return (
    <>
      <label>
        Application
        <select name="applicationId" required>
          {applications.map((a) => (
            <option key={a._id} value={a._id}>
              {a.siteLocationName || a._id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Franchise
        <select name="franchiseId">
          <option value="">—</option>
          {franchises.map((f) => (
            <option key={f._id} value={f._id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function LegalPage({ lookups, office, desk = office, user, canDecide, lois, agreements, columns, documents, applications, franchises, setError, setNotice, onReload }) {
  const admin = user && ["Admin", "DexterIndiaCompanyTeam"].includes(user.hierarchy);
  const canCreate = can(user, "Create", "CRM-02");
  const [tab, setTab] = useState("loi");
  const { rowProps } = useFocusRow("legal", (link) => setTab(lois.some((l) => l._id === link.id) ? "loi" : "agr"), [tab, agreements, lois]);
  const appOf = (x) => applications.find((a) => a._id === String(x.applicationId || "")) || {};
  const frOf = (id) => franchises.find((f) => f._id === String(id || "")) || {};
  const loiOf = (x) => lois.find((l) => x.applicationId && String(l.applicationId) === String(x.applicationId));
  const cols = columns || [];
  const renewDays = Number(lookups && lookups.agreementRenewalDays) > 0 ? Number(lookups.agreementRenewalDays) : 60;
  const termCounts = Object.entries(LIFE_TONE)
    .map(([label, tone]) => [label, tone, agreements.filter((x) => agreementTerm(x, renewDays)[0] === label).length])
    .filter(([, , n]) => n);

  function legalAction(path, body, done) {
    return api(path, { method: "PATCH", body: JSON.stringify(body) })
      .then(() => {
        if (done) setNotice(done);
        onReload();
      })
      .catch((err) => setError(err.message));
  }

  async function decide(path, body, row, label) {
    if (body.status === "Approved" && path.startsWith("/api/agreements/") && (!row.endDate || !row.agreementNo)) {
      setError("Set the agreement term (agreement number, start and end dates) before approving.");
      return;
    }
    if (["Approved", "Rejected", "Terminated"].includes(row.status)) {
      const reason = await askText("Already " + row.status + ". Admin override reason:", "", { title: "Override decision", required: true, multiline: true });
      if (!reason) return;
      body = { ...body, reason };
    }
    legalAction(path, body, label);
  }
  async function setLink(x) {
    const link = await askText("Agreement link (https://…)", x.link || "", { title: "Share agreement link", inputType: "url", okLabel: "Share" });
    if (link == null) return;
    legalAction("/api/agreements/" + x._id, { link, status: "Link Shared" }, "Link shared");
  }
  async function setType(x) {
    const opts = (lookups && lookups.agreementTypes) || [];
    const t = await askText("Agreement type", x.agreementType || opts[0] || "", { title: "Set agreement type", options: opts.length ? opts : null, okLabel: "Save" });
    if (t == null) return;
    legalAction("/api/agreements/" + x._id, { agreementType: t }, "Agreement type set");
  }
  function saveTerm(x, e) {
    const f = e.target;
    return api("/api/agreements/" + x._id, {
      method: "PATCH",
      body: JSON.stringify({
        agreementNo: f.agreementNo.value,
        signedDate: f.signedDate.value,
        startDate: f.startDate.value,
        endDate: f.endDate.value,
        renewalDate: f.renewalDate.value,
        noticePeriodDays: f.noticePeriodDays.value,
        paymentTerms: f.paymentTerms.value,
        payoutTerms: f.payoutTerms.value,
        penaltyClause: f.penaltyClause.value,
      }),
    })
      .then(() => {
        setNotice("Agreement term saved");
        onReload();
        return true;
      })
      .catch((err) => setError(err.message));
  }
  async function terminate(x) {
    const reason = await askText("Why is this agreement being terminated? The franchise is notified.", "", { title: "Terminate agreement", required: true, multiline: true, okLabel: "Terminate" });
    if (!reason) return;
    legalAction("/api/agreements/" + x._id, { status: "Terminated", reason }, "Agreement terminated");
  }
  async function editExtra(row, c) {
    const v = await askText(c.name + " (" + c.type + ")", String((row.extra || {})[c.name] || ""), {
      title: "Edit " + c.name,
      options: c.type === "status" && (c.options || []).length ? c.options : null,
      inputType: c.type === "date" ? "date" : c.type === "number" ? "number" : "text",
      okLabel: "Save",
    });
    if (v == null) return;
    legalAction("/api/agreements/" + row._id, { extra: { [c.name]: v } }, "Saved");
  }
  async function pickExtraFile(row, c, file) {
    if (!file) return;
    legalAction("/api/agreements/" + row._id, { extra: { [c.name]: { fileName: file.name, data: await fileToB64(file) } } }, "File attached");
  }
  async function openExtraFile(row, v) {
    try {
      const f = await api("/api/registers/agreement/" + row._id + "/file/" + v.docId);
      downloadB64(f.fileName, f.mime, f.data);
    } catch (err) {
      setError(err.message);
    }
  }
  async function removeCol(c) {
    if (!(await askConfirm("Remove column " + c.name + "? Values already entered stay in history.", { danger: true, okLabel: "Remove" }))) return;
    try {
      await api("/api/register-columns/" + c._id, { method: "DELETE" });
      setNotice("Column removed");
      onReload();
    } catch (err) {
      setError(err.message);
    }
  }
  async function post(path, body, done) {
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setNotice(done);
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }
  const addLoi = (e) =>
    post("/api/lois", { loiCode: e.target.loiCode.value, applicationId: e.target.applicationId.value, franchiseId: e.target.franchiseId.value || undefined }, "LOI saved");
  const addAgr = (e) =>
    post(
      "/api/agreements",
      {
        applicationId: e.target.applicationId.value,
        franchiseId: e.target.franchiseId.value || undefined,
        status: "Pending",
        extra: Object.fromEntries(cols.map((c) => [c.name, e.target["x_" + c._id] ? e.target["x_" + c._id].value : ""]).filter(([, v]) => v !== "")),
      },
      "Agreement row saved"
    );
  const addCol = (e) =>
    post(
      "/api/register-columns",
      { register: "agreement", name: e.target.cname.value, type: e.target.ctype.value, required: e.target.creq.checked, options: e.target.copts.value },
      "Column added"
    );

  return (
    <>
      <Tabs
        tabs={[
          ["loi", "LOI", lois.length],
          ["agr", "Agreements", agreements.length],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "loi" ? (
        <>
          <div className="card">
            <div className="toolbar">
              <span className="meta">Letters of intent per application.</span>
              <span className="spacer" />
              {canCreate ? (
              <FormModal button="+ New LOI" title="New LOI" submitLabel="Save LOI" onSubmit={addLoi}>
                <div className="grid2">
                  <label>
                    LOI code <input name="loiCode" required />
                  </label>
                  <AppAndFranchise applications={applications} franchises={franchises} />
                </div>
              </FormModal>
              ) : null}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Application</th>
                  <th>Status</th>
                  <th>Files</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lois.map((x) => (
                  <tr key={x._id} {...rowProps(x)}>
                    <td>
                      <strong>{x.loiCode}</strong>
                    </td>
                    <td>{appOf(x).siteLocationName || ""}</td>
                    <td>
                      <StatusBadge value={x.status} />
                    </td>
                    <td>
                      <LegalFiles parentType="loi" row={x} documents={documents} setError={setError} setNotice={setNotice} onReload={onReload} />
                    </td>
                    <td>
                      {canDecide && (!["Approved", "Rejected"].includes(x.status) || admin) ? (
                        <div className="actions-cell">
                          {x.status !== "Approved" ? (
                            <button className="btn good" type="button" onClick={() => decide("/api/lois/" + x._id, { approve: true }, x, "LOI approved")}>
                              Approve
                            </button>
                          ) : null}
                          {x.status !== "Rejected" ? (
                            <button className="btn bad" type="button" onClick={() => decide("/api/lois/" + x._id, { reject: true }, x, "LOI rejected")}>
                              Reject
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!lois.length ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      No LOIs yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <ExtraColumns register="loi" rows={lois} rowLabel={(x) => x.loiCode} office={desk} admin={office && user && !user.fieldStaff} setError={setError} setNotice={setNotice} onReload={onReload} />
        </>
      ) : (
        <div className="card">
          <div className="toolbar">
            <span className="meta">Agreement tracking (not a legal conclusion).</span>
            <div className="chips">
              {termCounts.map(([label, tone, n]) => (
                <span key={label} className={"badge " + tone}>
                  {label}: {n}
                </span>
              ))}
            </div>
            {cols.length ? (
              <div className="chips">
                {cols.map((c) => (
                  <span key={c._id} className="badge info">
                    {c.name} · {c.type}
                    {c.required ? " *" : ""}
                    {office ? (
                      <button type="button" className="badge-x" aria-label={"Remove " + c.name} onClick={() => removeCol(c)}>
                        ×
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
            <span className="spacer" />
            {office ? (
              <FormModal button="+ Add column" buttonClass="btn ghost" title="Add agreement column" submitLabel="Add column" onSubmit={addCol}>
                <div className="grid2">
                  <label>
                    Column name <input name="cname" required />
                  </label>
                  <label>
                    Type
                    <select name="ctype">
                      {["text", "date", "number", "status", "file"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="span-all">
                    Status options (comma-separated) <input name="copts" />
                  </label>
                  <label className="check">
                    <input name="creq" type="checkbox" /> Required
                  </label>
                </div>
              </FormModal>
            ) : null}
            {canCreate ? (
            <FormModal button="+ New agreement" title="New agreement row" submitLabel="Add agreement" onSubmit={addAgr}>
              <div className="grid2">
                <AppAndFranchise applications={applications} franchises={franchises} />
                {desk
                  ? cols
                      .filter((c) => c.type !== "file")
                      .map((c) => (
                        <label key={c._id}>
                          {c.name}
                          {c.required ? " *" : ""}
                          {c.type === "status" && (c.options || []).length ? (
                            <select name={"x_" + c._id} required={!!c.required}>
                              <option value="">—</option>
                              {c.options.map((o) => (
                                <option key={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <input name={"x_" + c._id} type={c.type === "date" ? "date" : c.type === "number" ? "number" : "text"} required={!!c.required} />
                          )}
                        </label>
                      ))
                  : null}
              </div>
            </FormModal>
            ) : null}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Site / LOI no.</th>
                  <th>Location</th>
                  <th>Franchisee</th>
                  <th>Contact</th>
                  <th>Model</th>
                  <th>MF</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Term</th>
                  <th>Link</th>
                  {cols.map((c) => (
                    <th key={c._id}>{c.name}</th>
                  ))}
                  <th>Files</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map((x) => {
                  const ap = appOf(x);
                  const fr = frOf(x.franchiseId || ap.franchiseId);
                  const loi = loiOf(x);
                  return (
                    <tr key={x._id} {...rowProps(x)}>
                      <td>
                        <strong>{[ap.siteNumber, loi && loi.loiCode].filter(Boolean).join(" / ") || "—"}</strong>
                      </td>
                      <td>{[ap.siteLocationName, ap.city].filter(Boolean).join(", ")}</td>
                      <td>{fr.name || ""}</td>
                      <td>{ap.contactNumber || ""}</td>
                      <td>{ap.model || ""}</td>
                      <td>{frOf(fr.masterId).name || ""}</td>
                      <td className="nowrap">
                        {x.agreementType || <span className="meta">—</span>}{" "}
                        {office ? (
                          <button className="btn ghost" type="button" onClick={() => setType(x)}>
                            ✎
                          </button>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge value={x.status} />
                        {x.status === "Terminated" && x.terminationReason ? <div className="meta">{x.terminationReason}</div> : null}
                      </td>
                      <td className="nowrap">
                        <StatusBadge value={agreementTerm(x, renewDays)[0]} tone={agreementTerm(x, renewDays)[1]} />
                        {x.agreementNo ? <div className="meta">No. {x.agreementNo}</div> : null}
                        {x.startDate || x.endDate ? (
                          <div className="meta">
                            {x.startDate || "?"} → {x.endDate || "?"}
                            {x.renewalDate ? " · renew by " + x.renewalDate : ""}
                            {x.noticePeriodDays != null ? " · notice " + x.noticePeriodDays + " d" : ""}
                          </div>
                        ) : null}
                        {desk && x.status !== "Terminated" ? (
                          <FormModal button="✎ Term" buttonClass="btn ghost" title="Agreement term" submitLabel="Save term" size="md" onSubmit={(e) => saveTerm(x, e)}>
                            <div className="grid2">
                              <label>
                                Agreement number <input name="agreementNo" defaultValue={x.agreementNo || ""} />
                              </label>
                              <label>
                                Notice period (days) <input name="noticePeriodDays" type="number" min="0" max="365" defaultValue={x.noticePeriodDays ?? ""} />
                              </label>
                              <label>
                                Signed on <input name="signedDate" type="date" defaultValue={x.signedDate || ""} />
                              </label>
                              <label>
                                Start date <input name="startDate" type="date" required defaultValue={x.startDate || ""} />
                              </label>
                              <label>
                                End date <input name="endDate" type="date" required defaultValue={x.endDate || ""} />
                              </label>
                              <label>
                                Renew by <input name="renewalDate" type="date" defaultValue={x.renewalDate || ""} />
                              </label>
                              <label className="span-all">
                                Payment terms <textarea name="paymentTerms" rows={2} defaultValue={x.paymentTerms || ""} />
                              </label>
                              <label className="span-all">
                                Payout terms <textarea name="payoutTerms" rows={2} defaultValue={x.payoutTerms || ""} />
                              </label>
                              <label className="span-all">
                                Penalty clause <textarea name="penaltyClause" rows={2} defaultValue={x.penaltyClause || ""} />
                              </label>
                            </div>
                            <p className="meta">Leave "Renew by" empty to be reminded {renewDays} days before the end date. To renew, extend the end date.</p>
                          </FormModal>
                        ) : null}
                      </td>
                      <td>
                        {x.link ? (
                          <a href={x.link} target="_blank" rel="noreferrer">
                            open ↗
                          </a>
                        ) : (
                          ""
                        )}
                      </td>
                      {cols.map((c) => {
                        const v = (x.extra || {})[c.name];
                        return (
                          <td key={c._id} className="nowrap">
                            {c.type === "file" ? (
                              <>
                                {v && v.docId ? (
                                  <button className="btn ghost" type="button" onClick={() => openExtraFile(x, v)}>
                                    ⤓ {v.fileName}
                                  </button>
                                ) : (
                                  "—"
                                )}{" "}
                                {desk ? (
                                  <label className="btn ghost filebtn">
                                    ⤒
                                    <input type="file" onChange={(e) => pickExtraFile(x, c, e.target.files[0])} />
                                  </label>
                                ) : null}
                              </>
                            ) : (
                              <>
                                {c.type === "status" ? <StatusBadge value={v} /> : v || ""}{" "}
                                {desk ? (
                                  <button className="btn ghost" type="button" onClick={() => editExtra(x, c)}>
                                    ✎
                                  </button>
                                ) : null}
                              </>
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <LegalFiles parentType="agreement" row={x} documents={documents} setError={setError} setNotice={setNotice} onReload={onReload} />
                      </td>
                      <td>
                        <div className="actions-cell">
                          {office && user && user.canSetLinkShared ? (
                            <button className="btn info" type="button" onClick={() => setLink(x)}>
                              Share link
                            </button>
                          ) : null}
                          {canDecide && (!["Approved", "Rejected", "Terminated"].includes(x.status) || admin)
                            ? AGR_MOVES.filter(([s]) => s !== x.status).map(([s, tone]) => (
                                <button key={s} className={"btn " + tone} type="button" onClick={() => decide("/api/agreements/" + x._id, { status: s }, x, "Agreement: " + s)}>
                                  {s}
                                </button>
                              ))
                            : null}
                          {admin && x.status === "Approved" ? (
                            <button className="btn bad" type="button" onClick={() => terminate(x)}>
                              Terminate
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!agreements.length ? (
                  <tr>
                    <td colSpan={12 + cols.length} className="empty">
                      No agreements yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
