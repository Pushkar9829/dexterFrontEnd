import { useMemo, useState } from "react";
import { askText } from "../../../components/common/Dialogs.jsx";
import { Field } from "../../../components/common/Field.jsx";
import { LookupSelect } from "../../../components/common/LookupSelect.jsx";
import { Modal } from "../../../components/common/Modal.jsx";
import { StatusBadge } from "../../../components/common/StatusBadge.jsx";
import { StepNav, Steps } from "../../../components/common/StepForm.jsx";
import { AtmGridInput } from "./AtmGridInput.jsx";
import { DOC_CHECKLIST, HITACHI_KEYS, NEAREST_KEYS, SUBMIT_DOCS, atmGrid, emptyApplication, onboardingSteps, readiness } from "./applicationForm.js";
import { api, fileToB64 } from "../../../services/api.js";
import { useFocusRow } from "../../../utils/focus.js";
import { can } from "../../../utils/perm.js";

const STEPS = [
  { key: "site", label: "Site & contact", hint: "Location, landlord" },
  { key: "shop", label: "Shop & power", hint: "Area, utilities" },
  { key: "cra", label: "CRA & nearby ATMs", hint: "Branch, competition" },
  { key: "signage", label: "Signage & address", hint: "Correspondence" },
  { key: "bank", label: "Model & bank", hint: "Payout account" },
  { key: "docs", label: "Documents", hint: "Checklist, declaration" },
];

const EDITABLE = ["Under Process", "Draft", "Resubmission"];

