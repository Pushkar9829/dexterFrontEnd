import { useEffect, useState } from "react";
import { askText } from "../../components/common/Dialogs.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { StepNav, Steps } from "../../components/common/StepForm.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { takeFocus } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";

const VIEWS = [
  ["mine", "My tasks"],
  ["created", "Created by me"],
  ["shared", "Shared with me"],
  ["team", "My team"],
  ["review", "To review"],
  ["approval", "Pending approval"],
  ["rejected", "Rejected"],
  ["overdue", "Overdue"],
  ["all", "All in scope"],
];
const STATUS_LABEL = { Created: "New" };
const label = (s) => STATUS_LABEL[s] || s;
const NTH = [
  [1, "First"],
  [2, "Second"],
  [3, "Third"],
  [4, "Fourth"],
  [-1, "Last"],
];
const gpsNow = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
const typeLine = (x) => x.name + ": " + (x.subTypes || []).join(", ") + ((x.evidence || []).length ? " | evidence: " + x.evidence.join(", ") : "") + (x.gps ? " | gps" : "");
const parseTypeLine = (l) => {
  const [head, ...opts] = l.split("|").map((s) => s.trim());
  const [name, subs] = head.split(":");
  const ev = opts.find((o) => /^evidence\s*:/i.test(o));
  return {
    name: name.trim(),
    subTypes: String(subs || "").split(",").map((s) => s.trim()).filter(Boolean),
    evidence: ev ? ev.replace(/^evidence\s*:/i, "").split(",").map((s) => s.trim()).filter(Boolean) : [],
    gps: opts.some((o) => /^gps$/i.test(o)),
  };
};
const ruleLine = (r) => r.field + " contains " + r.contains + " => " + [r.type || "Service", r.priority || "Medium", r.assignTeam || ""].join(" | ");
const parseRuleLine = (l) => {
  const m = /^(subject|body|sender)\s+contains\s+(.+?)\s*=>\s*(.*)$/i.exec(l.trim());
  if (!m) return null;
  const [type, priority, assignTeam] = m[3].split("|").map((s) => s.trim());
  return { field: m[1].toLowerCase(), contains: m[2], type: type || "", priority: priority || "Medium", assignTeam: assignTeam || "" };
};
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "");
const REASON_NEEDED = ["On Hold", "Rework Required"];
const PRIORITY_TONE = { Critical: "bad", High: "bad", Medium: "warn", Low: "info" };
const MOVE_CLASS = (to) => (/complet|close|approv|done/i.test(to) ? "btn good" : /rework|reject|cancel/i.test(to) ? "btn bad" : /hold/i.test(to) ? "btn warn" : "btn info");
const NEW_STEPS = [
  { key: "task", label: "Task", hint: "What needs doing" },
  { key: "when", label: "Schedule & links", hint: "Dates, ticket, ATM" },
  { key: "who", label: "Assignment", hint: "Who does it" },
];

