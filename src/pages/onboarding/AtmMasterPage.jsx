import { useState } from "react";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { Field } from "../../components/common/Field.jsx";
import { LookupSelect } from "../../components/common/LookupSelect.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { StepNav, Steps } from "../../components/common/StepForm.jsx";
import { api } from "../../services/api.js";

const EMPTY_ATM = {
  atmId: "",
  atmSerialNumber: "",
  machineTypeModel: "",
  model: "Sapphire",
  city: "",
  siteId: "",
  franchiseeName: "",
  bankName: "",
  franchiseId: "",
  modelType: "",
  atmType: "",
  mdType: "",
  fundingPath: "",
  email2: "",
  salesOfficer: "",
  mobile: "",
  email: "",
  loi: "",
  agreement: "",
  region: "",
  state: "",
  hitachiCode: "",
  sapCode: "",
  solId: "",
  status: "Under Installation",
  statusReason: "",
  projectId: "",
};

const STATUSES = ["Active", "Inactive", "Under Installation", "Under Maintenance", "Temporarily Down", "Suspended", "Decommissioned"];
const STATUS_TONE = { Active: "good", "Under Installation": "info", "Under Maintenance": "warn", "Temporarily Down": "bad", Suspended: "bad", Inactive: "none", Decommissioned: "none" };
const NEEDS_REASON = ["Inactive", "Temporarily Down", "Suspended", "Decommissioned"];

const STEPS = [
  { key: "machine", label: "Machine", hint: "ID, serial, type" },
  { key: "location", label: "Location", hint: "City, site, project" },
  { key: "franchise", label: "Franchise & contact" },
  { key: "bank", label: "Bank & legal", hint: "Funding, LOI" },
];

const FUND_TONE = { WLA: "info", Axis: "warn", ICD: "good" };