export function ApplicationsPage({ user, office, canDecide, lookups, franchises, applications, setApplications, documents = [], lois = [], agreements = [], atms = [], onReload, setError, setNotice }) {
  const L = lookups || {};
  const adminOverride = !!user && ["Admin", "DexterIndiaCompanyTeam"].includes(user.hierarchy);
  const canCreate = can(user, "Create", "CRM-02");
  const canEdit = adminOverride || can(user, "Edit", "CRM-02");
  const [form, setForm] = useState(emptyApplication);
  const [editingId, setEditingId] = useState("");
  const [editingStatus, setEditingStatus] = useState("");
  const canSave = editingId ? canEdit && (adminOverride || EDITABLE.includes(editingStatus || "Draft")) : canCreate;
  const appDocs = documents.filter((d) => (d.parentType || "application") === "application" && editingId && String(d.parentId) === editingId);
  const ready = readiness(form, appDocs);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { rowProps } = useFocusRow("applications", (link) => {
    setQuery("");
    setStatusFilter(link.id ? "" : link.type || "");
  }, [applications]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const counts = useMemo(() => {
    const c = {};
    applications.forEach((a) => (c[a.status] = (c[a.status] || 0) + 1));
    return c;
  }, [applications]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter(
      (a) =>
        (!statusFilter || a.status === statusFilter) &&
        (!q || [a.siteLocationName, a.city, a.siteNumber, a.state, a.agreementStatus].some((v) => String(v || "").toLowerCase().includes(q)))
    );
  }, [applications, query, statusFilter]);

  async function refresh() {
    const data = await api("/api/applications");
    setApplications(data.applications || []);
  }

  function startNew() {
    setEditingId("");
    setEditingStatus("");
    setForm(emptyApplication());
    setStep(0);
    setOpen(true);
  }

  async function saveApplication(submit) {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      let id = editingId;
      if (id) {
        await api("/api/applications/" + id, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        const created = await api("/api/applications", { method: "POST", body: JSON.stringify(form) });
        id = created.id;
      }
      if (submit) {
        await api("/api/applications/" + id, { method: "PATCH", body: JSON.stringify({ submit: true }) });
        setOpen(false);
      } else {
        setEditingId(id);
      }
      await refresh();
      setNotice(submit ? "Application submitted" : "Draft saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openApplication(a) {
    const next = emptyApplication();
    Object.keys(next).forEach((k) => {
      if (a[k] !== undefined && a[k] !== null) next[k] = k === "franchiseId" ? String(a[k]) : a[k];
    });
    next.nearestAtms = atmGrid(a.nearestAtms, NEAREST_KEYS);
    next.nearbyHitachi = atmGrid(a.nearbyHitachi, HITACHI_KEYS);
    next.docChecklist = a.docChecklist && typeof a.docChecklist === "object" ? a.docChecklist : {};
    setForm(next);
    setEditingId(a._id);
    setEditingStatus(a.status);
    setStep(0);
    setOpen(true);
  }

  async function act(fn, done) {
    try {
      await fn();
      await refresh();
      if (done) setNotice(done);
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadDoc(type, e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !editingId) return;
    try {
      const data = await fileToB64(file);
      await api("/api/documents", { method: "POST", body: JSON.stringify({ parentType: "application", parentId: editingId, type, fileName: file.name, mime: file.type, data }) });
      setNotice(type + " uploaded");
      if (onReload) onReload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendBack(a) {
    const reason = await askText("What must the applicant correct?", "", { title: "Send back — " + (a.siteLocationName || "application"), multiline: true, required: true, okLabel: "Send back" });
    if (!reason) return;
    act(() => api("/api/applications/" + a._id, { method: "PATCH", body: JSON.stringify({ sendBack: true, reason }) }), "Sent back for resubmission");
  }

  async function decideApplication(a, action) {
    const name = a.siteLocationName || "application";
    if (action === "approve") {
      let siteNumber = a.siteNumber || "";
      if (!siteNumber) {
        siteNumber = await askText("Site Number (office use) is required before approval", "", { title: "Approve site — " + name, required: true, okLabel: "Approve" });
        if (!siteNumber) return;
      }
      act(() => api("/api/applications/" + a._id, { method: "PATCH", body: JSON.stringify({ approve: true, siteNumber: siteNumber.trim() }) }), "Site approved");
      return;
    }
    const reason = await askText("Why is this application rejected? The applicant will see this.", "", { title: "Reject — " + name, multiline: true, required: true, danger: true, okLabel: "Reject" });
    if (!reason) return;
    act(() => api("/api/applications/" + a._id, { method: "PATCH", body: JSON.stringify({ reject: true, reason }) }), "Application rejected");
  }

  async function setSiteNumber(a) {
    const siteNumber = await askText("Site number for " + (a.siteLocationName || "this application"), a.siteNumber || "", { title: "Set site number", okLabel: "Save" });
    if (siteNumber === null) return;
    act(
      () =>
        api("/api/applications/" + a._id, {
          method: "PATCH",
          body: JSON.stringify({ siteNumber: siteNumber.trim(), sourcedBy: a.sourcedBy || "", sourcingCode: a.sourcingCode || "", sseSsm: a.sseSsm || "" }),
        }),
      "Site number set"
    );
  }

  const yesNo = (k, lbl, first = "Yes", second = "No") => (
    <label key={k}>
      {lbl}
      <select value={form[k]} onChange={(e) => set(k)(e.target.value)}>
        <option>{first}</option>
        <option>{second}</option>
      </select>
    </label>
  );

  function stepBody() {
    switch (STEPS[step].key) {
      case "site":
        return (
          <>
            <div className="section">
              <h4>Location</h4>
              <div className="grid2">
                <Field label="Site location name" value={form.siteLocationName} onChange={set("siteLocationName")} />
                <LookupSelect label="State" value={form.state} options={L.states} onChange={set("state")} />
                <LookupSelect label="City" value={form.city} options={L.cities} onChange={set("city")} />
                <Field label="District" value={form.district} onChange={set("district")} />
                <Field label="PIN" value={form.pin} onChange={set("pin")} />
                <LookupSelect label="Zone" value={form.zone} options={L.zones} onChange={set("zone")} />
                <Field label="Circle" value={form.circle} onChange={set("circle")} />
                <Field label="Landmark" value={form.landmark} onChange={set("landmark")} />
                <LookupSelect label="RBI category" value={form.rbiCategory} options={L.rbiCategories} onChange={set("rbiCategory")} />
                <Field label="Latitude" value={form.lat} onChange={set("lat")} />
                <Field label="Longitude" value={form.lng} onChange={set("lng")} />
                <div className="span-all">
                  <Field label="Address" value={form.address} onChange={set("address")} />
                </div>
              </div>
            </div>
            <div className="section">
              <h4>Contact and franchise</h4>
              <div className="grid2">
                <Field label="Landlord cheque name" value={form.landlordChequeName} onChange={set("landlordChequeName")} />
                <Field label="Contact" value={form.contactNumber} onChange={set("contactNumber")} />
                <Field label="Email" value={form.email} onChange={set("email")} />
                <Field label="Branch" value={form.branchName} onChange={set("branchName")} />
                <Field label="Existing ATM ID" value={form.existingAtmId} onChange={set("existingAtmId")} />
                <label>
                  Franchise
                  <select value={form.franchiseId} onChange={(e) => set("franchiseId")(e.target.value)}>
                    <option value="">—</option>
                    {franchises.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {office ? (
              <div className="section">
                <h4>Office use</h4>
                <div className="grid2">
                  <Field label="Site number" value={form.siteNumber} onChange={set("siteNumber")} />
                  <Field label="Sourced by" value={form.sourcedBy} onChange={set("sourcedBy")} />
                  <Field label="Sourcing code" value={form.sourcingCode} onChange={set("sourcingCode")} />
                  <Field label="SSE / SSM" value={form.sseSsm} onChange={set("sseSsm")} />
                </div>
              </div>
            ) : null}
          </>
        );
      case "shop":
        return (
          <>
            <div className="section">
              <h4>Shop</h4>
              <div className="grid2">
                <LookupSelect label="TIS type" value={form.tisType} options={L.tisTypes} onChange={set("tisType")} />
                <Field label="Business type" value={form.businessType} onChange={set("businessType")} />
                {yesNo("shopStatus", "Shop status", "Rented", "Owned")}
                <Field label="Alternate number" value={form.alternateNumber} onChange={set("alternateNumber")} />
                <Field label="WhatsApp number" value={form.whatsappNumber} onChange={set("whatsappNumber")} />
                <Field label="Total shop area (sq ft)" value={form.totalShopArea} onChange={set("totalShopArea")} />
                <Field label="Shop area offered" value={form.shopAreaOffered} onChange={set("shopAreaOffered")} />
                <Field label="Carpet area" value={form.carpetArea} onChange={set("carpetArea")} />
                <Field label="Frontage" value={form.frontage} onChange={set("frontage")} />
                <Field label="Depth" value={form.depth} onChange={set("depth")} />
                <Field label="Width" value={form.width} onChange={set("width")} />
                <Field label="Height" value={form.height} onChange={set("height")} />
                <div className="span-all">
                  <Field label="Correspondence address" value={form.corrAddress} onChange={set("corrAddress")} />
                </div>
              </div>
            </div>
            <div className="section">
              <h4>Power and utilities</h4>
              <div className="grid2">
                {yesNo("powerYes", "Power available")}
                {yesNo("powerPermanent", "Power", "Permanent", "Temporary")}
                <Field label="Power hours / day" value={form.powerHours} onChange={set("powerHours")} />
                {yesNo("vsat", "V-SAT possible")}
                {yesNo("acOdu", "AC ODU space")}
                {yesNo("shutter", "Shutter")}
                {yesNo("craCoverage", "CRA coverage")}
                <Field label="Signage width" value={form.signageW} onChange={set("signageW")} />
                <Field label="Signage height" value={form.signageH} onChange={set("signageH")} />
              </div>
            </div>
          </>
        );
      case "cra":
        return (
          <>
            <div className="section">
              <h4>CRA and branch</h4>
              <div className="grid2">
                <Field label="CRA agency" value={form.craAgency} onChange={set("craAgency")} />
                <Field label="Proposed branch" value={form.proposedBranch} onChange={set("proposedBranch")} />
                <Field label="BM name" value={form.bmName} onChange={set("bmName")} />
                <Field label="BM number" value={form.bmNumber} onChange={set("bmNumber")} />
                <Field label="SOL / IFSC" value={form.solIfsc} onChange={set("solIfsc")} />
                <Field label="Distance (km)" value={form.distanceKm} onChange={set("distanceKm")} />
              </div>
            </div>
            <div className="section">
              <AtmGridInput title="Nearest ATMs" keys={NEAREST_KEYS} value={form.nearestAtms} onChange={set("nearestAtms")} />
            </div>
            <div className="section">
              <AtmGridInput title="Nearby Hitachi ATMs" keys={HITACHI_KEYS} value={form.nearbyHitachi} onChange={set("nearbyHitachi")} />
            </div>
          </>
        );
      case "signage":
        return (
          <div className="section">
            <h4>Signage, frontage and correspondence</h4>
            <div className="grid2">
              {yesNo("lShapeSignage", "L-shape signage", "No", "Yes")}
              <Field label="Frontage offered" value={form.frontageOffered} onChange={set("frontageOffered")} />
              <Field label="Nearby highway / landmark notes" value={form.highwayNotes} onChange={set("highwayNotes")} />
              <Field label="Correspondence landmark" value={form.corrLandmark} onChange={set("corrLandmark")} />
              <LookupSelect label="Correspondence district" value={form.corrDistrict} options={L.districts} onChange={set("corrDistrict")} />
              <LookupSelect label="Correspondence state" value={form.corrState} options={L.states} onChange={set("corrState")} />
              <Field label="Correspondence PIN" value={form.corrPin} onChange={set("corrPin")} />
            </div>
          </div>
        );
      case "bank":
        return (
          <>
            <div className="section">
              <h4>Site and model</h4>
              <div className="grid2">
                <LookupSelect label="Site type" value={form.siteType} options={L.siteTypes} onChange={set("siteType")} />
                <LookupSelect label="Model" value={form.model} options={L.productModels} onChange={set("model")} />
                <Field label="Landlord" value={form.landlordName} onChange={set("landlordName")} />
              </div>
            </div>
            <div className="section">
              <h4>Bank account</h4>
              <div className="grid2">
                <LookupSelect label="Bank" value={form.bankName} options={L.banks} onChange={set("bankName")} />
                <Field label="Account" value={form.accountNumber} onChange={set("accountNumber")} />
                <Field label="IFSC" value={form.ifsc} onChange={set("ifsc")} />
              </div>
            </div>
          </>
        );
      default:
        return (
          <>
            <div className="section">
              <h4>Documents enclosed</h4>
              <div className="grid3">
                {DOC_CHECKLIST.map((k) => (
                  <label key={k} className="check">
                    <input
                      type="checkbox"
                      checked={form.docChecklist[k] === "Yes"}
                      onChange={(e) => set("docChecklist")({ ...form.docChecklist, [k]: e.target.checked ? "Yes" : "No" })}
                    />
                    {k}
                  </label>
                ))}
              </div>
            </div>
            <div className="section">
              <h4>Declaration</h4>
              <div className="grid2">
                <Field label="Signed by (name)" value={form.signedByName} onChange={set("signedByName")} />
                <Field label="Signed date" type="date" value={form.signedDate} onChange={set("signedDate")} />
              </div>
            </div>
            {EDITABLE.includes(editingStatus || "Draft") ? (
              <div className="section">
                <h4>Ready to submit?</h4>
                <div className="chips">
                  {ready.items.map(([label, ok]) => (
                    <span key={label} className={"badge " + (ok ? "good" : "warn")}>
                      {ok ? "✓" : "✗"} {label}
                    </span>
                  ))}
                </div>
                {ready.bad.length ? <p className="meta" style={{ color: "#b45309" }}>{ready.bad.join(" · ")}</p> : null}
                {editingId && canCreate ? (
                  <div className="toolbar">
                    {SUBMIT_DOCS.map((type) => (
                      <label key={type} className="btn ghost filebtn">
                        ⤒ Upload {type}
                        <input type="file" accept="image/*,.pdf" onChange={(e) => uploadDoc(type, e)} />
                      </label>
                    ))}
                  </div>
                ) : null}
                {!editingId ? <p className="meta">Save the draft first, then upload PAN and Aadhaar on the KYC page.</p> : null}
              </div>
            ) : null}
            <p className="meta">Upload the 15 PPT photos and KYC files on the KYC page after saving (order listed there).</p>
          </>
        );
    }
  }

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Search site, city, site no…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            <button type="button" className={"chip" + (!statusFilter ? " active" : "")} onClick={() => setStatusFilter("")}>
              All <b>{applications.length}</b>
            </button>
            {Object.keys(counts).map((s) => (
              <button key={s} type="button" className={"chip" + (statusFilter === s ? " active" : "")} onClick={() => setStatusFilter(statusFilter === s ? "" : s)}>
                {s} <b>{counts[s]}</b>
              </button>
            ))}
          </div>
          <span className="spacer" />
          {canCreate ? (
            <button className="btn primary" type="button" onClick={startNew}>
              + New application
            </button>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>Site</th>
              <th>City</th>
              <th>Site no.</th>
              <th>Status</th>
              <th>Onboarding progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a._id} {...rowProps(a)}>
                <td>
                  <strong>{a.siteLocationName || "—"}</strong>
                </td>
                <td>{a.city}</td>
                <td>{a.siteNumber || ""}</td>
                <td>
                  <StatusBadge value={a.status} />
                  {a.status === "Resubmission" && a.sendBackReason ? <div className="meta">{a.sendBackReason}</div> : null}
                  {a.status === "Rejected" && a.decisionReason ? <div className="meta">{a.decisionReason}</div> : null}
                </td>
                <td>
                  <div className="chips">
                    {onboardingSteps(a, { documents, lois, agreements, atms })
                      .slice(1)
                      .map(([label, value, tone]) => (
                        <span key={label} className={"badge " + (tone === "none" ? "" : tone)} title={label + ": " + value}>
                          {label} {value}
                        </span>
                      ))}
                  </div>
                </td>
                <td>
                  <div className="actions-cell">
                    {EDITABLE.includes(a.status) || office ? (
                      <button className="btn ghost" type="button" onClick={() => openApplication(a)}>
                        {canEdit && (adminOverride || EDITABLE.includes(a.status)) ? "Open" : "View"}
                      </button>
                    ) : null}
                    {(office && canEdit && (adminOverride || EDITABLE.includes(a.status))) || (canDecide && canEdit && a.status === "Submitted") ? (
                      <button className="btn ghost" type="button" onClick={() => setSiteNumber(a)}>
                        Site no.
                      </button>
                    ) : null}
                    {canDecide && a.status === "Submitted" ? (
                      <>
                        <button className="btn good" type="button" onClick={() => decideApplication(a, "approve")}>
                          Approve
                        </button>
                        <button className="btn warn" type="button" onClick={() => sendBack(a)}>
                          Send back
                        </button>
                        <button className="btn bad" type="button" onClick={() => decideApplication(a, "reject")}>
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="empty">
                  {applications.length ? "No application matches the filter." : "No applications yet. Use “New application” to start one."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        size="xl"
        title={editingId ? "Edit application — " + (form.siteLocationName || "untitled") : "New WLA application"}
        subtitle={editingId ? <StatusBadge value={editingStatus || "Draft"} /> : "Save a draft at any step; submit from the last step."}
        onClose={() => !saving && setOpen(false)}
        footer={
          <StepNav current={step} total={STEPS.length} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)}>
            {canSave ? (
              <button className="btn ghost" type="button" disabled={saving} onClick={() => saveApplication(false)}>
                {saving ? "Saving…" : "Save draft"}
              </button>
            ) : (
              <span className="meta">Read only</span>
            )}
            {canSave && step === STEPS.length - 1 && EDITABLE.includes(editingStatus || "Draft") ? (
              <button className="btn good" type="button" disabled={saving || !ready.ready} title={ready.ready ? "" : "Complete the checklist above first"} onClick={() => saveApplication(true)}>
                Submit application
              </button>
            ) : null}
          </StepNav>
        }
      >
        <Steps steps={STEPS} current={step} onPick={setStep} />
        {stepBody()}
      </Modal>
    </>
  );
}
