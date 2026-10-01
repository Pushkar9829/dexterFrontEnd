import { useEffect, useMemo, useState } from "react";
import { askConfirm, askText } from "../../../components/common/Dialogs.jsx";
import { Field } from "../../../components/common/Field.jsx";
import { LookupSelect } from "../../../components/common/LookupSelect.jsx";
import { Modal } from "../../../components/common/Modal.jsx";
import { StatusBadge } from "../../../components/common/StatusBadge.jsx";
import { StepNav, Steps } from "../../../components/common/StepForm.jsx";
import { Tabs } from "../../../components/common/Tabs.jsx";
import { ProjectPicks } from "./ProjectPicks.jsx";
import { api } from "../../../services/api.js";
import { humanize } from "../../../utils/format.js";

const EMPTY_USER = {
  login: "",
  password: "",
  name: "",
  mobile: "",
  email: "",
  hierarchy: "Franchise",
  franchiseId: "",
  functionalRole: "",
  scopeRegion: "",
  team: "",
  projectIds: [],
  roleTemplate: "",
  actions: [],
  modules: [],
  recordScope: "all",
};

const ROLES = ["", "Verifier", "Executive", "SalesOfficer", "Finance", "ServiceProjectOps", "Inspector", "Auditor", "Viewer", "HR"];
const ROLE_HINT = { Auditor: "read-only everywhere", Viewer: "read-only desk view", HR: "employees, users, teams" };
const BLANK_TPL = { key: "", name: "", description: "", hierarchy: "SubAdmin", functionalRole: "", actions: ["View"], modules: [], recordScope: "all" };
const FR_LAYERS = ["Franchise", "MasterFranchise", "SuperMasterFranchise"];
const MODULES = [
  ["CRM-01", "Setup"],
  ["CRM-02", "Onboarding"],
  ["CRM-03", "Projects, sites & ATMs"],
  ["CRM-04", "Operations & finance"],
  ["CRM-05", "Service"],
  ["CRM-06", "Tasks"],
  ["CRM-07", "Dashboards"],
  ["CRM-08", "Audit & governance"],
];
const STALE_DAYS = 30;
const ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Reject", "Assign", "Export", "Close"];
const NEW_STEPS = [
  { key: "account", label: "Account", hint: "Login and password" },
  { key: "role", label: "Role", hint: "Layer and function" },
  { key: "scope", label: "Scope", hint: "Region, team, projects" },
];