export function AtmMasterPage({ user, office, lookups, franchises, projects, atms, setAtms, onReload, setError, setNotice }) {
  const L = lookups || {};
  const [atm, setAtm] = useState(EMPTY_ATM);
  const [editingAtmId, setEditingAtmId] = useState("");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState("");
  const [origStatus, setOrigStatus] = useState("");
  const set = (k) => (v) => setAtm((a) => ({ ...a, [k]: v }));

  const q = query.trim().toLowerCase();
  const byStatus = {};
  atms.forEach((a) => (byStatus[a.status] = (byStatus[a.status] || 0) + 1));
  const rows = atms.filter((a) => (!only || a.status === only) && (!q || [a.atmId, a.atmSerialNumber, a.siteId, a.franchiseeName, a.city, a.state, a.bankName, a.region, a.hitachiCode, a.sapCode].some((v) => String(v || "").toLowerCase().includes(q))));

  function startNew() {
    setAtm(EMPTY_ATM);
    setOrigStatus("");
    setEditingAtmId("");
    setStep(0);
    setOpen(true);
  }

  function startEdit(a) {
    const next = { ...EMPTY_ATM };
    Object.keys(next).forEach((k) => (next[k] = a[k] == null ? "" : String(a[k])));
    next.statusReason = "";
    setAtm(next);
    setOrigStatus(a.status || "");
    setEditingAtmId(a._id);
    setStep(0);
    setOpen(true);
  }

  async function saveAtm() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (editingAtmId) {
        const { atmId, ...rest } = atm;
        await api("/api/atms/" + editingAtmId, { method: "PATCH", body: JSON.stringify(rest) });
      } else {
        await api("/api/atms", { method: "POST", body: JSON.stringify(atm) });
      }
      setEditingAtmId("");
      setOpen(false);
      const data = await api("/api/atms");
      setAtms(data.atms || []);
      setNotice("ATM saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const statusChanged = atm.status !== origStatus;
  const needReason = statusChanged && NEEDS_REASON.includes(atm.status) && !atm.statusReason.trim();
  const missing = !atm.atmSerialNumber || !atm.machineTypeModel || (!editingAtmId && !atm.atmId) || needReason;

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Search ATM ID, serial, site, franchisee…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <span className="meta">
            {rows.length} of {atms.length} ATMs
          </span>
          <span className="spacer" />
          {office ? (
            <button className="btn primary" type="button" onClick={startNew}>
              + New ATM
            </button>
          ) : (
            <span className="meta">Franchise users see their own ATMs only. Create is Admin / Ops.</span>
          )}
        </div>
        <div className="chips">
          <button type="button" className={"chip" + (only ? "" : " active")} onClick={() => setOnly("")}>
            All {atms.length}
          </button>
          {STATUSES.filter((s) => byStatus[s]).map((s) => (
            <button key={s} type="button" className={"chip" + (only === s ? " active" : "") + (["Temporarily Down", "Suspended", "Under Maintenance"].includes(s) ? " warn" : "")} onClick={() => setOnly(only === s ? "" : s)}>
              {s} {byStatus[s]}
            </button>
          ))}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>S.N.</th>
                <th>ATM ID</th>
                <th>Status</th>
                <th>Hitachi / SAP / SOL</th>
                <th>Model</th>
                <th>Model type</th>
                <th>ATM type</th>
                <th>Serial</th>
                <th>Machine type</th>
                <th>Site ID</th>
                <th>Franchisee</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Type</th>
                <th>Bank</th>
                <th>Funding</th>
                <th>LOI</th>
                <th>Agreement</th>
                <th>City</th>
                <th>State</th>
                <th>Region</th>
                <th>Cash live</th>
                {office ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={a._id}>
                  <td className="meta">{i + 1}</td>
                  <td>
                    <strong>{a.atmId}</strong>
                  </td>
                  <td>
                    <StatusBadge value={a.status} tone={STATUS_TONE[a.status]} />
                    {a.statusReason ? <div className="meta">{a.statusReason}</div> : null}
                  </td>
                  <td className="nowrap">{[a.hitachiCode, a.sapCode, a.solId].map((v) => v || "—").join(" / ")}</td>
                  <td>{a.model}</td>
                  <td>{a.modelType}</td>
                  <td>{a.atmType}</td>
                  <td>{a.atmSerialNumber}</td>
                  <td>{a.machineTypeModel}</td>
                  <td>{a.siteId}</td>
                  <td>{a.franchiseeName}</td>
                  <td>{a.mobile}</td>
                  <td>{[a.email, a.email2].filter(Boolean).join(", ")}</td>
                  <td>{a.mdType}</td>
                  <td>{a.bankName}</td>
                  <td>{a.fundingPath ? <StatusBadge value={a.fundingPath} tone={FUND_TONE[a.fundingPath]} /> : ""}</td>
                  <td>{a.loiRegister || a.loi}</td>
                  <td>{a.agreementRegister || a.agreement}</td>
                  <td>{a.city}</td>
                  <td>{a.state || ""}</td>
                  <td>{a.region || ""}</td>
                  <td>{a.cashLiveDate ? <StatusBadge value={new Date(a.cashLiveDate).toLocaleDateString("en-IN")} tone="good" /> : <StatusBadge value="Not live" tone="none" />}</td>
                  {office ? (
                    <td>
                      <button className="btn ghost" type="button" onClick={() => startEdit(a)}>
                        ✎ Edit
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={24} className="empty">
                    No ATMs.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <ExtraColumns register="atm" rows={atms} rowLabel={(a) => a.atmId} office={office} admin={!!user.officeAdmin} setError={setError} setNotice={setNotice} onReload={onReload} />

      <Modal
        open={open}
        size="lg"
        title={editingAtmId ? "Edit ATM " + atm.atmId : "New ATM"}
        subtitle={editingAtmId ? "ATM ID cannot change." : "Serial number and machine type are required."}
        onClose={() => !busy && setOpen(false)}
        footer={
          <StepNav current={step} total={STEPS.length} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)}>
            <button className="btn good" type="button" disabled={busy || missing} title={missing ? "ATM ID, serial and machine type are required" : ""} onClick={saveAtm}>
              {busy ? "Saving…" : "Save ATM"}
            </button>
          </StepNav>
        }
      >
        <Steps steps={STEPS} current={step} onPick={setStep} />
        {step === 0 ? (
          <div className="grid2">
            {editingAtmId ? (
              <label>
                ATM ID
                <input value={atm.atmId} disabled />
              </label>
            ) : (
              <Field label="ATM ID *" value={atm.atmId} onChange={set("atmId")} />
            )}
            <Field label="ATM serial number *" value={atm.atmSerialNumber} onChange={set("atmSerialNumber")} />
            <LookupSelect label="Machine type / model *" value={atm.machineTypeModel} options={L.machineTypes} onChange={set("machineTypeModel")} />
            <LookupSelect label="Product model" value={atm.model} options={L.productModels} onChange={set("model")} />
            <Field label="Model type" value={atm.modelType} onChange={set("modelType")} />
            <Field label="ATM type" value={atm.atmType} onChange={set("atmType")} />
            <Field label="Type (MD sheet)" value={atm.mdType} onChange={set("mdType")} />
            <Field label="Hitachi code" value={atm.hitachiCode} onChange={set("hitachiCode")} />
            <Field label="SAP code" value={atm.sapCode} onChange={set("sapCode")} />
            <label>
              Operational status
              <select value={atm.status} onChange={(e) => set("status")(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {statusChanged && editingAtmId ? <Field label={"Reason" + (NEEDS_REASON.includes(atm.status) ? " *" : "")} value={atm.statusReason} onChange={set("statusReason")} /> : null}
          </div>
        ) : null}
        {step === 1 ? (
          <div className="grid2">
            <LookupSelect label="City" value={atm.city} options={L.cities} onChange={set("city")} />
            <LookupSelect label="State" value={atm.state} options={L.states} onChange={set("state")} />
            <LookupSelect label="Region" value={atm.region} options={L.regions} onChange={set("region")} />
            <Field label="Site ID" value={atm.siteId} onChange={set("siteId")} />
            <Field label="SOL ID (bank branch)" value={atm.solId} onChange={set("solId")} />
            <label>
              Project
              <select value={atm.projectId || ""} onChange={(e) => set("projectId")(e.target.value)}>
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid2">
            <label>
              Franchise
              <select value={atm.franchiseId} onChange={(e) => set("franchiseId")(e.target.value)}>
                <option value="">—</option>
                {franchises.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Franchisee" value={atm.franchiseeName} onChange={set("franchiseeName")} />
            <Field label="Mobile" value={atm.mobile} onChange={set("mobile")} />
            <Field label="Email" value={atm.email} onChange={set("email")} />
            <Field label="Second email" value={atm.email2} onChange={set("email2")} />
            <Field label="Sales Officer" value={atm.salesOfficer} onChange={set("salesOfficer")} />
          </div>
        ) : null}
        {step === 3 ? (
          <div className="grid2">
            <LookupSelect label="Bank" value={atm.bankName} options={L.banks} onChange={set("bankName")} />
            <label>
              Funding path
              <select value={atm.fundingPath} onChange={(e) => set("fundingPath")(e.target.value)}>
                <option value="">—</option>
                <option>WLA</option>
                <option>Axis</option>
                <option>ICD</option>
              </select>
            </label>
            <Field label="LOI (if not in LOI register)" value={atm.loi} onChange={set("loi")} />
            <Field label="Agreement (if not in register)" value={atm.agreement} onChange={set("agreement")} />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
