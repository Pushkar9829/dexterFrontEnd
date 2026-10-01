import { useState } from "react";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { Field } from "../../components/common/Field.jsx";
import { FormModal } from "../../components/common/FormModal.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { RowEditor } from "../../components/common/RowEditor.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { api } from "../../services/api.js";
import { humanize } from "../../utils/format.js";

const EMPLOYEE_STATUSES = ["Active", "Inactive", "On Leave", "Unavailable", "Suspended", "Resigned", "Exited"];
const STATUS_TONE = { Active: "good", "On Leave": "warn", Unavailable: "warn", Suspended: "bad", Resigned: "none", Exited: "none", Inactive: "none" };
const FR_LAYERS = ["Franchise", "MasterFranchise", "SuperMasterFranchise"];

export function EmployeesPage({ office, user, lookups, users, employees, onReload, setError, setNotice }) {
  const L = lookups || {};
  const admin = office && user && !user.fieldStaff;
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [login, setLogin] = useState(null);
  const [busy, setBusy] = useState(false);
  const officeLayers = (user.creatableLayers || []).filter((h) => !FR_LAYERS.includes(h));
  const userBy = new Map((users || []).map((u) => [String(u._id), u]));
  const linkedIds = new Set(employees.filter((x) => x.userId).map((x) => String(x.userId)));
  const linkedUser = (x) => (x.userId ? userBy.get(String(x.userId)) : null);
  const noLogin = (x) => !x.userId && (x.employmentStatus || "Active") === "Active";
  const loginStillOn = (x) => {
    const u = linkedUser(x);
    return u && u.active && (x.employmentStatus || "Active") !== "Active";
  };

  const q = query.trim().toLowerCase();
  const matchState = (x) =>
    !state || (state === "nologin" ? noLogin(x) : state === "loginon" ? loginStillOn(x) : (x.employmentStatus || "Active") === state);
  const rows = employees.filter(
    (x) => matchState(x) && (!q || [x.name, x.department, x.designation, x.region, x.team, x.hrmsEmployeeId, x.location, (x.skills || []).join(" ")].some((v) => String(v || "").toLowerCase().includes(q)))
  );
  const count = (f) => employees.filter(f).length;

  const linkOptions = (x) =>
    (users || [])
      .filter((u) => String(u._id) === String(x.userId || "") || (!linkedIds.has(String(u._id)) && (user.creatableLayers || []).includes(u.hierarchy) && u._id !== user.id))
      .map((u) => [String(u._id), u.name + " · " + u.login + (u.active ? "" : " (inactive)")]);

  async function add(e) {
    const t = e.target;
    try {
      await api("/api/employees", {
        method: "POST",
        body: JSON.stringify({
          name: t.name.value,
          department: t.department.value,
          designation: t.designation.value,
          reportingManager: t.reportingManager.value,
          employmentStatus: t.employmentStatus.value,
          hrmsEmployeeId: t.hrmsEmployeeId.value,
          region: t.region.value,
          team: t.team.value,
          location: t.location.value,
          skills: t.skills.value,
        }),
      });
      setNotice("Employee saved (HRMS id reserved)");
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }

  function startLogin(x) {
    setLogin({ employeeId: x._id, employee: x.name, name: x.name, login: "", password: "", mobile: "", email: "", hierarchy: officeLayers.includes("SubAdmin") ? "SubAdmin" : officeLayers[0] || "", team: x.team || "", scopeRegion: x.region || "" });
  }

  async function createLogin() {
    setBusy(true);
    try {
      const made = await api("/api/users", {
        method: "POST",
        body: JSON.stringify({ login: login.login, password: login.password, name: login.name, mobile: login.mobile, email: login.email, hierarchy: login.hierarchy, team: login.team, scopeRegion: login.scopeRegion, projectIds: [] }),
      });
      await api("/api/employees/" + login.employeeId, { method: "PATCH", body: JSON.stringify({ userId: made.id }) });
      setNotice("Login " + login.login + " created inactive and linked to " + login.employee + ". Activate it under Users.");
      setLogin(null);
      onReload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const chip = (key, label, n, warn) =>
    n || state === key ? (
      <button key={key} type="button" className={"chip" + (warn ? " warn" : "") + (state === key ? " active" : "")} onClick={() => setState(state === key ? "" : key)}>
        {warn ? "⚠ " : ""}
        {label} <b>{n}</b>
      </button>
    ) : null;

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Search name, department, team…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            <button type="button" className={"chip" + (!state ? " active" : "")} onClick={() => setState("")}>
              All <b>{employees.length}</b>
            </button>
            {EMPLOYEE_STATUSES.map((s) => chip(s, s, count((x) => (x.employmentStatus || "Active") === s)))}
            {chip("nologin", "Without CRM user", count(noLogin), true)}
            {chip("loginon", "Not active, login still on", count(loginStillOn), true)}
          </div>
          <span className="spacer" />
          <span className="meta">Manual entry; the HRMS adapter is off.</span>
          {office ? (
            <FormModal button="+ New employee" title="New employee" submitLabel="Save employee" onSubmit={add}>
              <div className="grid2">
                <label>
                  Name <input name="name" required />
                </label>
                <label>
                  Department <input name="department" />
                </label>
                <label>
                  Designation <input name="designation" />
                </label>
                <label>
                  Reporting manager <input name="reportingManager" />
                </label>
                <label>
                  Region
                  <select name="region" defaultValue="">
                    <option value="">—</option>
                    {(L.regions || []).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Team
                  <select name="team" defaultValue="">
                    <option value="">—</option>
                    {(L.teams || []).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select name="employmentStatus" defaultValue="Active">
                    {EMPLOYEE_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  HRMS Employee ID <input name="hrmsEmployeeId" />
                </label>
                <label>
                  Location <input name="location" placeholder="Base city / office" />
                </label>
                <label>
                  Skills <input name="skills" placeholder="Comma separated, e.g. Hitachi ATM, UPS, Networking" />
                </label>
              </div>
            </FormModal>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Dept</th>
              <th>Designation</th>
              <th>Region / team</th>
              <th>Status</th>
              <th>CRM login</th>
              <th>HRMS id</th>
              {office ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const u = linkedUser(x);
              return (
                <tr key={x._id}>
                  <td>
                    <strong>{x.name}</strong>
                    {x.reportingManager ? <div className="meta">Reports to {x.reportingManager}</div> : null}
                  </td>
                  <td>{x.department}</td>
                  <td>{x.designation}</td>
                  <td>
                    {[x.region, x.team].filter(Boolean).join(" / ")}
                    {x.location ? <div className="meta">{x.location}</div> : null}
                    {(x.skills || []).length ? <div className="meta">Skills: {x.skills.join(", ")}</div> : null}
                  </td>
                  <td>
                    <StatusBadge value={x.employmentStatus || "Active"} tone={STATUS_TONE[x.employmentStatus || "Active"]} />
                    {x.statusReason && (x.employmentStatus || "Active") !== "Active" ? <div className="meta">{x.statusReason}</div> : null}
                  </td>
                  <td>
                    {u ? (
                      <div className="chips">
                        <span>{u.login}</span>
                        <StatusBadge value={u.active ? "Active" : "Inactive"} tone={loginStillOn(x) ? "bad" : undefined} />
                      </div>
                    ) : x.userId ? (
                      <span className="meta">Login not in this company</span>
                    ) : (
                      <StatusBadge value="No CRM user" tone="none" />
                    )}
                  </td>
                  <td>{x.hrmsEmployeeId || "—"}</td>
                  {office ? (
                    <td>
                      <div className="actions-cell">
                        {!x.userId && officeLayers.length && (x.employmentStatus || "Active") === "Active" ? (
                          <button className="btn primary" type="button" onClick={() => startLogin(x)}>
                            + Create login
                          </button>
                        ) : null}
                        <RowEditor
                          row={{ ...x, userId: x.userId ? String(x.userId) : "", skills: (x.skills || []).join(", ") }}
                          path={"/api/employees/" + x._id}
                          fields={[
                            { k: "name", label: "Name" },
                            { k: "department", label: "Department" },
                            { k: "designation", label: "Designation" },
                            { k: "reportingManager", label: "Reporting manager" },
                            { k: "employmentStatus", label: "Status (not Active blocks login)", options: EMPLOYEE_STATUSES, blank: false },
                            { k: "statusReason", label: "Status reason" },
                            { k: "location", label: "Location" },
                            { k: "skills", label: "Skills (comma separated)" },
                            { k: "region", label: "Region", options: L.regions || [] },
                            { k: "team", label: "Team", options: L.teams || [] },
                            { k: "hrmsEmployeeId", label: "HRMS Employee ID" },
                            { k: "userId", label: "Linked login (unlinked logins you can manage)", options: linkOptions(x) },
                          ]}
                          onDone={onReload}
                          setError={setError}
                          setNotice={setNotice}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={office ? 8 : 7} className="empty">
                  No employees match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ExtraColumns register="employee" rows={employees} rowLabel={(x) => x.name} office={office} admin={admin} setError={setError} setNotice={setNotice} onReload={onReload} />

      <Modal
        open={!!login}
        size="md"
        title={"Create CRM login — " + ((login && login.employee) || "")}
        subtitle="Created inactive and linked to this employee. Set role, scope and activation under Users."
        onClose={() => !busy && setLogin(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setLogin(null)}>
              Cancel
            </button>
            <button className="btn good" type="button" disabled={busy || !login || !login.login.trim() || !login.password || !login.name.trim() || !login.hierarchy} onClick={createLogin}>
              {busy ? "Creating…" : "Create and link"}
            </button>
          </>
        }
      >
        {login ? (
          <div className="grid2">
            <Field label="Login" value={login.login} onChange={(v) => setLogin({ ...login, login: v })} />
            <Field label="Password" value={login.password} onChange={(v) => setLogin({ ...login, password: v })} type="password" />
            <Field label="Name" value={login.name} onChange={(v) => setLogin({ ...login, name: v })} />
            <label>
              Hierarchy
              <select value={login.hierarchy} onChange={(e) => setLogin({ ...login, hierarchy: e.target.value })}>
                {officeLayers.map((h) => (
                  <option key={h} value={h}>
                    {humanize(h)}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Mobile" value={login.mobile} onChange={(v) => setLogin({ ...login, mobile: v })} />
            <Field label="Email" value={login.email} onChange={(v) => setLogin({ ...login, email: v })} type="email" />
            <p className="meta span-all">Team and region are copied from the employee record{login.team || login.scopeRegion ? " (" + [login.scopeRegion, login.team].filter(Boolean).join(" / ") + ")" : ""}.</p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
