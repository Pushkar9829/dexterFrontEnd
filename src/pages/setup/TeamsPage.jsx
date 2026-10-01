import { useEffect, useState } from "react";
import { Field } from "../../components/common/Field.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { api } from "../../services/api.js";

const BLANK = { _id: null, name: "", department: "", description: "", leadId: "", active: true, memberIds: [] };

export function TeamsPage({ onReload, setError, setNotice }) {
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    try {
      setData(await api("/api/teams"));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) return null;
  const users = data.users || [];
  const nameOf = (id) => (users.find((u) => String(u._id) === String(id)) || {}).name || "";

  function open(t) {
    setEdit({
      ...BLANK,
      ...t,
      leadId: t.leadId ? String(t.leadId) : "",
      memberIds: (t.members || []).map((m) => String(m._id)),
      original: (t.members || []).map((m) => String(m._id)),
    });
  }

  async function save() {
    setBusy(true);
    try {
      const before = edit.original || [];
      const addMembers = edit.memberIds.filter((id) => !before.includes(id));
      const removeMembers = before.filter((id) => !edit.memberIds.includes(id));
      const body = { name: edit.name, department: edit.department, description: edit.description, leadId: edit.leadId || null, addMembers };
      if (edit._id) {
        await api("/api/teams/" + edit._id, { method: "PATCH", body: JSON.stringify({ ...body, removeMembers, active: edit.active }) });
      } else {
        await api("/api/teams", { method: "POST", body: JSON.stringify(body) });
      }
      setNotice(edit._id ? "Team updated" : "Team saved");
      setEdit(null);
      await load();
      onReload && onReload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const text = q.trim().toLowerCase();
  const rows = data.teams.filter((t) => (showInactive || t.active !== false) && (!text || [t.name, t.department, t.leadName].some((v) => String(v || "").toLowerCase().includes(text))));
  const noLead = data.teams.filter((t) => t.active !== false && !t.leadId).length;

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <input type="search" placeholder="Search team, department, lead…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="check">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
          </label>
          {noLead ? <StatusBadge value={noLead + " team(s) without a lead"} tone="warn" /> : null}
          <span className="spacer" />
          {data.canManage ? (
            <button className="btn primary" type="button" onClick={() => open(BLANK)}>
              + New team
            </button>
          ) : null}
        </div>
        <p className="meta">The team lead is the first escalation level for overdue tasks, sees the team's workload, and gets team notices. Members' Team field drives "own team" record scope.</p>
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Department</th>
              <th>Lead</th>
              <th>Members</th>
              <th>Open tasks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t._id || "v-" + t.name}>
                <td>
                  <strong>{t.name}</strong> {t.active === false ? <StatusBadge value="Inactive" tone="none" /> : null}
                  {t.unsaved ? <StatusBadge value="Lookup only" tone="warn" /> : null}
                  {t.description ? <div className="meta">{t.description}</div> : null}
                </td>
                <td>{t.department || <span className="meta">—</span>}</td>
                <td>{t.leadName || nameOf(t.leadId) || <span className="meta">No lead</span>}</td>
                <td>
                  {t.members.length} user(s)
                  {t.employees ? <div className="meta">{t.employees} employee record(s)</div> : null}
                  {t.members.length ? <div className="meta">{t.members.slice(0, 4).map((m) => m.name).join(", ") + (t.members.length > 4 ? " …" : "")}</div> : null}
                </td>
                <td>
                  {t.openTasks}
                  {t.overdueTasks ? <StatusBadge value={t.overdueTasks + " overdue"} tone="bad" /> : null}
                </td>
                <td>
                  {data.canManage ? (
                    <button className="btn ghost" type="button" onClick={() => open(t)}>
                      {t.unsaved ? "Set up" : "✎ Edit"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="empty">
                  No teams yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!edit}
        size="lg"
        title={edit && edit._id ? "Edit team — " + edit.name : edit && edit.unsaved ? "Set up team — " + edit.name : "New team"}
        onClose={() => !busy && setEdit(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="btn primary" type="button" disabled={busy || !(edit && edit.name.trim().length >= 2)} onClick={save}>
              {busy ? "Saving…" : "Save team"}
            </button>
          </>
        }
      >
        {edit ? (
          <>
            <div className="grid2">
              <Field label="Name" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} />
              <label>
                Department
                <input list="team-departments" value={edit.department || ""} onChange={(e) => setEdit({ ...edit, department: e.target.value })} />
                <datalist id="team-departments">
                  {(data.departments || []).map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </label>
              <label>
                Team lead
                <select value={edit.leadId || ""} onChange={(e) => setEdit({ ...edit, leadId: e.target.value })}>
                  <option value="">— none —</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.login})
                    </option>
                  ))}
                </select>
              </label>
              {edit._id ? (
                <label className="check">
                  <input type="checkbox" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active
                </label>
              ) : null}
              <Field label="Description" value={edit.description || ""} onChange={(v) => setEdit({ ...edit, description: v })} />
            </div>
            <h4>Members ({edit.memberIds.length})</h4>
            <p className="meta">Ticking a user sets both their Team (record scope) and their task team. A user belongs to one team at a time.</p>
            <div className="grid3" style={{ maxHeight: 280, overflow: "auto" }}>
              {users.map((u) => {
                const id = String(u._id);
                const elsewhere = !edit.memberIds.includes(id) && (u.team || u.taskTeam) && u.team !== edit.name && u.taskTeam !== edit.name;
                return (
                  <label key={id} className="check">
                    <input type="checkbox" checked={edit.memberIds.includes(id)} onChange={(e) => setEdit({ ...edit, memberIds: e.target.checked ? [...edit.memberIds, id] : edit.memberIds.filter((x) => x !== id) })} />
                    {u.name}
                    {elsewhere ? <span className="meta"> · now in {u.team || u.taskTeam}</span> : null}
                  </label>
                );
              })}
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
