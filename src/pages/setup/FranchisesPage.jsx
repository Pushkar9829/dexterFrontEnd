import { useState } from "react";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { FormModal } from "../../components/common/FormModal.jsx";
import { RowEditor } from "../../components/common/RowEditor.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api } from "../../services/api.js";
import { setFocus } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";

const FRANCHISE_STATUSES = ["Active", "Inactive", "Under Process", "Suspended", "Closed"];
const LAYERS = ["SuperMasterFranchise", "MasterFranchise", "Franchise"];
const LAYER_TONE = { SuperMasterFranchise: "bad", MasterFranchise: "warn", Franchise: "info" };
const OWNER_FIELDS = [
  { k: "ownerName", label: "Owner / proprietor" },
  { k: "ownershipType", label: "Ownership", options: ["Proprietor", "Partnership", "Company", "LLP"] },
  { k: "partners", label: "Partners (comma separated)" },
  { k: "contactName", label: "Contact person" },
  { k: "mobile", label: "Mobile" },
  { k: "whatsapp", label: "WhatsApp number" },
  { k: "altMobile", label: "Alternate mobile" },
  { k: "email", label: "Email" },
  { k: "altEmail", label: "Alternate email" },
];
const BANK_FIELDS = [
  { k: "gstin", label: "GSTIN" },
  { k: "pan", label: "PAN" },
  { k: "panName", label: "Name on PAN" },
  { k: "bankName", label: "Bank" },
  { k: "accountHolder", label: "Account holder" },
  { k: "accountNumber", label: "Account number" },
  { k: "ifsc", label: "IFSC" },
];
const ADDRESS_FIELDS = [
  { k: "address", label: "Address" },
  { k: "city", label: "City" },
  { k: "state", label: "State" },
  { k: "circle", label: "Circle" },
  { k: "pin", label: "PIN" },
];
const FRANCHISE_MASTER_FIELDS = [...OWNER_FIELDS, ...BANK_FIELDS, ...ADDRESS_FIELDS];

const STEPS = [
  { key: "node", label: "Node", hint: "Layer and parent" },
  { key: "owner", label: "Owner & contact" },
  { key: "bank", label: "Bank & tax" },
  { key: "address", label: "Address" },
];