export function TasksPage({ user, atms, franchises, setError, setNotice }) {
  const [meta, setMeta] = useState(null);
  const [view, setView] = useState("mine");
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sel, setSel] = useState(null);
  const [selTab, setSelTab] = useState("overview");
  const [f, setF] = useState(null);
  const [newStep, setNewStep] = useState(0);
  const [tf, setTf] = useState(null);
  const [profile, setProfile] = useState(null);
  const [related, setRelated] = useState({ tickets: [], projects: [] });
  const [panel, setPanel] = useState("list");
  const [creating, setCreating] = useState(false);
  const [picker, setPicker] = useState(null);
  const [teamFilter, setTeamFilter] = useState("");
  const [workload, setWorkload] = useState(null);
  const [wlTeam, setWlTeam] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setT = (k, v) => setTf((x) => ({ ...x, [k]: v }));

  async function load() {
    try {
      const m = await api("/api/tasks/meta");
      setMeta(m);
      setRows((await api("/api/tasks?view=" + view + (q ? "&q=" + encodeURIComponent(q) : "") + (teamFilter && view !== "team" ? "&team=" + encodeURIComponent(teamFilter) : ""))).rows);
      if (m.canCreate) {
        setUsers((await api("/api/tasks/assignees")).users);
        setTemplates((await api("/api/task-templates")).rows);
        const [tk, pj] = await Promise.all([api("/api/complaints?view=open").catch(() => ({ complaints: [] })), api("/api/site-projects").catch(() => ({ projects: [] }))]);
        setRelated({ tickets: tk.complaints || [], projects: pj.projects || [] });
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [view, teamFilter]);

  async function loadWorkload(team) {
    try {
      setWorkload(await api("/api/tasks/workload" + (team ? "?team=" + encodeURIComponent(team) : "")));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (panel === "workload") loadWorkload(wlTeam);
  }, [panel, wlTeam]);

  useEffect(() => {
    const link = takeFocus("tasks");
    if (link && link.id) openTask(link.id);
    else if (link && VIEWS.some(([k]) => k === link.type)) setView(link.type);
  }, []);

  async function openTask(id, keepTab) {
    try {
      setSel(await api("/api/tasks/" + id));
      if (!keepTab) setSelTab("overview");
    } catch (err) {
      setError(err.message);
    }
  }

  async function attach(t, e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const type = await askText("Label for " + file.name, "Attachment", { title: "Attach file", okLabel: "Attach" });
    if (type == null) return;
    await send("/api/tasks/" + t._id + "/files", "POST", { type: type || "Attachment", fileName: file.name, data: await fileToB64(file) }, "File attached");
  }

  async function downloadFile(id) {
    try {
      const d = await api("/api/documents/" + id + "/file");
      downloadB64(d.fileName, d.mime, d.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function send(path, method, body, ok) {
    try {
      const r = await api(path, { method, body: JSON.stringify(body) });
      setNotice(ok);
      await load();
      if (sel) await openTask(sel.task._id, true);
      return r || {};
    } catch (err) {
      setError(err.message);
      return null;
    }
  }

  async function exportCsv() {
    try {
      const r = await api("/api/tasks/export");
      downloadB64(r.fileName, "text/csv", btoa(unescape(encodeURIComponent(r.csv))));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!meta) return <div className="card">Loading…</div>;
  const subTypesOf = (type) => ((meta.taskTypes || []).find((x) => x.name === type) || {}).subTypes || [];

  function pickerModal() {
    if (!picker) return null;
    const toggle = (id) => setPicker((p) => ({ ...p, selected: p.selected.includes(id) ? p.selected.filter((x) => x !== id) : [...p.selected, id] }));
    return (
      <Modal
        open
        size="sm"
        title={picker.title}
        onClose={() => setPicker(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setPicker(null)}>
              Cancel
            </button>
            <button
              className="btn good"
              type="button"
              onClick={async () => {
                if ((await picker.onSave(picker.selected)) !== false) setPicker(null);
              }}
            >
              Save
            </button>
          </>
        }
      >
        {picker.hint ? <p className="meta">{picker.hint}</p> : null}
        <div style={{ maxHeight: 360, overflow: "auto" }}>
          {picker.options.map(([id, text]) => (
            <label key={id} className="check">
              <input type="checkbox" checked={picker.selected.includes(id)} onChange={() => toggle(id)} /> {text}
            </label>
          ))}
          {!picker.options.length ? <p className="meta">Nothing to choose from.</p> : null}
        </div>
      </Modal>
    );
  }
  const userOptions = users.map((u) => (
    <option key={u._id} value={u._id}>
      {u.name} · {u.functionalRole || u.hierarchy} · {u.openTasks} open{u.taskProfile.team ? " · " + u.taskProfile.team : ""}
    </option>
  ));

  async function createTask() {
    if (creating) return;
    if (!String(f.title || "").trim()) {
      setNewStep(0);
      setError("Title is required");
      return;
    }
    const iso = (v) => (v ? new Date(v).toISOString() : undefined);
    const body = { ...f, dueAt: iso(f.dueAt), startAt: iso(f.startAt), reminderAt: iso(f.reminderAt), reviewRequired: f.reviewRequired !== false };
    setCreating(true);
    const r = await send("/api/tasks", "POST", body, !meta.canAssign && meta.settings.approveStaffTasks ? "Task created; waiting for approval" : "Task created");
    setCreating(false);
    if (r) setF(null);
  }

  function createModal() {
    if (!f) return null;
    const sel2 = (k, label, list, render) => (
      <label>
        {label}
        <select value={f[k] || ""} onChange={(e) => set(k, e.target.value)}>
          <option value="">—</option>
          {render ? list.map(render) : list}
        </select>
      </label>
    );
    return (
      <Modal
        open
        size="lg"
        title="New task"
        onClose={() => !creating && setF(null)}
        footer={
          <StepNav current={newStep} total={NEW_STEPS.length} onBack={() => setNewStep(newStep - 1)} onNext={() => setNewStep(newStep + 1)}>
            {newStep === NEW_STEPS.length - 1 ? (
              <button className="btn good" type="button" disabled={creating} onClick={createTask}>
                {creating ? "Creating…" : "Create task"}
              </button>
            ) : null}
          </StepNav>
        }
      >
        <Steps steps={NEW_STEPS} current={newStep} onPick={setNewStep} />
        {newStep === 0 ? (
          <>
            <label>
              Title *
              <input value={f.title || ""} onChange={(e) => set("title", e.target.value)} />
            </label>
            <label>
              Description
              <textarea value={f.description || ""} onChange={(e) => set("description", e.target.value)} />
            </label>
            <div className="grid2">
              <label>
                Type
                <select value={f.type || ""} onChange={(e) => setF((x) => ({ ...x, type: e.target.value, subType: "" }))}>
                  <option value="">(General)</option>
                  {meta.types.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Sub-type
                <select value={f.subType || ""} onChange={(e) => set("subType", e.target.value)} disabled={!subTypesOf(f.type || "General").length}>
                  <option value="">—</option>
                  {subTypesOf(f.type || "General").map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              {[
                ["category", meta.categories],
                ["priority", meta.priorities],
              ].map(([k, list]) => (
                <label key={k}>
                  {humanize(k)}
                  <select value={f[k] || ""} onChange={(e) => set(k, e.target.value)}>
                    <option value="">(default)</option>
                    {list.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                Estimated hours
                <input type="number" min="0" value={f.estimatedHours || ""} onChange={(e) => set("estimatedHours", e.target.value)} />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" checked={f.reviewRequired !== false} onChange={(e) => set("reviewRequired", e.target.checked)} /> Needs review before completion
            </label>
          </>
        ) : null}
        {newStep === 1 ? (
          <div className="grid2">
            <label>
              Start
              <input type="datetime-local" value={f.startAt || ""} onChange={(e) => set("startAt", e.target.value)} />
            </label>
            <label>
              Due
              <input type="datetime-local" value={f.dueAt || ""} onChange={(e) => set("dueAt", e.target.value)} />
            </label>
            <label>
              Remind me at
              <input type="datetime-local" value={f.reminderAt || ""} onChange={(e) => set("reminderAt", e.target.value)} />
            </label>
            <label>
              Visit location
              <input value={f.visitLocation || ""} placeholder="Address or landmark (field tasks)" onChange={(e) => set("visitLocation", e.target.value)} />
            </label>
            <label>
              Contact name
              <input value={f.contactName || ""} onChange={(e) => set("contactName", e.target.value)} />
            </label>
            <label>
              Contact phone
              <input value={f.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} />
            </label>
            {sel2("complaintId", "Ticket", related.tickets, (c) => (
              <option key={c._id} value={c._id}>
                {c.docketNumber} · {c.atmId} · {c.problemType}
              </option>
            ))}
            {sel2("projectId", "Project", related.projects, (p) => (
              <option key={p._id} value={p._id}>
                {[p.siteLocationName, p.loiCode, p.atmId, p.currentStage].filter(Boolean).join(" · ")}
              </option>
            ))}
            {sel2("atmId", "ATM", atms, (a) => (
              <option key={a.atmId}>{a.atmId}</option>
            ))}
            {sel2("franchiseId", "Franchise", franchises, (x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
            {sel2("parentId", "Parent task", rows, (t) => (
              <option key={t._id} value={t._id}>
                {t.taskNo} {t.title}
              </option>
            ))}
            <label>
              Waits on (blocking tasks)
              <button
                className="btn ghost"
                type="button"
                onClick={() =>
                  setPicker({
                    title: "Blocking tasks",
                    hint: "This task cannot start until these are completed, closed or cancelled.",
                    options: rows.filter((t) => !["Completed", "Closed", "Cancelled"].includes(t.status)).map((t) => [t._id, t.taskNo + " · " + t.title]),
                    selected: f.blockedBy || [],
                    onSave: (ids) => set("blockedBy", ids),
                  })
                }
              >
                {(f.blockedBy || []).length ? (f.blockedBy || []).length + " selected" : "Choose…"}
              </button>
            </label>
          </div>
        ) : null}
        {newStep === 2 ? (
          <div className="grid2">
            {meta.canAssign ? (
              <>
                {sel2("assigneeId", "Assign to employee", userOptions)}
                <label>
                  …or by team
                  <input value={f.assignTeam || ""} onChange={(e) => set("assignTeam", e.target.value)} />
                </label>
                <label>
                  …or by region
                  <input value={f.assignRegion || ""} onChange={(e) => set("assignRegion", e.target.value)} />
                </label>
                <label>
                  …or by skill
                  <input value={f.assignSkill || ""} onChange={(e) => set("assignSkill", e.target.value)} />
                </label>
              </>
            ) : null}
            {sel2("managerId", "Manager (escalation)", userOptions)}
            {!meta.canAssign && meta.settings.approveStaffTasks ? <p className="meta span-all">This task goes to Pending Approval; the manager you pick (or an Admin) approves it before assignment.</p> : null}
          </div>
        ) : null}
      </Modal>
    );
  }

  async function moveTo(t, to) {
    const body = { action: "status", to };
    if (REASON_NEEDED.includes(to)) {
      body.reason = await askText("Reason for " + to, "", { title: t.taskNo + " → " + to, required: true, multiline: true, okLabel: to });
      if (!body.reason) return;
    }
    if (to === "Completed") {
      const h = await askText("Actual hours (blank = auto)", "", { title: "Complete " + t.taskNo, inputType: "number", okLabel: "Complete" });
      if (h === null) return;
      body.actualHours = h;
    }
    send("/api/tasks/" + t._id, "PATCH", body, t.taskNo + " → " + to);
  }

  async function remind(t) {
    const at = await askText("Remind me at (IST)", "", { title: "Set reminder", inputType: "datetime-local", required: true, okLabel: "Next" });
    if (!at) return;
    const text = await askText("Reminder text (optional)", "", { title: "Set reminder", okLabel: "Set reminder" });
    if (text === null) return;
    send("/api/tasks/" + t._id, "PATCH", { action: "remind", at: new Date(at + ":00+05:30").toISOString(), text }, "Reminder set");
  }

  async function withReason(t, action, prompt, okLabel, done, danger) {
    const reason = await askText(prompt, "", { title: t.taskNo + " · " + okLabel, required: true, multiline: true, danger, okLabel });
    if (reason) send("/api/tasks/" + t._id, "PATCH", { action, reason }, done);
  }

  function editSupport(t) {
    setPicker({
      title: "Supporting users · " + t.taskNo,
      hint: "Supporting users see the task, add notes and files, and get its notices.",
      options: users.filter((u) => String(u._id) !== String(t.assigneeId)).map((u) => [String(u._id), u.name + " · " + humanize(u.functionalRole || u.hierarchy)]),
      selected: (t.supportIds || []).map(String),
      onSave: async (ids) => !!(await send("/api/tasks/" + t._id, "PATCH", { action: "support", userIds: ids }, "Supporting users saved")),
    });
  }

  function editDeps(t) {
    const done = ["Completed", "Closed", "Cancelled"];
    setPicker({
      title: "Blocking tasks · " + t.taskNo,
      hint: "This task cannot move to In Progress, review or completion until these are finished.",
      options: rows.filter((x) => x._id !== t._id && (!done.includes(x.status) || (t.blockedBy || []).map(String).includes(x._id))).map((x) => [x._id, x.taskNo + " · " + x.title + " (" + label(x.status) + ")"]),
      selected: (t.blockedBy || []).map(String),
      onSave: async (ids) => !!(await send("/api/tasks/" + t._id, "PATCH", { action: "dependencies", blockedBy: ids }, "Dependencies saved")),
    });
  }

  function detailModal() {
    if (!sel) return null;
    const t = sel.task;
    const reviewSteps = ["Under Review", "Approved", "Rework Required"];
    const next = (meta.next[t.status] || []).filter((to) => {
      if (reviewSteps.includes(to) || (to === "Closed" && t.status === "Approved")) return sel.canReview;
      if (to === "Closed") return !!meta.admin || String(t.ownerId) === String(user.id);
      if (to === "On Hold" || (to === "Completed" && t.status === "Approved")) return sel.isAssignee || sel.canReview;
      if (to === "Completed" && t.status === "In Progress" && t.reviewRequired) return false;
      return sel.isAssignee;
    });
    const closed = ["Completed", "Closed", "Cancelled"].includes(t.status);
    const selTabs = [
      ["overview", "Overview"],
      ["subtasks", "Subtasks", sel.subtasks.length],
      ["links", "Dependencies", (sel.blockers || []).length + (sel.blocks || []).length],
      ["files", "Files", (sel.files || []).length],
      ["notes", "Notes", (t.notes || []).length],
      ["assign", "Assignments", (t.assignments || []).length],
      ["history", "History", (t.history || []).length],
    ];
    return (
      <Modal
        open
        size="xl"
        title={t.taskNo + " · " + t.title}
        subtitle={
          <span className="chips">
            <StatusBadge value={label(t.displayStatus)} />
            <StatusBadge value={t.priority} tone={PRIORITY_TONE[t.priority]} />
            {sel.blocked ? <StatusBadge value="Blocked" tone="bad" /> : null}
            {t.overdue ? <StatusBadge value="Overdue" tone="bad" /> : null}
            {t.escalationLevel ? <StatusBadge value={"Escalation L" + t.escalationLevel} tone="bad" /> : null}
            {t.carryCount ? <StatusBadge value={"Carried " + t.carryCount + "×"} tone="warn" /> : null}
          </span>
        }
        onClose={() => setSel(null)}
      >
        <Tabs tabs={selTabs} value={selTab} onChange={setSelTab} />
        {selTab === "overview" ? (
          <>
            <div className="kpis">
              <div className="kpi" style={{ "--k": "#2563eb" }}>
                <div className="l">Assignee</div>
                <div>{t.assigneeName || "—"}</div>
              </div>
              <div className="kpi" style={{ "--k": "#7c3aed" }}>
                <div className="l">Owner / manager</div>
                <div>
                  {t.ownerName} / {t.managerName || "—"}
                </div>
              </div>
              <div className="kpi" style={{ "--k": t.overdue ? "#dc2626" : "#d97706" }}>
                <div className="l">Due</div>
                <div>{when(t.dueAt) || "—"}</div>
              </div>
              <div className="kpi" style={{ "--k": "#059669" }}>
                <div className="l">Progress{t.percentRolledUp && sel.subtasks.length ? " (from subtasks)" : ""}</div>
                <div className="progress">
                  <div style={{ width: Math.min(100, t.percent || 0) + "%" }} />
                  <span>{t.percent || 0}%</span>
                </div>
              </div>
            </div>
            <p className="meta">
              {t.category} · {t.type}
              {t.subType ? " / " + t.subType : ""} · source {t.source}
              {t.atmId ? " · ATM " + t.atmId : ""}
              {t.docketNumber ? " · ticket " + t.docketNumber : ""}
              {sel.parent ? " · part of " + sel.parent.taskNo : ""}
            </p>
            {(sel.support || []).length ? <p className="meta">Supporting: {sel.support.map((u) => u.name).join(", ")}</p> : null}
            {t.visitLocation || t.contactName ? (
              <p className="meta">
                {t.visitLocation ? (
                  <>
                    Visit: {t.visitLocation}{" "}
                    <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(t.visitLocation)} target="_blank" rel="noreferrer">
                      Navigate ↗
                    </a>
                  </>
                ) : null}
                {t.contactName ? " · Contact " + t.contactName + (t.contactPhone ? " " + t.contactPhone : "") : ""}
              </p>
            ) : null}
            {t.checkInAt ? (
              <p className="meta">
                Checked in {when(t.checkInAt)}
                {t.checkInGps ? " (" + t.checkInGps.lat.toFixed(5) + ", " + t.checkInGps.lng.toFixed(5) + ")" : ""}
                {t.checkOutAt ? " · out " + when(t.checkOutAt) + (t.checkOutGps ? " (" + t.checkOutGps.lat.toFixed(5) + ", " + t.checkOutGps.lng.toFixed(5) + ")" : "") : ""}
              </p>
            ) : null}
            {(sel.evidenceMissing || []).length && !closed ? <p className="err">Before completion: {sel.evidenceMissing.join("; ")}</p> : null}
            {t.status === "Rejected" ? (
              <p className="err">
                Rejected by {t.rejectedByName}: {t.rejectReason} — reassign or cancel.
              </p>
            ) : null}
            {t.status === "Cancelled" ? (
              <p className="meta">
                Cancelled by {t.cancelledByName}: {t.cancelReason}
              </p>
            ) : null}
            {sel.blocked ? (
              <p className="err">
                Waiting on{" "}
                {(sel.blockers || [])
                  .filter((b) => !["Completed", "Closed", "Cancelled"].includes(b.status))
                  .map((b) => b.taskNo + " (" + label(b.status) + ")")
                  .join(", ")}
              </p>
            ) : null}
            {t.description ? <p style={{ whiteSpace: "pre-wrap" }}>{t.description}</p> : null}
            {next.length ? (
              <div className="section">
                <h4>Move status</h4>
                <div className="actions-cell">
                  {next.map((to) => (
                    <button key={to} className={MOVE_CLASS(to)} type="button" onClick={() => moveTo(t, to)}>
                      {to}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="section">
              <h4>Actions</h4>
              <div className="actions-cell">
                {sel.canApproveNew ? (
                  <button className="btn good" type="button" onClick={() => send("/api/tasks/" + t._id, "PATCH", { action: "approve-new" }, t.taskNo + " approved")}>
                    ✓ Approve task
                  </button>
                ) : null}
                {sel.isAssignee && (meta.rejectable || []).includes(t.status) ? (
                  <button className="btn bad" type="button" onClick={() => withReason(t, "reject", "Why are you rejecting this task? It goes back to the manager.", "Reject", t.taskNo + " rejected", true)}>
                    ✕ Reject
                  </button>
                ) : null}
                {sel.canCancel ? (
                  <button className="btn bad" type="button" onClick={() => withReason(t, "cancel", "Reason for cancelling (audited)", "Cancel task", t.taskNo + " cancelled", true)}>
                    Cancel task
                  </button>
                ) : null}
                {sel.isAssignee && (sel.rule?.gps || t.category === "Field") && ["Accepted", "In Progress", "Pending", "Rework Required"].includes(t.status) ? (
                  <button
                    className="btn info"
                    type="button"
                    onClick={async () => {
                      const action = t.checkInAt && !t.checkOutAt ? "checkOut" : "checkIn";
                      send("/api/tasks/" + t._id, "PATCH", { action, ...(await gpsNow()) }, action === "checkIn" ? "Checked in" : "Checked out");
                    }}
                  >
                    📍 {t.checkInAt && !t.checkOutAt ? "Check out" : "Check in"}
                  </button>
                ) : null}
                {!closed && (sel.canManage || sel.isAssignee) ? (
                  <button className="btn ghost" type="button" onClick={() => editSupport(t)}>
                    👥 Supporting users
                  </button>
                ) : null}
                {!closed && sel.canManage ? (
                  <button className="btn ghost" type="button" onClick={() => editDeps(t)}>
                    ⛓ Dependencies
                  </button>
                ) : null}
                {sel.isAssignee && !sel.subtasks.filter((s) => s.status !== "Cancelled").length ? (
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={async () => {
                      const percent = await askText("% complete", String(t.percent || 0), { title: "Progress", inputType: "number", okLabel: "Save" });
                      if (percent !== null) send("/api/tasks/" + t._id, "PATCH", { action: "progress", percent }, "Progress saved");
                    }}
                  >
                    ◔ Progress
                  </button>
                ) : null}
                <button className="btn ghost" type="button" onClick={() => remind(t)}>
                  ⏰ Remind me
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={async () => {
                    const text = await askText("Note", "", { title: "Add note", multiline: true, required: true, okLabel: "Add note" });
                    if (text) send("/api/tasks/" + t._id, "PATCH", { action: "note", text }, "Note added");
                  }}
                >
                  ✎ Note
                </button>
                <select
                  value=""
                  style={{ width: "auto" }}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) send("/api/tasks/" + t._id, "PATCH", { action: "share", userIds: [id] }, "Shared");
                  }}
                >
                  <option value="">Share with…</option>
                  {users
                    .filter((u) => !["Franchise", "MasterFranchise", "SuperMasterFranchise"].includes(u.hierarchy) && !(t.sharedWith || []).map(String).includes(String(u._id)))
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                </select>
                {meta.canAssign && !closed ? (
                  <select
                    value=""
                    style={{ width: "auto" }}
                    onChange={async (e) => {
                      const assigneeId = e.target.value;
                      if (!assigneeId) return;
                      const reason = t.assigneeId ? await askText("Reason for reassignment", "", { title: "Reassign " + t.taskNo, required: true, okLabel: "Reassign" }) : "";
                      if (t.assigneeId && !reason) return;
                      send("/api/tasks/" + t._id, "PATCH", { action: t.assigneeId ? "reassign" : "assign", assigneeId, reason }, "Assigned");
                    }}
                  >
                    <option value="">{t.assigneeId ? "Reassign to…" : "Assign to…"}</option>
                    {userOptions}
                  </select>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
        {selTab === "subtasks" ? (
          <table>
            <tbody>
              {sel.subtasks.map((s) => (
                <tr key={s._id}>
                  <td>
                    <strong>{s.taskNo}</strong>
                  </td>
                  <td>{s.title}</td>
                  <td>
                    <StatusBadge value={label(s.status)} />
                  </td>
                  <td>{s.assigneeName}</td>
                  <td>{s.percent || 0}%</td>
                  <td>
                    <button className="btn ghost" type="button" onClick={() => openTask(s._id)}>
                      Open ›
                    </button>
                  </td>
                </tr>
              ))}
              {!sel.subtasks.length ? (
                <tr>
                  <td className="empty">No subtasks.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        ) : null}
        {selTab === "links" ? (
          <>
            {[
              ["Waits on", sel.blockers || [], "No blocking tasks."],
              ["Blocks", sel.blocks || [], "No task waits on this one."],
            ].map(([title, list, empty]) => (
              <div key={title} className="section">
                <h4>{title}</h4>
                <table>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s._id}>
                        <td>
                          <strong>{s.taskNo}</strong>
                        </td>
                        <td>{s.title}</td>
                        <td>
                          <StatusBadge value={label(s.status)} />
                        </td>
                        <td>{s.assigneeName}</td>
                        <td>
                          <button className="btn ghost" type="button" onClick={() => openTask(s._id)}>
                            Open ›
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!list.length ? (
                      <tr>
                        <td className="empty">{empty}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        ) : null}
        {selTab === "files" ? (
          <>
            <div className="toolbar">
              <span className="spacer" />
              {!closed ? (
                <label className="btn primary filebtn">
                  ⤒ Attach file
                  <input type="file" onChange={(e) => attach(t, e)} />
                </label>
              ) : null}
            </div>
            <table>
              <tbody>
                {(sel.files || []).map((d) => (
                  <tr key={d._id}>
                    <td>
                      <StatusBadge value={d.type} tone="info" />
                    </td>
                    <td>{d.fileName}</td>
                    <td>v{d.version}</td>
                    <td>
                      <button className="btn ghost" type="button" onClick={() => downloadFile(d._id)}>
                        ⤓ Download
                      </button>
                    </td>
                  </tr>
                ))}
                {!(sel.files || []).length ? (
                  <tr>
                    <td className="empty">No files.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        ) : null}
        {selTab === "notes" ? (
          <ul className="timeline">
            {(t.notes || []).map((n, i) => (
              <li key={i}>
                <span className="meta">{when(n.at)}</span> · <strong>{n.byName}</strong>
                <div style={{ whiteSpace: "pre-wrap" }}>{n.text}</div>
              </li>
            ))}
            {!(t.notes || []).length ? <li className="meta">No notes.</li> : null}
          </ul>
        ) : null}
        {selTab === "assign" ? (
          <ul className="timeline">
            {(t.assignments || []).map((a, i) => (
              <li key={i}>
                <span className="meta">{when(a.at)}</span> · {a.byName} → <strong>{a.toName}</strong> <StatusBadge value={a.via} tone="info" />
                {a.reason ? <div className="meta">{a.reason}</div> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {selTab === "history" ? (
          <ul className="timeline">
            {(t.history || []).map((h, i) => (
              <li key={i}>
                <span className="meta">{when(h.at)}</span> · <strong>{h.byName}</strong> · {h.action}
                {h.from ? (
                  <>
                    {" "}
                    <StatusBadge value={h.from} /> → <StatusBadge value={h.to} />
                  </>
                ) : null}
                {h.remark ? <div className="meta">{h.remark}</div> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Modal>
    );
  }

  function templatesPanel() {
    return (
      <div className="card">
        <div className="toolbar">
          <span className="meta">
            Missed instance policy (company): <StatusBadge value={meta.settings.missedPolicy} tone="info" />
          </span>
          <span className="spacer" />
          {meta.canAssign ? (
            <button className="btn primary" type="button" onClick={() => setTf({ interval: 1, weekdays: [], monthlyMode: "date", weekday: 1, nth: 1 })}>
              + Recurring template
            </button>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Rule</th>
              <th>Next</th>
              <th>Last generated</th>
              <th>Blocked</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {templates.map((x) => (
              <tr key={x._id}>
                <td>
                  <strong>{x.title}</strong>
                  {x.subType ? <div className="meta">{x.type + " / " + x.subType}</div> : null}
                </td>
                <td>
                  <StatusBadge value={x.frequency} tone="info" />
                  <div className="meta">{x.recurrence}</div>
                </td>
                <td className="meta">{(x.nextDates || []).join(", ") || "—"}</td>
                <td>{x.lastPeriod}</td>
                <td>{x.blockedCount ? <StatusBadge value={String(x.blockedCount)} tone="bad" /> : 0}</td>
                <td>
                  <StatusBadge value={x.status} />
                </td>
                <td>
                  <div className="actions-cell">
                    {meta.canAssign ? (
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() =>
                          setTf({
                            _id: x._id,
                            title: x.title,
                            description: x.description || "",
                            frequency: x.frequency,
                            startDate: x.startDate,
                            interval: x.interval || 1,
                            weekdays: x.weekdays || [],
                            monthlyMode: x.monthlyMode || "date",
                            weekday: x.weekday || 1,
                            nth: x.nth || 1,
                            endDate: x.endDate || "",
                            dueHours: x.dueHours,
                            priority: x.priority,
                            assigneeId: x.assigneeId ? String(x.assigneeId) : "",
                            assignTeam: x.assignTeam || "",
                          })
                        }
                      >
                        ✎ Edit
                      </button>
                    ) : null}
                    {meta.templateStatuses
                      .filter((s) => s !== x.status)
                      .map((s) => (
                        <button key={s} className={/active|resume/i.test(s) ? "btn good" : /stop|end|archiv/i.test(s) ? "btn bad" : "btn warn"} type="button" onClick={() => send("/api/task-templates/" + x._id, "PATCH", { status: s }, "Template " + s)}>
                          {s}
                        </button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
            {!templates.length ? (
              <tr>
                <td colSpan={7} className="empty">
                  No recurring templates.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Modal
          open={!!tf}
          size="lg"
          title={tf && tf._id ? "Edit recurring template" : "Recurring template"}
          subtitle={tf && tf._id ? "Changes apply to future instances only; tasks already generated keep their details." : undefined}
          onClose={() => setTf(null)}
          footer={
            <>
              <button className="btn ghost" type="button" onClick={() => setTf(null)}>
                Cancel
              </button>
              <button
                className="btn good"
                type="button"
                disabled={!tf || !String(tf.title || "").trim() || !tf.frequency}
                onClick={async () => {
                  const { _id, startDate, ...rest } = tf;
                  const body = { ...rest, endDate: tf.endDate || null, weekdays: tf.frequency === "Weekly" ? tf.weekdays || [] : [] };
                  if (!["Monthly", "Quarterly", "Yearly"].includes(tf.frequency)) delete body.monthlyMode;
                  const r = _id ? await send("/api/task-templates/" + _id, "PATCH", body, "Template updated") : await send("/api/task-templates", "POST", { ...body, startDate }, "Recurring template saved");
                  if (r) setTf(null);
                }}
              >
                Save template
              </button>
            </>
          }
        >
          {tf ? (
            <div className="grid2">
              <label className="span-all">
                Title *
                <input value={tf.title || ""} onChange={(e) => setT("title", e.target.value)} />
              </label>
              <label>
                Frequency *
                <select value={tf.frequency || ""} onChange={(e) => setT("frequency", e.target.value)}>
                  <option value="">—</option>
                  {meta.frequencies.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                {tf.frequency === "Every N days" ? "Every how many days *" : "Repeat every (1 = every period)"}
                <input type="number" min={tf.frequency === "Every N days" ? 2 : 1} value={tf.interval || ""} onChange={(e) => setT("interval", e.target.value)} />
              </label>
              <label>
                Start date
                <input type="date" value={tf.startDate || ""} disabled={!!tf._id} onChange={(e) => setT("startDate", e.target.value)} />
              </label>
              <label>
                End date (blank = permanent)
                <input type="date" value={tf.endDate || ""} onChange={(e) => setT("endDate", e.target.value)} />
              </label>
              {tf.frequency === "Weekly" ? (
                <div className="span-all">
                  <span className="meta">On days (none = start date's weekday)</span>
                  <div className="chips">
                    {meta.weekdays.map((d, i) => {
                      const on = (tf.weekdays || []).includes(i + 1);
                      return (
                        <button key={d} type="button" className={"chip" + (on ? " active" : "")} onClick={() => setT("weekdays", on ? tf.weekdays.filter((x) => x !== i + 1) : [...(tf.weekdays || []), i + 1])}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {["Monthly", "Quarterly", "Yearly"].includes(tf.frequency) ? (
                <>
                  <label>
                    Repeat on
                    <select value={tf.monthlyMode || "date"} onChange={(e) => setT("monthlyMode", e.target.value)}>
                      <option value="date">Same date as the start date</option>
                      <option value="weekday">A weekday (e.g. first Monday)</option>
                    </select>
                  </label>
                  {tf.monthlyMode === "weekday" ? (
                    <div className="grid2">
                      <label>
                        Week
                        <select value={tf.nth || 1} onChange={(e) => setT("nth", Number(e.target.value))}>
                          {NTH.map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Day
                        <select value={tf.weekday || 1} onChange={(e) => setT("weekday", Number(e.target.value))}>
                          {meta.weekdays.map((d, i) => (
                            <option key={d} value={i + 1}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </>
              ) : null}
              {!tf._id ? (
                <>
                  <label>
                    Type
                    <select value={tf.type || ""} onChange={(e) => setTf((x) => ({ ...x, type: e.target.value, subType: "" }))}>
                      <option value="">(General)</option>
                      {meta.types.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sub-type
                    <select value={tf.subType || ""} disabled={!subTypesOf(tf.type || "General").length} onChange={(e) => setT("subType", e.target.value)}>
                      <option value="">—</option>
                      {subTypesOf(tf.type || "General").map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              <label>
                Due after (hours from 09:00)
                <input type="number" min="1" value={tf.dueHours || ""} onChange={(e) => setT("dueHours", e.target.value)} />
              </label>
              <label>
                Priority
                <select value={tf.priority || ""} onChange={(e) => setT("priority", e.target.value)}>
                  <option value="">Medium</option>
                  {meta.priorities.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Assignee
                <select value={tf.assigneeId || ""} onChange={(e) => setT("assigneeId", e.target.value)}>
                  <option value="">—</option>
                  {userOptions}
                </select>
              </label>
              <label>
                …or team
                <input value={tf.assignTeam || ""} onChange={(e) => setT("assignTeam", e.target.value)} />
              </label>
            </div>
          ) : null}
        </Modal>
      </div>
    );
  }

  function settingsPanel() {
    return (
      <>
        {meta.admin ? (
          <div className="card">
            <h3>Task settings</h3>
            <div className="grid2">
              <label>
                Missed recurring instance
                <select value={meta.settings.missedPolicy} onChange={(e) => send("/api/tasks/settings", "PATCH", { missedPolicy: e.target.value }, "Policy saved")}>
                  {meta.missedPolicies.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={!!meta.settings.approveStaffTasks} onChange={(e) => send("/api/tasks/settings", "PATCH", { approveStaffTasks: e.target.checked }, "Approval rule saved")} /> Tasks raised by staff without the Assign action need approval (Pending Approval)
              </label>
            </div>
            <div className="section">
              <h4>Escalation ladder (hours overdue; blank = level off)</h4>
              <table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    {(meta.escalationLevels || []).map((l, i) => (
                      <th key={l}>
                        L{i + 1} · {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meta.priorities.map((p) => {
                    const row = meta.settings.escalation[p] || [null, null, null];
                    return (
                      <tr key={p}>
                        <td>
                          <StatusBadge value={p} tone={PRIORITY_TONE[p]} />
                        </td>
                        {[0, 1, 2].map((i) => (
                          <td key={i}>
                            <input
                              key={p + i + String(row[i])}
                              type="number"
                              min="0"
                              style={{ width: 90 }}
                              defaultValue={row[i] === null ? "" : row[i]}
                              onBlur={(e) => {
                                const v = e.target.value === "" ? null : Number(e.target.value);
                                if (v === row[i]) return;
                                const next = [...row];
                                next[i] = v;
                                send("/api/tasks/settings", "PATCH", { escalation: { [p]: next } }, p + " escalation saved");
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="meta">L1 goes to the team lead (below), else the task's manager; L2 to the manager, else Admin; L3 to Directors and Admins.</p>
            </div>
            <div className="section">
              <h4>Reminder rules</h4>
              <div className="grid2">
                <label>
                  Remind the assignee N days before due (comma separated)
                  <input
                    key={(meta.settings.reminderRules.daysBefore || []).join(",")}
                    defaultValue={(meta.settings.reminderRules.daysBefore || []).join(", ")}
                    onBlur={(e) => e.target.value !== (meta.settings.reminderRules.daysBefore || []).join(", ") && send("/api/tasks/settings", "PATCH", { reminderRules: { daysBefore: e.target.value, onDue: meta.settings.reminderRules.onDue } }, "Reminder rules saved")}
                  />
                </label>
                <label className="check">
                  <input type="checkbox" checked={!!meta.settings.reminderRules.onDue} onChange={(e) => send("/api/tasks/settings", "PATCH", { reminderRules: { daysBefore: meta.settings.reminderRules.daysBefore, onDue: e.target.checked } }, "Reminder rules saved")} /> Remind on the due date
                </label>
              </div>
            </div>
            <div className="section">
              <h4>Task types and sub-types</h4>
              <table>
                <tbody>
                  {(meta.taskTypes || []).map((x) => (
                    <tr key={x.name}>
                      <td>
                        <strong>{x.name}</strong>
                      </td>
                      <td className="meta">{(x.subTypes || []).join(", ") || "—"}</td>
                      <td className="meta">
                        {(x.evidence || []).length ? "Needs: " + x.evidence.join(", ") : ""}
                        {x.gps ? " · GPS check-in/out" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="btn ghost"
                type="button"
                onClick={async () => {
                  const text = await askText("One type per line — Type: sub-type, sub-type | evidence: File label, File label | gps", (meta.taskTypes || []).map(typeLine).join("\n"), { title: "Task types", multiline: true, required: true, okLabel: "Save types" });
                  if (!text) return;
                  const taskTypes = text
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .map(parseTypeLine);
                  send("/api/tasks/settings", "PATCH", { taskTypes }, "Task types saved");
                }}
              >
                ✎ Edit types
              </button>
            </div>
            <div className="section">
              <h4>Mail → task rules</h4>
              <ul className="timeline">
                {(meta.settings.mailRules || []).map((r, i) => (
                  <li key={i} className="meta">
                    {ruleLine(r)}
                  </li>
                ))}
                {!(meta.settings.mailRules || []).length ? <li className="meta">No rules — inbound mail creates tasks only when asked.</li> : null}
              </ul>
              <div className="actions-cell">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={async () => {
                    const text = await askText("One rule per line — subject|body|sender contains KEYWORD => Type | Priority | team", (meta.settings.mailRules || []).map(ruleLine).join("\n"), { title: "Mail → task rules", multiline: true, okLabel: "Save rules" });
                    if (text === null) return;
                    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
                    const mailRules = lines.map(parseRuleLine);
                    const bad = lines.filter((l, i) => !mailRules[i]);
                    if (bad.length) return setError("Could not read: " + bad.join(" / "));
                    send("/api/tasks/settings", "PATCH", { mailRules }, "Mail rules saved");
                  }}
                >
                  ✎ Edit rules
                </button>
                <label className="check">
                  <input type="checkbox" checked={!!meta.settings.blockCloseWhileTicketOpen} onChange={(e) => send("/api/tasks/settings", "PATCH", { blockCloseWhileTicketOpen: e.target.checked }, "Saved")} /> Block completing a ticket task while its ticket is open
                </label>
              </div>
            </div>
            <div className="section">
              <h4>Team leads (escalation level 1)</h4>
              <p className="meta">Team leads are set on Setup → Teams. A team without a lead escalates straight to the task manager.</p>
              {(() => {
                const teams = [...new Set([...(meta.teams || []), ...users.map((u) => u.taskProfile.team).filter(Boolean)])].sort();
                if (!teams.length) return <p className="meta">No teams yet.</p>;
                return (
                  <div className="chips">
                    {teams.map((team) => {
                      const lead = users.find((u) => String(u._id) === String(meta.settings.teamLeads[team]));
                      return <StatusBadge key={team} value={team + " → " + (lead ? lead.name : meta.settings.teamLeads[team] ? "lead (inactive?)" : "no lead")} tone={meta.settings.teamLeads[team] ? "info" : "warn"} />;
                    })}
                  </div>
                );
              })()}
            </div>
            <button className="btn warn" type="button" onClick={() => send("/api/system/sweep", "POST", {}, "Sweep run")}>
              ↻ Run SLA / recurring sweep now
            </button>
          </div>
        ) : null}
        <div className="card">
          <h3>Assignment profiles (team / region / skills)</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Open tasks</th>
                <th>Team</th>
                <th>Region</th>
                <th>Skills</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{humanize(u.functionalRole || u.hierarchy)}</td>
                  <td>
                    <StatusBadge value={String(u.openTasks)} tone={u.openTasks > 10 ? "bad" : u.openTasks > 5 ? "warn" : "good"} />
                  </td>
                  <td>{u.taskProfile.team}</td>
                  <td>{u.taskProfile.region}</td>
                  <td>
                    {(u.taskProfile.skills || []).map((s) => (
                      <span key={s} className="badge info">
                        {s}
                      </span>
                    ))}
                  </td>
                  <td>
                    {user.officeAdmin ? (
                      <button className="btn ghost" type="button" onClick={() => setProfile({ id: u._id, name: u.name, team: u.taskProfile.team || "", region: u.taskProfile.region || "", skills: (u.taskProfile.skills || []).join(", ") })}>
                        ✎ Edit
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Modal
          open={!!profile}
          size="sm"
          title={"Assignment profile" + (profile ? " · " + profile.name : "")}
          onClose={() => setProfile(null)}
          footer={
            <>
              <button className="btn ghost" type="button" onClick={() => setProfile(null)}>
                Cancel
              </button>
              <button
                className="btn good"
                type="button"
                onClick={async () => {
                  const r = await send("/api/tasks/profile/" + profile.id, "PATCH", { team: profile.team, region: profile.region, skills: profile.skills }, "Profile saved");
                  if (r) setProfile(null);
                }}
              >
                Save profile
              </button>
            </>
          }
        >
          {profile ? (
            <label>
              Team
              <select value={profile.team} onChange={(e) => setProfile({ ...profile, team: e.target.value })}>
                <option value="">—</option>
                {[...new Set([...(meta.teams || []), profile.team].filter(Boolean))].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          ) : null}
          {profile
            ? [
                ["region", "Region"],
                ["skills", "Skills (comma separated)"],
              ].map(([k, l]) => (
                <label key={k}>
                  {l}
                  <input value={profile[k]} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} />
                </label>
              ))
            : null}
        </Modal>
      </>
    );
  }

  function workloadPanel() {
    const w = workload;
    if (!w) return <div className="card empty">Loading…</div>;
    const sum = (k) => w.rows.reduce((s, r) => s + (r[k] || 0), 0);
    const heavy = (r) => r.overdue > 0 || r.open > 10;
    return (
      <div className="card">
        <div className="toolbar">
          <label className="inline">
            Team
            <select value={wlTeam} onChange={(e) => setWlTeam(e.target.value)}>
              <option value="">{w.teams.length > 1 || meta.seesAll ? "All teams" : "My team(s)"}</option>
              {w.teams.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <div className="chips">
            <StatusBadge value={w.rows.length + " people"} tone="info" />
            <StatusBadge value={sum("open") + " open"} tone="info" />
            {sum("overdue") ? <StatusBadge value={sum("overdue") + " overdue"} tone="bad" /> : null}
            {sum("dueToday") ? <StatusBadge value={sum("dueToday") + " due today"} tone="warn" /> : null}
            {w.unassigned ? <StatusBadge value={w.unassigned + " unassigned"} tone="warn" /> : null}
            <StatusBadge value={sum("done7d") + " done in 7 days"} tone="good" />
          </div>
          <span className="spacer" />
          <button className="btn ghost" type="button" onClick={() => loadWorkload(wlTeam)}>
            ↻ Refresh
          </button>
        </div>
        <table className="stack">
          <thead>
            <tr>
              <th>Person</th>
              <th>Team</th>
              <th>Open</th>
              <th>In progress</th>
              <th>In review</th>
              <th>Overdue</th>
              <th>Due today</th>
              <th>Due ≤7 days</th>
              <th>High / critical</th>
              <th>Est. hours</th>
              <th>Done 7d</th>
            </tr>
          </thead>
          <tbody>
            {w.rows.map((r) => (
              <tr key={r.userId} className={heavy(r) ? "flag" : ""}>
                <td data-label="Person">
                  <strong>{r.name}</strong> {r.lead ? <StatusBadge value="Lead" tone="info" /> : null}
                  <div className="meta">{humanize(r.role)}</div>
                </td>
                <td data-label="Team">{r.team || <span className="meta">—</span>}</td>
                <td data-label="Open">
                  <StatusBadge value={String(r.open)} tone={r.open > 10 ? "bad" : r.open > 5 ? "warn" : "good"} />
                </td>
                <td data-label="In progress">{r.inProgress}</td>
                <td data-label="In review">{r.review}</td>
                <td data-label="Overdue" className={r.overdue ? "err" : ""}>
                  {r.overdue}
                </td>
                <td data-label="Due today">{r.dueToday}</td>
                <td data-label="Due ≤7 days">{r.dueWeek}</td>
                <td data-label="High / critical">{r.critical}</td>
                <td data-label="Est. hours">{r.estHours}</td>
                <td data-label="Done 7d">{r.done7d}</td>
              </tr>
            ))}
            {!w.rows.length ? (
              <tr>
                <td colSpan={11} className="empty">
                  Nobody in this team has Tasks access.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="meta">Sorted by overdue, then open count. Rows flag people with overdue work or more than 10 open tasks.</p>
      </div>
    );
  }

  const panels = [
    ["list", "▦ Tasks", rows.length],
    ...(meta.workload ? [["workload", "☷ Workload"]] : []),
    ...(meta.canCreate
      ? [
          ["templates", "↻ Recurring", templates.length],
          ["settings", "⚙ Settings / profiles"],
        ]
      : []),
  ];
  return (
    <>
      <Tabs tabs={panels} value={panel} onChange={setPanel} />
      {panel === "workload" ? workloadPanel() : null}
      {panel === "templates" ? templatesPanel() : null}
      {panel === "settings" ? settingsPanel() : null}
      {panel === "list" ? (
        <div className="card">
          <div className="chips">
            {VIEWS.map(([k, label]) => (
              <button key={k} type="button" className={"chip" + (view === k ? " active" : "")} onClick={() => setView(k)}>
                {label}
              </button>
            ))}
          </div>
          <form
            className="toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <input style={{ flex: "1 1 280px", width: "auto" }} placeholder="Search task no, title, ATM, docket, assignee" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn ghost" type="submit">
              Search
            </button>
            {meta.seesAll && (meta.teams || []).length && view !== "team" ? (
              <select style={{ width: "auto" }} value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} aria-label="Team filter">
                <option value="">All teams</option>
                {meta.teams.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            ) : null}
            <span className="spacer" />
            {meta.export ? (
              <button className="btn ghost" type="button" onClick={exportCsv}>
                ⤓ Export CSV
              </button>
            ) : null}
            {meta.canCreate ? (
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  setNewStep(0);
                  setF({});
                }}
              >
                + New task
              </button>
            ) : null}
          </form>
          <table className="stack">
            <thead>
              <tr>
                <th>Task</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Due</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t._id} className={t.overdue ? "flag" : ""} onClick={() => openTask(t._id)} style={{ cursor: "pointer" }}>
                  <td className="nowrap" data-label="Task">
                    <strong>{t.taskNo}</strong>
                  </td>
                  <td data-label="Title">{t.title}</td>
                  <td data-label="Priority">
                    <StatusBadge value={t.priority} tone={PRIORITY_TONE[t.priority]} />
                  </td>
                  <td data-label="Status">
                    <StatusBadge value={label(t.displayStatus)} />
                    {t.blocked ? <StatusBadge value="Blocked" tone="bad" /> : null}
                  </td>
                  <td data-label="Assignee">{t.assigneeName}</td>
                  <td className={t.overdue ? "err nowrap" : "nowrap"} data-label="Due">
                    {when(t.dueAt)}
                  </td>
                  <td className="nowrap" data-label="Progress">
                    <div className="progress">
                      <div style={{ width: Math.min(100, t.percent || 0) + "%" }} />
                      <span>{t.percent || 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="empty">
                    No tasks in this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
      {createModal()}
      {detailModal()}
      {pickerModal()}
    </>
  );
}
