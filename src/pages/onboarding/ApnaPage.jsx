import { useState } from "react";
import { askText } from "../../components/common/Dialogs.jsx";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { FormModal } from "../../components/common/FormModal.jsx";
import { RowEditor } from "../../components/common/RowEditor.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { api } from "../../services/api.js";
import { downloadDoc, uploadFor } from "../../utils/documents.js";
import { can } from "../../utils/perm.js";

const APNA_FIELDS = [
  { k: "siteLoi", label: "Site/LOI" },
  { k: "atmId", label: "ATM ID" },
  { k: "location", label: "Location" },
  { k: "franchiseeName", label: "Franchisee" },
  { k: "franchiseeContact", label: "FR contact" },
  { k: "franchiseeEmail", label: "FR email" },
  { k: "masterFranchise", label: "Master Franchise" },
  { k: "masterContact", label: "MF contact" },
  { k: "masterEmail", label: "MF email" },
];

export function ApnaPage({ office, user, franchises, documents, mappings, onReload, setError, setNotice }) {
  const [query, setQuery] = useState("");
  const canNew = office && can(user, "Create", "CRM-02");
  const canEdit = office && can(user, "Edit", "CRM-02");
  const canUpload = can(user, "Create", "CRM-02");
  const frOptions = (franchises || []).filter((f) => f.layer === "Franchise").map((f) => [String(f._id), f.name]);
  const statements = (m) => (documents || []).filter((d) => d.parentType === "apna" && String(d.parentId) === String(m._id)).sort((a, b) => String(b.type).localeCompare(String(a.type)));
  const q = query.trim().toLowerCase();
  const rows = mappings.filter((m) => !q || [m.atmId, m.siteLoi, m.location, m.franchiseeName, m.masterFranchise].some((v) => String(v || "").toLowerCase().includes(q)));

  async function uploadStatement(m, e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const month = await askText("Statement month", new Date().toLocaleDateString("en-CA").slice(0, 7), { title: "Apna statement — " + (m.atmId || m.siteLoi || ""), inputType: "month", okLabel: "Upload" });
    if (!month) return;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return setError("month must be YYYY-MM");
    try {
      await uploadFor("apna", m._id, "Apna statement " + month, file);
      setNotice("Apna statement " + month + " uploaded (new version kept)");
      onReload();
    } catch (err) {
      setError(err.message);
    }
  }
  async function add(e) {
    const t = e.target;
    try {
      const body = { franchiseId: t.franchiseId.value || undefined };
      APNA_FIELDS.forEach((x) => (body[x.k] = t[x.k].value));
      await api("/api/apna", { method: "POST", body: JSON.stringify(body) });
      setNotice("Apna mapping saved (no device link)");
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Search ATM, location, franchisee…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <span className="meta">Mapping only; there is no device or Apna App API link.</span>
          <span className="spacer" />
          {canNew ? (
            <FormModal button="+ New mapping" title="New Apna mapping" size="lg" submitLabel="Save mapping" onSubmit={add}>
              <div className="grid2">
                {APNA_FIELDS.map((x) => (
                  <label key={x.k}>
                    {x.label} <input name={x.k} />
                  </label>
                ))}
                <label className="span-all">
                  Linked franchise (lets the franchisee see it and upload statements)
                  <select name="franchiseId" defaultValue="">
                    <option value="">—</option>
                    {frOptions.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </FormModal>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>ATM</th>
              <th>Location</th>
              <th>FR</th>
              <th>Master</th>
              <th>Status</th>
              <th>Apna statements</th>
              {canEdit ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m._id}>
                <td>
                  <strong>{m.atmId}</strong>
                  {m.siteLoi ? <div className="meta">{m.siteLoi}</div> : null}
                </td>
                <td>{m.location}</td>
                <td>{m.franchiseeName}</td>
                <td>{m.masterFranchise}</td>
                <td>
                  <StatusBadge value={m.active === false ? "Inactive" : "Active"} />
                </td>
                <td>
                  <div className="actions-cell">
                    {statements(m).map((d) => (
                      <button key={d._id} className="btn ghost" type="button" onClick={() => downloadDoc(d._id).catch((err) => setError(err.message))}>
                        ⤓ {d.type.replace("Apna statement ", "")} v{d.version}
                      </button>
                    ))}
                    {canUpload ? (
                      <label className="btn ghost filebtn">
                        ⤒ Upload
                        <input type="file" onChange={(e) => uploadStatement(m, e)} />
                      </label>
                    ) : null}
                  </div>
                </td>
                {canEdit ? (
                  <td>
                    <RowEditor
                      row={{ ...m, franchiseId: m.franchiseId ? String(m.franchiseId) : "", active: m.active !== false }}
                      path={"/api/apna/" + m._id}
                      title={"Edit mapping — " + (m.atmId || m.siteLoi || "")}
                      fields={[...APNA_FIELDS, { k: "franchiseId", label: "Linked franchise", options: frOptions }, { k: "active", label: "Active", type: "check" }]}
                      onDone={onReload}
                      setError={setError}
                      setNotice={setNotice}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="empty">
                  No mappings.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="meta">Statements are kept per month with versions.</p>
      </div>
      <ExtraColumns register="apna" rows={mappings} rowLabel={(m) => m.atmId || m.siteLoi} office={office} admin={!!(user && user.officeAdmin)} setError={setError} setNotice={setNotice} onReload={onReload} />
    </>
  );
}