function Inputs({ fields }) {
  return (
    <div className="grid2">
      {fields.map((x) =>
        x.options ? (
          <label key={x.k}>
            {x.label}
            <select name={x.k} defaultValue="">
              <option value="">—</option>
              {x.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ) : (
          <label key={x.k}>
            {x.label} <input name={x.k} />
          </label>
        )
      )}
    </div>
  );
}

const mask = (n) => (n ? "••••" + String(n).slice(-4) : "");
const BLOCKING = ["Suspended", "Closed"];

export function FranchisesPage({ office, user, franchises, users, canOpen360, setPage, onReload, setError, setNotice }) {
  const [layer, setLayer] = useState("");
  const [query, setQuery] = useState("");
  const [attn, setAttn] = useState("");
  const [nn, setNn] = useState({ layer: "Franchise", superMasterId: "", masterId: "" });
  const supers = franchises.filter((f) => f.layer === "SuperMasterFranchise").map((f) => [String(f._id), f.name]);
  const masterNodes = franchises.filter((f) => f.layer === "MasterFranchise");
  const masters = masterNodes.map((f) => [String(f._id), f.name + (f.superMasterId ? "" : " (no Super Master)")]);
  const mastersUnder = (sid) => masterNodes.filter((m) => !sid || String(m.superMasterId || "") === sid).map((f) => [String(f._id), f.name]);
  const withLogin = new Set((users || []).filter((u) => u.franchiseId && u.active).map((u) => String(u.franchiseId)));
  const live = (f) => !["Closed", "Inactive"].includes(f.status || "Active");
  const ATTN = [
    ["payout", "Payout account not verified", (f) => live(f) && !f.payoutAccount],
    ["gstin", "No GSTIN", (f) => live(f) && !f.gstin],
    ["pan", "No PAN", (f) => live(f) && f.layer === "Franchise" && !f.pan],
    ["kyc", "KYC not started / rejected", (f) => live(f) && ["Not started", "Rejected"].includes(f.kycStatus)],
    ...(users && users.length ? [["login", "No active login", (f) => live(f) && !withLogin.has(String(f._id))]] : []),
    ["orphan", "Missing parent", (f) => (f.layer === "Franchise" && !f.masterId && !f.superMasterId) || (f.layer === "MasterFranchise" && !f.superMasterId)],
  ];
  const attnTest = (ATTN.find(([k]) => k === attn) || [])[2];
  const q = query.trim().toLowerCase();
  const inLayer = franchises.filter((f) => !layer || f.layer === layer);
  const rows = inLayer.filter(
    (f) => (!attnTest || attnTest(f)) && (!q || [f.name, f.ownerName, f.contactName, f.mobile, f.whatsapp, f.city, f.gstin, f.pan, f.circle].some((v) => String(v || "").toLowerCase().includes(q)))
  );

  function moveFields(f) {
    const base = [{ k: "name", label: "Name" }, { k: "status", label: "Status (Suspended / Closed blocks its logins)", options: FRANCHISE_STATUSES, blank: false }, ...FRANCHISE_MASTER_FIELDS];
    if (f.layer === "MasterFranchise") base.push({ k: "superMasterId", label: "Move under Super Master", options: supers });
    if (f.layer === "Franchise") base.push({ k: "masterId", label: "Move under Master (brings its Super Master)", options: masters }, { k: "superMasterId", label: "Or directly under Super Master (no Master)", options: supers });
    return base;
  }

  function editWarning(b, row) {
    if (b.status && BLOCKING.includes(b.status) && !BLOCKING.includes(row.status)) {
      return "Mark " + row.name + " as " + b.status + "? Its users are logged out at once and cannot log in until it is reactivated.";
    }
    if (b.superMasterId !== undefined || b.masterId !== undefined) {
      const kids = franchises.filter((x) => String(x.masterId || "") === String(row._id)).length;
      return "Move " + row.name + " in the network?" + (kids ? " Its " + kids + " franchise(s) move with it." : "") + " The move is audited.";
    }
    return "";
  }

  function open360(f) {
    setFocus({ page: "fr360", id: String(f._id) });
    setPage("fr360");
  }
  async function add(e) {
    const t = e.target;
    try {
      await api("/api/franchises", {
        method: "POST",
        body: JSON.stringify({
          name: t.nm.value,
          layer: t.layer.value,
          superMasterId: t.superMasterId.value || undefined,
          masterId: t.masterId.value || undefined,
          status: t.status.value,
          ...Object.fromEntries(FRANCHISE_MASTER_FIELDS.filter((x) => t[x.k] && t[x.k].value).map((x) => [x.k, t[x.k].value])),
        }),
      });
      setNotice("Franchise node saved");
      setNn({ layer: "Franchise", superMasterId: "", masterId: "" });
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <Tabs
        tabs={[["", "All", franchises.length], ...LAYERS.map((l) => [l, humanize(l), franchises.filter((f) => f.layer === l).length])]}
        value={layer}
        onChange={setLayer}
      />
      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Search name, owner, city, GSTIN…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            {ATTN.map(([k, label, f]) => {
              const n = inLayer.filter(f).length;
              return n || attn === k ? (
                <button key={k} type="button" className={"chip warn" + (attn === k ? " active" : "")} onClick={() => setAttn(attn === k ? "" : k)}>
                  ⚠ {label} <b>{n}</b>
                </button>
              ) : null;
            })}
          </div>
          <span className="meta">Super Master → Master → Franchise</span>
          <span className="spacer" />
          {office ? (
            <FormModal button="+ New node" title="New franchise node" steps={STEPS} submitLabel="Add node" onSubmit={add}>
              <div className="grid2">
                <label>
                  Name <input name="nm" required />
                </label>
                <label>
                  Layer
                  <select name="layer" value={nn.layer} onChange={(e) => setNn({ layer: e.target.value, superMasterId: "", masterId: "" })}>
                    {LAYERS.map((l) => (
                      <option key={l} value={l}>
                        {humanize(l)}
                      </option>
                    ))}
                  </select>
                </label>
                {nn.layer !== "SuperMasterFranchise" ? (
                  <label>
                    Super Master
                    <select name="superMasterId" value={nn.superMasterId} onChange={(e) => setNn({ ...nn, superMasterId: e.target.value, masterId: "" })}>
                      <option value="">—</option>
                      {supers.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <input type="hidden" name="superMasterId" value="" />
                )}
                {nn.layer === "Franchise" ? (
                  <label>
                    Master {nn.superMasterId ? "(under the picked Super Master)" : ""}
                    <select name="masterId" value={nn.masterId} onChange={(e) => setNn({ ...nn, masterId: e.target.value })}>
                      <option value="">— none (sits directly under the Super Master)</option>
                      {mastersUnder(nn.superMasterId).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <input type="hidden" name="masterId" value="" />
                )}
                <label>
                  Status
                  <select name="status" defaultValue="Active">
                    {FRANCHISE_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <Inputs fields={OWNER_FIELDS} />
              <Inputs fields={BANK_FIELDS} />
              <Inputs fields={ADDRESS_FIELDS} />
            </FormModal>
          ) : null}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Layer</th>
                <th>Under</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Contact</th>
                <th>GSTIN</th>
                <th>Bank</th>
                <th>Verified payout account</th>
                <th>Address</th>
                <th>KYC</th>
                {office ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const parent = franchises.find((p) => String(p._id) === String(f.masterId || f.superMasterId || ""));
                const pa = f.payoutAccount;
                return (
                  <tr key={f._id}>
                    <td>
                      {canOpen360 ? (
                        <button type="button" className="linklike" onClick={() => open360(f)} title="Open Franchise 360">
                          <strong>{f.name}</strong>
                        </button>
                      ) : (
                        <strong>{f.name}</strong>
                      )}
                    </td>
                    <td>
                      <StatusBadge value={humanize(f.layer)} tone={LAYER_TONE[f.layer]} />
                    </td>
                    <td>{parent ? parent.name : "—"}</td>
                    <td>
                      <StatusBadge value={f.status || "Active"} />
                    </td>
                    <td>{[f.ownerName, f.ownershipType, f.partners].filter(Boolean).join(" · ")}</td>
                    <td>
                      {[f.contactName, f.mobile, f.email].filter(Boolean).join(" · ")}
                      {f.whatsapp || f.altMobile || f.altEmail ? <div className="meta">{[f.whatsapp && "WA " + f.whatsapp, f.altMobile && "alt " + f.altMobile, f.altEmail].filter(Boolean).join(" · ")}</div> : null}
                    </td>
                    <td>
                      {f.gstin || ""}
                      {f.pan ? <div className="meta">PAN {f.pan}</div> : null}
                    </td>
                    <td>{[f.bankName, mask(f.accountNumber), f.ifsc].filter(Boolean).join(" · ")}</td>
                    <td>{pa ? [pa.bank, mask(pa.accountNumber), pa.ifsc].filter(Boolean).join(" · ") : <StatusBadge value="Not verified" tone="warn" />}</td>
                    <td>{[f.address, f.city, f.state, f.pin].filter(Boolean).join(", ")}{f.circle ? <div className="meta">Circle {f.circle}</div> : null}</td>
                    <td>
                      <StatusBadge value={f.kycStatus} />
                    </td>
                    {office ? (
                      <td>
                        <RowEditor
                          row={{ ...f, status: f.status || "Active", superMasterId: f.superMasterId ? String(f.superMasterId) : "", masterId: f.masterId ? String(f.masterId) : "" }}
                          path={"/api/franchises/" + f._id}
                          label="Edit / move"
                          fields={moveFields(f)}
                          confirm={editWarning}
                          onDone={onReload}
                          setError={setError}
                          setNotice={setNotice}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={office ? 13 : 12} className="empty">
                    No franchise nodes match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="meta">Moving a Master also moves its franchises to the new Super Master. Every move is audited.</p>
      </div>
      <ExtraColumns register="franchise" rows={franchises} rowLabel={(f) => f.name} office={office} admin={office && user && !user.fieldStaff} setError={setError} setNotice={setNotice} onReload={onReload} />
    </>
  );
}