export function UsersPage({ user, office, lookups, franchises, projects, companies, users, setUsers, onReload, setError, setNotice }) {
  const L = lookups || {};
  const adminLayer = ["Admin", "DexterIndiaCompanyTeam"].includes(user.hierarchy);
  const [newUser, setNewUser] = useState(null);
  const [newStep, setNewStep] = useState(0);
  const [editUser, setEditUser] = useState(null);
  const [editTab, setEditTab] = useState("role");
  const [move, setMove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [tpl, setTpl] = useState({ templates: [], canEdit: false });
  const [tplOpen, setTplOpen] = useState(false);
  const [tplEdit, setTplEdit] = useState(null);

  async function loadTemplates() {
    try {
      setTpl(await api("/api/role-templates"));
    } catch {
      setTpl({ templates: [], canEdit: false });
    }
  }

  useEffect(() => {
    if (office) loadTemplates();
  }, [office]);

  const tplName = (key) => (tpl.templates.find((t) => t.key === key) || {}).name || "";

  // Fills role, actions, modules and record scope from a template; the admin can still adjust before saving.
  function fromTemplate(cur, key) {
    if (!key) return { roleTemplate: "" };
    const t = tpl.templates.find((x) => x.key === key);
    if (!t) return {};
    if (!(user.creatableLayers || []).includes(t.hierarchy)) {
      setError("You cannot create " + humanize(t.hierarchy) + " users, so the " + t.name + " template is not available to you.");
      return {};
    }
    return { ...layerPatch(cur, t.hierarchy), roleTemplate: t.key, functionalRole: t.functionalRole, actions: [...t.actions], modules: [...t.modules], recordScope: t.recordScope || "all" };
  }

  async function saveTemplates(custom, done) {
    const ok = await run(async () => {
      await api("/api/role-templates", { method: "PUT", body: JSON.stringify({ templates: custom }) });
      await loadTemplates();
    }, done);
    return ok;
  }

  async function saveTemplate() {
    const custom = tpl.templates.filter((t) => !t.builtIn && t.key !== tplEdit.key);
    const row = { ...tplEdit };
    if (!row.key) delete row.key;
    if (await saveTemplates([...custom, row], "Template saved")) setTplEdit(null);
  }

  async function removeTemplate(t) {
    if (!(await askConfirm("Remove the " + t.name + " template? Users already created with it keep their permissions.", { danger: true, okLabel: "Remove" }))) return;
    saveTemplates(tpl.templates.filter((x) => !x.builtIn && x.key !== t.key), "Template removed");
  }

  const templateSelect = (value, onPick) => (
    <label className="span-all">
      Start from role template
      <select value={value || ""} onChange={(e) => onPick(e.target.value)}>
        <option value="">— none (set by hand) —</option>
        {tpl.templates.map((t) => (
          <option key={t.key} value={t.key} disabled={!(user.creatableLayers || []).includes(t.hierarchy)}>
            {t.name} · {humanize(t.hierarchy)}
            {t.functionalRole ? " / " + humanize(t.functionalRole) : ""}
            {t.builtIn ? "" : " (custom)"}
          </option>
        ))}
      </select>
      {value ? <span className="meta">{(tpl.templates.find((t) => t.key === value) || {}).description}</span> : null}
    </label>
  );

  const isLocked = (u) => u.lockedUntil && new Date(u.lockedUntil) > new Date();
  const canManage = (u) => office && (user.creatableLayers || []).includes(u.hierarchy) && u._id !== user.id;
  const ATTN = useMemo(() => {
    const staleAt = Date.now() - STALE_DAYS * 86400000;
    return [
      ["locked", "Locked / failed logins", (u) => isLocked(u) || u.failedLogins > 0],
      ["mfaoff", "MFA off", (u) => u.active && u.mfaRequired === false],
      ["left", "Left employer, login active", (u) => u.active && u.employmentStatus && u.employmentStatus !== "Active"],
      ["stale", "No login " + STALE_DAYS + "d+", (u) => u.active && (!u.lastLoginAt || new Date(u.lastLoginAt).getTime() < staleAt)],
      ["frnode", "Franchise user without node", (u) => FR_LAYERS.includes(u.hierarchy) && !u.franchiseId],
    ];
  }, []);
  const counts = useMemo(
    () => ({ active: users.filter((u) => u.active).length, inactive: users.filter((u) => !u.active).length, ...Object.fromEntries(ATTN.map(([k, , f]) => [k, users.filter(f).length])) }),
    [users, ATTN]
  );
  const q = query.trim().toLowerCase();
  const attnTest = (ATTN.find(([k]) => k === state) || [])[2];
  const rows = users.filter(
    (u) =>
      (!state || (state === "active" ? u.active : state === "inactive" ? !u.active : attnTest ? attnTest(u) : true)) &&
      (!q || [u.login, u.name, u.hierarchy, u.functionalRole, u.mobile, u.email].some((v) => String(v || "").toLowerCase().includes(q)))
  );

  async function refresh() {
    const data = await api("/api/users");
    setUsers(data.users || []);
  }

  async function run(fn, done) {
    setBusy(true);
    try {
      await fn();
      if (done) setNotice(done);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveUserEdit() {
    const body = {
      hierarchy: editUser.hierarchy,
      functionalRole: editUser.functionalRole || "",
      franchiseId: editUser.franchiseId || "",
      actions: editUser.actions || [],
      modules: editUser.modules || [],
      scopeRegion: editUser.scopeRegion || "",
      team: editUser.team || "",
      projectIds: editUser.projectIds || [],
      recordScope: editUser.recordScope || "all",
      scopeAtmIds: String(editUser.scopeAtmIdsText || ""),
      scopeSiteIds: String(editUser.scopeSiteIdsText || ""),
      scopeTicketCategories: String(editUser.scopeTicketCategoriesText || ""),
      scopeDockets: String(editUser.scopeDocketsText || ""),
      roleTemplate: editUser.roleTemplate || "",
    };
    if (adminLayer) body.mfaRequired = editUser.mfaRequired !== false;
    if (user.hierarchy === "DexterIndiaCompanyTeam" && body.hierarchy === "DexterIndiaCompanyTeam") body.grantedCompanyIds = editUser.grantedCompanyIds || [];
    const ok = await run(async () => {
      await api("/api/users/" + editUser._id, { method: "PATCH", body: JSON.stringify(body) });
      await refresh();
    }, "User role / scope updated. Takes effect on the user's next request.");
    if (ok) setEditUser(null);
  }

  async function resetUserMfa(u) {
    if (!(await askConfirm("Remove the authenticator app and recovery codes of " + u.login + "? They fall back to one-time codes.", { danger: true, okLabel: "Reset MFA" }))) return;
    run(async () => {
      await api("/api/users/" + u._id, { method: "PATCH", body: JSON.stringify({ resetMfa: true }) });
      await refresh();
    }, "MFA reset for " + u.login);
  }

  async function resetPassword(u) {
    const password = await askText("New password for " + u.login + ". They are logged out everywhere and must use it at the next login.", "", { okLabel: "Reset password", inputType: "password", required: true, title: "Reset password" });
    if (!password) return;
    run(async () => {
      await api("/api/users/" + u._id + "/reset-password", { method: "POST", body: JSON.stringify({ password }) });
      await refresh();
    }, "Password reset for " + u.login + ". Share it with them over a trusted channel.");
  }

  async function saveProfile() {
    const ok = await run(async () => {
      await api("/api/users/" + editUser._id, { method: "PATCH", body: JSON.stringify({ name: eu.name || "", mobile: eu.mobile || "", email: eu.email || "" }) });
      await refresh();
    }, "Profile updated");
    if (ok) setEditUser(null);
  }

  function startMove(u) {
    const others = companies.filter((c) => c._id !== user.companyId);
    if (!others.length) return setError("You hold no other company to move into");
    setMove({ id: u._id, label: u.login, targetCompanyId: others[0]._id, reason: "" });
  }

  async function doMove() {
    const target = companies.find((c) => c._id === move.targetCompanyId);
    const ok = await run(async () => {
      await api("/api/company-move", { method: "POST", body: JSON.stringify({ type: "user", id: move.id, targetCompanyId: move.targetCompanyId, reason: move.reason }) });
      onReload();
    }, move.label + " moved to " + (target ? target.name : "the company"));
    if (ok) setMove(null);
  }

  async function deactivateUser(u) {
    if (!(await askConfirm("Deactivate " + u.login + "? They are logged out and cannot log in.", { danger: true, okLabel: "Deactivate" }))) return;
    run(async () => {
      await api("/api/users/" + u._id, { method: "PATCH", body: JSON.stringify({ active: false }) });
      await refresh();
    }, "User deactivated");
  }

  function unlockUser(u) {
    run(async () => {
      await api("/api/users/" + u._id + "/unlock", { method: "PATCH" });
      await refresh();
    }, u.login + " unlocked");
  }

  function activateUser(id) {
    run(async () => {
      await api("/api/users/" + id + "/activate", { method: "PATCH" });
      await refresh();
    }, "User activated");
  }

  async function saveUser() {
    setError("");
    const ok = await run(async () => {
      await api("/api/users", { method: "POST", body: JSON.stringify(newUser) });
      await refresh();
    }, "User created inactive. Activate before they can log in.");
    if (ok) setNewUser(null);
  }

  function openEdit(u) {
    setEditTab("profile");
    setEditUser({
      ...u,
      franchiseId: u.franchiseId ? String(u.franchiseId) : "",
      grantedCompanyIds: (u.grantedCompanyIds || []).map(String),
      projectIds: (u.projectIds || []).map(String),
      scopeAtmIdsText: (u.scopeAtmIds || []).join(", "),
      scopeSiteIdsText: (u.scopeSiteIds || []).join(", "),
      scopeTicketCategoriesText: (u.scopeTicketCategories || []).join(", "),
      scopeDocketsText: (u.scopeDockets || []).join(", "),
    });
  }

  const franchiseSelect = (value, onChange, label, layer) => {
    if (!FR_LAYERS.includes(layer)) return null;
    const nodes = franchises.filter((f) => !f.layer || f.layer === layer);
    return (
      <label>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {nodes.map((f) => (
            <option key={f._id} value={f._id}>
              {f.name}
              {f.status && f.status !== "Active" ? " (" + f.status + ")" : ""}
            </option>
          ))}
        </select>
        {!nodes.length ? <span className="meta">No {humanize(layer)} node exists yet. Create it under Franchises first.</span> : null}
      </label>
    );
  };

  const layerPatch = (cur, hierarchy) => {
    const fr = FR_LAYERS.includes(hierarchy);
    const node = franchises.find((f) => String(f._id) === String(cur.franchiseId));
    return {
      hierarchy,
      franchiseId: fr && node && (!node.layer || node.layer === hierarchy) ? cur.franchiseId : "",
      functionalRole: fr ? "" : cur.functionalRole,
    };
  };

  const roleSelect = (value, onChange, hierarchy) => (
    <label>
      Functional role
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={FR_LAYERS.includes(hierarchy)}>
        {(FR_LAYERS.includes(hierarchy) ? [""] : ROLES).map((r) => (
          <option key={r} value={r}>
            {r ? humanize(r) + (ROLE_HINT[r] ? " (" + ROLE_HINT[r] + ")" : "") : "none"}
          </option>
        ))}
      </select>
    </label>
  );

  const nu = newUser || EMPTY_USER;
  const setNu = (patch) => setNewUser({ ...nu, ...patch });
  const wizardProblem = !nu.login || !nu.password || !nu.name
    ? "Login, password and name are required (step 1)."
    : nu.mobile && !/^\+?\d{10,13}$/.test(nu.mobile.replace(/[\s-]/g, ""))
      ? "Mobile must be 10 to 13 digits (step 1)."
      : nu.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nu.email)
        ? "Email looks wrong (step 1)."
        : FR_LAYERS.includes(nu.hierarchy) && !nu.franchiseId
          ? "Pick the " + humanize(nu.hierarchy) + " node this login belongs to (step 2)."
          : "";
  const eu = editUser || {};
  const setEu = (patch) => setEditUser({ ...eu, ...patch });

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Search login, name, role…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            <button type="button" className={"chip" + (!state ? " active" : "")} onClick={() => setState("")}>
              All <b>{users.length}</b>
            </button>
            <button type="button" className={"chip" + (state === "active" ? " active" : "")} onClick={() => setState("active")}>
              Active <b>{counts.active}</b>
            </button>
            <button type="button" className={"chip" + (state === "inactive" ? " active" : "")} onClick={() => setState("inactive")}>
              Inactive <b>{counts.inactive}</b>
            </button>
            {ATTN.filter(([k]) => counts[k] || state === k).map(([k, label]) => (
              <button key={k} type="button" className={"chip warn" + (state === k ? " active" : "")} onClick={() => setState(state === k ? "" : k)}>
                ⚠ {label} <b>{counts[k]}</b>
              </button>
            ))}
          </div>
          <span className="spacer" />
          {office ? (
            <button className="btn ghost" type="button" onClick={() => setTplOpen(true)}>
              Role templates
            </button>
          ) : null}
          {office && (user.creatableLayers || []).length ? (
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setNewStep(0);
              setNewUser({ ...EMPTY_USER, hierarchy: (user.creatableLayers || [])[0] || "Franchise" });
            }}
          >
            + New user
          </button>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>Login</th>
              <th>Name</th>
              <th>Hierarchy</th>
              <th>Role</th>
              <th>Access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u._id}>
                <td>
                  <strong>{u.login}</strong>
                  <div className="meta">{u.lastLoginAt ? "Last login " + new Date(u.lastLoginAt).toLocaleDateString("en-IN") : "Never logged in"}</div>
                </td>
                <td>
                  {u.name}
                  {u.mobile || u.email ? <div className="meta">{[u.mobile, u.email].filter(Boolean).join(" · ")}</div> : null}
                </td>
                <td>{humanize(u.hierarchy)}</td>
                <td>
                  {u.functionalRole ? humanize(u.functionalRole) : <span className="meta">—</span>}
                  {u.roleTemplate && tplName(u.roleTemplate) ? <div className="meta">Template: {tplName(u.roleTemplate)}</div> : null}
                  {u.team ? <div className="meta">Team: {u.team}</div> : null}
                </td>
                <td>
                  <div className="chips">
                    <StatusBadge value={u.active ? "Active" : "Inactive"} />
                    {u.mfaRequired === false ? <StatusBadge value="MFA off" tone="warn" /> : u.totpEnabled ? <StatusBadge value="Authenticator" tone="info" /> : null}
                    {u.recordScope && u.recordScope !== "all" ? <StatusBadge value={u.recordScope + " records"} tone="none" /> : null}
                    {isLocked(u) ? <StatusBadge value={"🔒 Locked until " + new Date(u.lockedUntil).toLocaleTimeString("en-IN", { timeStyle: "short" })} tone="bad" /> : u.failedLogins ? <StatusBadge value={u.failedLogins + " failed login(s)"} tone="warn" /> : null}
                    {u.employmentStatus && u.employmentStatus !== "Active" ? <StatusBadge value={"Employee " + u.employmentStatus} tone={u.active ? "bad" : "none"} /> : null}
                    {FR_LAYERS.includes(u.hierarchy) && !u.franchiseId ? <StatusBadge value="No franchise node" tone="bad" /> : null}
                  </div>
                </td>
                <td>
                  <div className="actions-cell">
                    {u._id === user.id ? <span className="meta">You</span> : null}
                    {!u.active && canManage(u) ? (
                      <button className="btn good" type="button" disabled={busy} onClick={() => activateUser(u._id)}>
                        Activate
                      </button>
                    ) : null}
                    {canManage(u) && (isLocked(u) || u.failedLogins) ? (
                      <button className="btn warn" type="button" disabled={busy} onClick={() => unlockUser(u)}>
                        🔓 Unlock
                      </button>
                    ) : null}
                    {canManage(u) ? (
                      <button className="btn ghost" type="button" onClick={() => openEdit(u)}>
                        ✎ Edit
                      </button>
                    ) : null}
                    {canManage(u) ? (
                      <button className="btn ghost" type="button" disabled={busy} onClick={() => resetPassword(u)}>
                        🔑 Reset password
                      </button>
                    ) : null}
                    {adminLayer && canManage(u) && (u.totpEnabled || u.recoveryLeft) ? (
                      <button className="btn warn" type="button" disabled={busy} onClick={() => resetUserMfa(u)}>
                        Reset MFA
                      </button>
                    ) : null}
                    {adminLayer && canManage(u) && companies.length > 1 ? (
                      <button className="btn info" type="button" onClick={() => startMove(u)}>
                        Move company
                      </button>
                    ) : null}
                    {u.active && canManage(u) ? (
                      <button className="btn bad" type="button" onClick={() => deactivateUser(u)}>
                        Deactivate
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="empty">
                  No users match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!newUser}
        size="lg"
        title="New user"
        subtitle="Manual user (HRMS adapter off). Created inactive; activate from the list."
        onClose={() => !busy && setNewUser(null)}
        footer={
          <StepNav current={newStep} total={NEW_STEPS.length} onBack={() => setNewStep(newStep - 1)} onNext={() => setNewStep(newStep + 1)}>
            {newStep === NEW_STEPS.length - 1 ? (
              <button className="btn good" type="button" disabled={busy || !!wizardProblem} onClick={saveUser}>
                {busy ? "Creating…" : "Create user"}
              </button>
            ) : null}
          </StepNav>
        }
      >
        <Steps steps={NEW_STEPS} current={newStep} onPick={setNewStep} />
        {newStep === 0 ? (
          <div className="grid2">
            <Field label="Login" value={nu.login} onChange={(v) => setNu({ login: v })} />
            <Field label="Password" value={nu.password} onChange={(v) => setNu({ password: v })} type="password" />
            <Field label="Name" value={nu.name} onChange={(v) => setNu({ name: v })} />
            <Field label="Mobile (for one-time codes)" value={nu.mobile} onChange={(v) => setNu({ mobile: v })} />
            <Field label="Email" value={nu.email} onChange={(v) => setNu({ email: v })} type="email" />
          </div>
        ) : null}
        {newStep === 1 ? (
          <div className="grid2">
            {templateSelect(nu.roleTemplate, (k) => setNu(fromTemplate(nu, k)))}
            <label>
              Hierarchy
              <select value={nu.hierarchy} onChange={(e) => setNu(layerPatch(nu, e.target.value))}>
                {(user.creatableLayers || []).map((h) => (
                  <option key={h} value={h}>
                    {humanize(h)}
                  </option>
                ))}
              </select>
            </label>
            {roleSelect(nu.functionalRole, (v) => setNu({ functionalRole: v }), nu.hierarchy)}
            {franchiseSelect(nu.franchiseId, (v) => setNu({ franchiseId: v }), "Franchise node (required)", nu.hierarchy)}
            {nu.roleTemplate ? (
              <p className="meta span-all">
                Template sets actions {(nu.actions || []).join(", ") || "layer default"} · modules {(nu.modules || []).join(", ") || "all"} · {nu.recordScope} records. Fine-tune later under Edit → Permissions.
              </p>
            ) : null}
          </div>
        ) : null}
        {newStep === 2 ? (
          <div className="grid2">
            <LookupSelect label="Region scope (office staff; empty = all regions)" value={nu.scopeRegion} options={L.regions} onChange={(v) => setNu({ scopeRegion: v })} />
            <LookupSelect label="Team" value={nu.team} options={L.teams} onChange={(v) => setNu({ team: v })} />
            <div className="span-all">
              <ProjectPicks projects={projects} value={nu.projectIds} onChange={(v) => setNu({ projectIds: v })} />
            </div>
          </div>
        ) : null}
        {newStep === NEW_STEPS.length - 1 && wizardProblem ? <p className="err">{wizardProblem}</p> : null}
      </Modal>

      <Modal
        open={!!editUser}
        size="lg"
        title={"Edit user — " + (eu.login || "")}
        subtitle={eu.name}
        onClose={() => !busy && setEditUser(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setEditUser(null)}>
              Cancel
            </button>
            {editTab === "profile" ? (
              <button className="btn primary" type="button" disabled={busy || !String(eu.name || "").trim()} onClick={saveProfile}>
                {busy ? "Saving…" : "Save profile"}
              </button>
            ) : (
              <button className="btn primary" type="button" disabled={busy || (FR_LAYERS.includes(eu.hierarchy) && !eu.franchiseId)} onClick={saveUserEdit}>
                {busy ? "Saving…" : "Save role / scope"}
              </button>
            )}
          </>
        }
      >
        <Tabs
          tabs={[["profile", "Profile"], ["role", "Role"], ["scope", "Scope"], ["perm", "Permissions"], ...(user.hierarchy === "DexterIndiaCompanyTeam" ? [["companies", "Companies"]] : [])]}
          value={editTab}
          onChange={setEditTab}
        />
        {editTab === "profile" ? (
          <>
            <div className="grid2">
              <Field label="Name" value={eu.name || ""} onChange={(v) => setEu({ name: v })} />
              <Field label="Mobile (for one-time codes)" value={eu.mobile || ""} onChange={(v) => setEu({ mobile: v })} />
              <Field label="Email" value={eu.email || ""} onChange={(v) => setEu({ email: v })} type="email" />
            </div>
            <p className="meta">Profile saves separately from role and scope. Login IDs cannot be changed.</p>
          </>
        ) : null}
        {editTab === "role" ? (
          <div className="grid2">
            {templateSelect(eu.roleTemplate, (k) => setEu(fromTemplate(eu, k)))}
            <label>
              Hierarchy
              <select value={eu.hierarchy || ""} onChange={(e) => setEu(layerPatch(eu, e.target.value))}>
                {[...new Set([eu.hierarchy, ...(user.creatableLayers || [])])].filter(Boolean).map((h) => (
                  <option key={h} value={h}>
                    {humanize(h)}
                  </option>
                ))}
              </select>
            </label>
            {roleSelect(eu.functionalRole, (v) => setEu({ functionalRole: v }), eu.hierarchy)}
            {franchiseSelect(eu.franchiseId || "", (v) => setEu({ franchiseId: v }), "Franchise node (required)", eu.hierarchy)}
          </div>
        ) : null}
        {editTab === "scope" ? (
          <div className="grid2">
            <LookupSelect label="Region scope (empty = all regions)" value={eu.scopeRegion} options={L.regions} onChange={(v) => setEu({ scopeRegion: v })} />
            <LookupSelect label="Team" value={eu.team} options={L.teams} onChange={(v) => setEu({ team: v })} />
            <label>
              Record level (office staff)
              <select value={eu.recordScope || "all"} onChange={(e) => setEu({ recordScope: e.target.value })}>
                <option value="all">All records in scope</option>
                <option value="team">Own team only</option>
                <option value="own">Own records only</option>
              </select>
            </label>
            <label className="span-all">
              ATM scope (comma-separated ATM IDs; empty = all)
              <input value={eu.scopeAtmIdsText || ""} onChange={(e) => setEu({ scopeAtmIdsText: e.target.value })} />
            </label>
            <label className="span-all">
              Site scope (comma-separated Site IDs; empty = all)
              <input value={eu.scopeSiteIdsText || ""} onChange={(e) => setEu({ scopeSiteIdsText: e.target.value })} />
            </label>
            <label className="span-all">
              Ticket categories (comma-separated complaint categories; empty = all)
              <input value={eu.scopeTicketCategoriesText || ""} onChange={(e) => setEu({ scopeTicketCategoriesText: e.target.value })} />
            </label>
            <label className="span-all">
              Ticket dockets (comma-separated docket numbers; empty = all). With categories too, a ticket matching either is visible.
              <input value={eu.scopeDocketsText || ""} onChange={(e) => setEu({ scopeDocketsText: e.target.value })} />
            </label>
            <div className="span-all">
              <ProjectPicks projects={projects} value={eu.projectIds || []} onChange={(v) => setEu({ projectIds: v })} />
            </div>
          </div>
        ) : null}
        {editTab === "perm" ? (
          <>
            <h4>Modules (none ticked = all the role allows)</h4>
            <div className="grid3">
              {MODULES.map(([m, label]) => (
                <label key={m} className="check">
                  <input
                    type="checkbox"
                    checked={(eu.modules || []).includes(m)}
                    onChange={(e) => setEu({ modules: e.target.checked ? [...(eu.modules || []), m] : (eu.modules || []).filter((x) => x !== m) })}
                  />
                  {label} <span className="meta">{m}</span>
                </label>
              ))}
            </div>
            <h4>Actions (none ticked = role default)</h4>
            <div className="grid3">
              {ACTIONS.map((a) => (
                <label key={a} className="check">
                  <input
                    type="checkbox"
                    checked={(eu.actions || []).includes(a)}
                    onChange={(e) => setEu({ actions: e.target.checked ? [...(eu.actions || []), a] : (eu.actions || []).filter((x) => x !== a) })}
                  />
                  {a}
                </label>
              ))}
            </div>
            {adminLayer ? (
              <>
                <h4>Security</h4>
                <label className="check">
                  <input type="checkbox" checked={eu.mfaRequired !== false} onChange={(e) => setEu({ mfaRequired: e.target.checked })} /> MFA required at login
                </label>
              </>
            ) : null}
          </>
        ) : null}
        {editTab === "companies" ? (
          <>
            <p className="meta">Only applies when the hierarchy is Dexter India company team.</p>
            <div className="grid3">
              {companies.map((c) => (
                <label key={c._id} className="check">
                  <input
                    type="checkbox"
                    checked={(eu.grantedCompanyIds || []).includes(c._id)}
                    onChange={(e) =>
                      setEu({ grantedCompanyIds: e.target.checked ? [...(eu.grantedCompanyIds || []), c._id] : (eu.grantedCompanyIds || []).filter((x) => x !== c._id) })
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={!!move}
        size="sm"
        title={"Move " + ((move && move.label) || "") + " to another company"}
        onClose={() => !busy && setMove(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setMove(null)}>
              Cancel
            </button>
            <button className="btn primary" type="button" disabled={busy || !move || !move.reason.trim()} onClick={doMove}>
              Move
            </button>
          </>
        }
      >
        {move ? (
          <>
            <label>
              Target company
              <select value={move.targetCompanyId} onChange={(e) => setMove({ ...move, targetCompanyId: e.target.value })}>
                {companies
                  .filter((c) => c._id !== user.companyId)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Reason (goes to the audit log)
              <textarea value={move.reason} onChange={(e) => setMove({ ...move, reason: e.target.value })} />
            </label>
          </>
        ) : null}
      </Modal>

      <Modal
        open={tplOpen && !tplEdit}
        size="xl"
        title="Role templates"
        subtitle="Named presets of layer, functional role, actions, modules and record scope. Pick one when creating or editing a user."
        onClose={() => setTplOpen(false)}
        footer={
          tpl.canEdit ? (
            <button className="btn primary" type="button" onClick={() => setTplEdit({ ...BLANK_TPL })}>
              + New template
            </button>
          ) : null
        }
      >
        <table>
          <thead>
            <tr>
              <th>Template</th>
              <th>Layer / role</th>
              <th>Actions</th>
              <th>Modules</th>
              <th>Records</th>
              <th>Users</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tpl.templates.map((t) => (
              <tr key={t.key}>
                <td>
                  <strong>{t.name}</strong> {t.builtIn ? <StatusBadge value="Built-in" tone="info" /> : null}
                  {t.description ? <div className="meta">{t.description}</div> : null}
                </td>
                <td>
                  {humanize(t.hierarchy)}
                  {t.functionalRole ? " / " + humanize(t.functionalRole) : ""}
                </td>
                <td>{t.actions.length ? t.actions.join(", ") : <span className="meta">layer default</span>}</td>
                <td>{t.modules.length ? t.modules.map((m) => (MODULES.find(([k]) => k === m) || [m, m])[1]).join(", ") : <span className="meta">all</span>}</td>
                <td>{t.recordScope}</td>
                <td>{t.users || 0}</td>
                <td>
                  {tpl.canEdit && !t.builtIn ? (
                    <div className="actions-cell">
                      <button className="btn ghost" type="button" onClick={() => setTplEdit({ ...t })}>
                        ✎ Edit
                      </button>
                      <button className="btn bad" type="button" disabled={busy || t.users > 0} title={t.users ? "Users still carry this template" : ""} onClick={() => removeTemplate(t)}>
                        Remove
                      </button>
                    </div>
                  ) : tpl.canEdit ? (
                    <button className="btn ghost" type="button" onClick={() => setTplEdit({ ...t, key: "", builtIn: false, name: t.name + " (copy)" })}>
                      Copy
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="meta">Auditor and Viewer roles are read-only on the server whatever actions are ticked. Changing a template does not change users already created from it.</p>
      </Modal>

      <Modal
        open={!!tplEdit}
        size="lg"
        title={tplEdit && tplEdit.key ? "Edit template — " + tplEdit.name : "New role template"}
        onClose={() => !busy && setTplEdit(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setTplEdit(null)}>
              Cancel
            </button>
            <button className="btn primary" type="button" disabled={busy || !(tplEdit && tplEdit.name.trim())} onClick={saveTemplate}>
              {busy ? "Saving…" : "Save template"}
            </button>
          </>
        }
      >
        {tplEdit ? (
          <>
            <div className="grid2">
              <Field label="Name" value={tplEdit.name} onChange={(v) => setTplEdit({ ...tplEdit, name: v })} />
              <Field label="Description" value={tplEdit.description || ""} onChange={(v) => setTplEdit({ ...tplEdit, description: v })} />
              <label>
                Hierarchy
                <select value={tplEdit.hierarchy} onChange={(e) => setTplEdit({ ...tplEdit, hierarchy: e.target.value, functionalRole: FR_LAYERS.includes(e.target.value) ? "" : tplEdit.functionalRole })}>
                  {["SubAdmin", "Admin", "Director", "DexterIndiaCompanyTeam", ...FR_LAYERS].map((h) => (
                    <option key={h} value={h}>
                      {humanize(h)}
                    </option>
                  ))}
                </select>
              </label>
              {roleSelect(tplEdit.functionalRole, (v) => setTplEdit({ ...tplEdit, functionalRole: v }), tplEdit.hierarchy)}
              <label>
                Record level
                <select value={tplEdit.recordScope || "all"} onChange={(e) => setTplEdit({ ...tplEdit, recordScope: e.target.value })}>
                  <option value="all">All records in scope</option>
                  <option value="team">Own team only</option>
                  <option value="own">Own records only</option>
                </select>
              </label>
            </div>
            <h4>Modules (none ticked = all)</h4>
            <div className="grid3">
              {MODULES.map(([m, label]) => (
                <label key={m} className="check">
                  <input type="checkbox" checked={tplEdit.modules.includes(m)} onChange={(e) => setTplEdit({ ...tplEdit, modules: e.target.checked ? [...tplEdit.modules, m] : tplEdit.modules.filter((x) => x !== m) })} />
                  {label} <span className="meta">{m}</span>
                </label>
              ))}
            </div>
            <h4>Actions (none ticked = layer default)</h4>
            <div className="grid3">
              {ACTIONS.map((a) => (
                <label key={a} className="check">
                  <input type="checkbox" checked={tplEdit.actions.includes(a)} onChange={(e) => setTplEdit({ ...tplEdit, actions: e.target.checked ? [...tplEdit.actions, a] : tplEdit.actions.filter((x) => x !== a) })} />
                  {a}
                </label>
              ))}
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
