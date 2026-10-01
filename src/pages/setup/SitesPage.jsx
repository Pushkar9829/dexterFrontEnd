import { useState } from "react";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { FormModal } from "../../components/common/FormModal.jsx";
import { RowEditor } from "../../components/common/RowEditor.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { api } from "../../services/api.js";
import { optPair } from "../../utils/format.js";

export function SitesPage({ office, user, lookups, sites, atms, franchises, onReload, setError, setNotice }) {
  const L = lookups || {};
  const [query, setQuery] = useState("");
  const [attn, setAttn] = useState("");
  const atmsBySite = new Map();
  (atms || []).forEach((a) => a.siteId && atmsBySite.set(a.siteId, [...(atmsBySite.get(a.siteId) || []), a.atmId]));
  const frName = (id) => (franchises.find((f) => String(f._id) === String(id)) || {}).name;
  const ATTN = [
    ["noatm", "No ATM yet", (s) => !atmsBySite.has(s.siteId)],
    ["nofr", "No franchise", (s) => !s.franchiseId || !frName(s.franchiseId)],
    ["nogeo", "No lat / lng", (s) => !s.lat || !s.lng],
    ["noregion", "No region", (s) => !s.region],
  ];
  const attnTest = (ATTN.find(([k]) => k === attn) || [])[2];
  const siteFields = [
    { k: "locationName", label: "Location name" },
    { k: "address", label: "Address" },
    { k: "landmark", label: "Landmark" },
    { k: "city", label: "City", options: L.cities || [] },
    { k: "district", label: "District", options: L.districts || [] },
    { k: "state", label: "State", options: L.states || [] },
    { k: "zone", label: "Zone", options: L.zones || [] },
    { k: "region", label: "Region", options: L.regions || [] },
    { k: "siteType", label: "Site type", options: L.siteTypes || [] },
    { k: "pin", label: "PIN" },
    { k: "lat", label: "Lat" },
    { k: "lng", label: "Lng" },
    { k: "franchiseId", label: "Franchise", options: franchises.map((f) => [String(f._id), f.name + (f.layer && f.layer !== "Franchise" ? " (" + f.layer.replace("Franchise", "") + ")" : "")]) },
  ];
  const q = query.trim().toLowerCase();
  const rows = sites.filter(
    (s) => (!attnTest || attnTest(s)) && (!q || [s.siteId, s.locationName, s.address, s.city, s.district, s.region, ...(atmsBySite.get(s.siteId) || [])].some((v) => String(v || "").toLowerCase().includes(q)))
  );

  async function add(e) {
    const t = e.target;
    try {
      const body = { siteId: t.siteId.value };
      siteFields.forEach((x) => t[x.k] && (body[x.k] = t[x.k].value));
      await api("/api/sites", { method: "POST", body: JSON.stringify(body) });
      setNotice("Site saved");
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
          <input type="search" placeholder="Search site ID, location, city, ATM…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            {ATTN.map(([k, label, f]) => {
              const n = sites.filter(f).length;
              return n || attn === k ? (
                <button key={k} type="button" className={"chip warn" + (attn === k ? " active" : "")} onClick={() => setAttn(attn === k ? "" : k)}>
                  ⚠ {label} <b>{n}</b>
                </button>
              ) : null;
            })}
          </div>
          <span className="meta">{rows.length} of {sites.length} sites</span>
          <span className="spacer" />
          {office ? (
            <FormModal button="+ New site" title="New site" size="lg" submitLabel="Save site" onSubmit={add}>
              <div className="grid2">
                <label>
                  Site ID <input name="siteId" required />
                </label>
                {siteFields.map((x) =>
                  x.options ? (
                    <label key={x.k}>
                      {x.label}
                      <select name={x.k} defaultValue="">
                        <option value="">—</option>
                        {x.options.map(optPair).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
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
            </FormModal>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>Site ID</th>
              <th>Location</th>
              <th>Type</th>
              <th>City / district</th>
              <th>Region / zone</th>
              <th>Franchise</th>
              <th>ATMs</th>
              {office ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s._id}>
                <td>
                  <strong>{s.siteId}</strong>
                </td>
                <td>{s.locationName || s.address}</td>
                <td>{s.siteType ? <StatusBadge value={s.siteType} tone="info" /> : ""}</td>
                <td>{[s.city, s.district].filter(Boolean).join(" / ")}</td>
                <td>{[s.region, s.zone].filter(Boolean).join(" / ")}</td>
                <td>{frName(s.franchiseId) || <StatusBadge value="No franchise" tone="warn" />}</td>
                <td>{atmsBySite.has(s.siteId) ? atmsBySite.get(s.siteId).join(", ") : <StatusBadge value="No ATM" tone="none" />}</td>
                {office ? (
                  <td>
                    <RowEditor row={{ ...s, franchiseId: s.franchiseId ? String(s.franchiseId) : "" }} path={"/api/sites/" + s._id} fields={siteFields} onDone={onReload} setError={setError} setNotice={setNotice} />
                  </td>
                ) : null}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={office ? 8 : 7} className="empty">
                  No sites match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ExtraColumns register="site" rows={sites} rowLabel={(s) => s.siteId} office={office} admin={office && user && !user.fieldStaff} setError={setError} setNotice={setNotice} onReload={onReload} />
    </>
  );
}
