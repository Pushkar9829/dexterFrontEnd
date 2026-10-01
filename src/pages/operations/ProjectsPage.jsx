import { useEffect, useState } from "react";
import { askText } from "../../components/common/Dialogs.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Steps } from "../../components/common/StepForm.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { useFocusRow } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";

function currentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: String(p.coords.latitude), lng: String(p.coords.longitude) }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });
}

function Progress({ value }) {
  return (
    <div className="progress">
      <div style={{ width: value + "%" }} />
      <span>{value}%</span>
    </div>
  );
}

const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const dateIN = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "");
const VIEW_TONE = { Active: "info", Held: "warn", Completed: "good" };

export function ProjectsPage({ canRun, canDecide, canUpload = true, isAdmin, applications, setError, setNotice }) {
  const [meta, setMeta] = useState({ stages: [], stageStatuses: [], brandingItems: [], boardFields: [], readinessItems: [] });
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("Active");
  const [openId, setOpenId] = useState("");
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("stages");
  const [creating, setCreating] = useState(false);
  const [newAppId, setNewAppId] = useState("");
  const [busy, setBusy] = useState(false);
  const { rowProps } = useFocusRow("projects", (link) => {
    setTab("stages");
    setOpenId(link.id);
  }, [projects]);

  async function loadList() {
    try {
      const [m, l] = await Promise.all([api("/api/site-projects/meta"), api("/api/site-projects")]);
      setMeta(m);
      setProjects(l.projects || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadDetail(id) {
    if (!id) return setDetail(null);
    try {
      setDetail(await api("/api/site-projects/" + id));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    loadDetail(openId);
  }, [openId]);

  async function run(fn, okText) {
    try {
      await fn();
      if (okText) setNotice(okText);
      await loadList();
      await loadDetail(openId);
    } catch (err) {
      setError(err.message);
    }
  }

  const withProject = new Set(projects.map((p) => String(p.applicationId)));
  const startable = applications.filter((a) => a.status === "Approved" && !withProject.has(String(a._id)));

  async function create() {
    if (!newAppId || busy) return;
    setBusy(true);
    try {
      const body = { applicationId: newAppId };
      const input = document.getElementById("projSelfie");
      const file = input && input.files && input.files[0];
      if (file) {
        const gps = await currentPosition();
        body.selfie = { fileName: file.name, data: await fileToB64(file), capturedAt: new Date().toISOString(), ...gps };
      }
      const r = await api("/api/site-projects", { method: "POST", body: JSON.stringify(body) });
      setNotice("Project created from approved site");
      setNewAppId("");
      setCreating(false);
      await loadList();
      setTab("stages");
      setOpenId(r.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const p = detail && detail.project;
  const evidence = (detail && detail.evidence) || [];

  function patchProject(body, okText) {
    return run(() => api("/api/site-projects/" + p._id, { method: "PATCH", body: JSON.stringify(body) }), okText);
  }

  function patchStage(idx, body) {
    return run(() => api("/api/site-projects/" + p._id + "/stages/" + idx, { method: "PATCH", body: JSON.stringify(body) }));
  }

  async function approveStage(idx, stage) {
    let date = stage.date;
    if (["Tech Live", "Cash Live"].includes(stage.name) && !date) {
      date = await askText(stage.name + " date", today(), { title: "Approve " + stage.name, inputType: "date", required: true, okLabel: "Approve" });
      if (!date) return;
    }
    return run(
      () => api("/api/site-projects/" + p._id + "/stages/" + idx + "/approve", { method: "POST", body: JSON.stringify({ date }) }),
      stage.name + " approved; next stage unlocked"
    );
  }

  async function hold() {
    const r = await askText("Reason for hold", "", { title: "Put project on hold", required: true, multiline: true, okLabel: "Put on hold" });
    if (r) patchProject({ held: true, heldReason: r }, "Project on hold");
  }

  async function uploadEvidence(e, stage) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const gps = await currentPosition();
    const data = await fileToB64(file);
    return run(
      () =>
        api("/api/documents", {
          method: "POST",
          body: JSON.stringify({ parentType: "project", parentId: p._id, type: "Stage: " + stage.name, fileName: file.name, mime: file.type, data, capturedAt: new Date().toISOString(), ...(gps || {}) }),
        }),
      "Evidence uploaded" + (gps ? " with GPS" : " (GPS not available)")
    );
  }

  async function dl(id) {
    try {
      const f = await api("/api/documents/" + id + "/file");
      downloadB64(f.fileName, f.mime, f.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function photoDeck(mail) {
    try {
      const f = await api("/api/site-projects/" + p._id + "/pptx", { method: "POST", body: JSON.stringify({ mail }) });
      if (mail) setNotice("PPT with " + f.photos + " photos queued for mail");
      else downloadB64(f.fileName, f.mime, f.data);
    } catch (err) {
      setError(err.message);
    }
  }

  const shown = projects.filter((x) => x.view === view);
  const currentIdx = p ? Math.max(0, p.stages.findIndex((s) => !s.approvedAt)) : 0;

  return (
    <>
      <Tabs tabs={["Active", "Held", "Completed"].map((v) => [v, v, projects.filter((x) => x.view === v).length])} value={view} onChange={setView} />
      <div className="card">
        <div className="toolbar">
          <span className="meta">Each stage needs evidence and approval before the next opens.</span>
          <span className="spacer" />
          {canRun ? (
            <button className="btn primary" type="button" disabled={!startable.length} title={startable.length ? "" : "No approved site without a project"} onClick={() => setCreating(true)}>
              + New project
            </button>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>Site</th>
              <th>Franchise</th>
              <th>Current stage</th>
              <th>Progress</th>
              <th>Tech Live</th>
              <th>Cash Live</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x._id} {...rowProps(x)}>
                <td>
                  <strong>{x.projectName || x.siteLocationName}</strong>
                  {x.projectName && x.projectName !== x.siteLocationName ? <div className="meta">{x.siteLocationName}</div> : null}
                </td>
                <td>{x.franchiseName}</td>
                <td>
                  {x.currentStage ? <StatusBadge value={x.currentStage} tone={x.delayed ? "bad" : "info"} /> : "—"}
                  {x.currentDue ? <div className="meta">due {x.currentDue}</div> : null}
                  {x.delayed ? <div className="err">Delayed: {x.overdueStages.join(", ")}</div> : null}
                </td>
                <td>
                  <Progress value={x.progress} />
                </td>
                <td>{dateIN(x.techLiveDate)}</td>
                <td>{x.cashLiveDate ? <StatusBadge value={dateIN(x.cashLiveDate)} tone="good" /> : ""}</td>
                <td>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      setTab("stages");
                      setOpenId(x._id);
                    }}
                  >
                    Open ›
                  </button>
                </td>
              </tr>
            ))}
            {!shown.length ? (
              <tr>
                <td colSpan={7} className="empty">
                  No {view.toLowerCase()} projects.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={creating}
        title="New project"
        subtitle="Start a project from an approved site."
        onClose={() => !busy && setCreating(false)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button className="btn good" type="button" onClick={create} disabled={!newAppId || busy}>
              {busy ? "Creating…" : "Create project"}
            </button>
          </>
        }
      >
        <label>
          Approved site
          <select value={newAppId} onChange={(e) => setNewAppId(e.target.value)}>
            <option value="">—</option>
            {startable.map((a) => (
              <option key={a._id} value={a._id}>
                {a.siteLocationName || a._id} {a.siteNumber ? "(" + a.siteNumber + ")" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visit selfie (optional, GPS stamped) <input id="projSelfie" type="file" accept="image/*" capture="user" />
        </label>
      </Modal>

      <Modal
        open={!!p}
        size="xl"
        title={p ? p.projectName || p.siteLocationName : ""}
        subtitle={
          p ? (
            <span className="chips">
              <StatusBadge value={p.view} tone={VIEW_TONE[p.view]} />
              <Progress value={p.progress} />
              <span>
                Franchise {p.franchiseName || "—"} · Model {p.model || "—"} · LOI {p.loiCode || "—"}
              </span>
            </span>
          ) : null
        }
        onClose={() => setOpenId("")}
        footer={
          p ? (
            <>
              {canDecide || isAdmin ? (
                <>
                  <button className="btn ghost" type="button" onClick={() => photoDeck(false)}>
                    ⤓ Photo PPT
                  </button>
                  <button className="btn ghost" type="button" onClick={() => photoDeck(true)}>
                    ✉ Mail photo PPT
                  </button>
                </>
              ) : null}
              <span className="spacer" />
              {canRun && !p.completedAt ? (
                p.held ? (
                  <button className="btn good" type="button" onClick={() => patchProject({ held: false }, "Project resumed")}>
                    ▶ Resume project
                  </button>
                ) : (
                  <button className="btn warn" type="button" onClick={hold}>
                    ❚❚ Put on hold
                  </button>
                )
              ) : null}
              <button className="btn ghost" type="button" onClick={() => setOpenId("")}>
                Close
              </button>
            </>
          ) : null
        }
      >
        {p ? (
          <div key={p._id}>
            <Steps steps={p.stages.map((s) => ({ key: s.name, label: s.name }))} current={p.completedAt ? p.stages.length : currentIdx} done={p.stages.map((s, i) => (s.approvedAt ? i : -1))} />
            {p.held ? <p className="offline">On hold: {p.heldReason}</p> : null}
            <Tabs
              tabs={[
                ["stages", "Stages", p.stages.filter((s) => s.approvedAt).length + "/" + p.stages.length],
                ["details", "Details"],
                ["board", "Board"],
                ["readiness", "Readiness"],
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === "details" ? (
              <>
                <p className="meta">
                  {p.location.address} {p.location.city} {p.location.pin} · Landlord {p.contacts.landlord} {p.contacts.mobile}
                </p>
                <div className="grid2">
                  {["projectName", "applyDate", "visitDate", "visitBy", "loiDate", "possessionDate", "siteNumber"].map((k) => (
                    <label key={k}>
                      {humanize(k)}
                      <input defaultValue={p[k] || ""} disabled={!canRun} onBlur={(e) => e.target.value !== (p[k] || "") && patchProject({ [k]: e.target.value }, "Saved")} />
                    </label>
                  ))}
                  <label>
                    ATM ID (from ATM Master; needed for Cash Live)
                    <input defaultValue={p.atmId || ""} disabled={!canRun} onBlur={(e) => e.target.value !== (p.atmId || "") && patchProject({ atmId: e.target.value }, "ATM linked")} />
                  </label>
                </div>
                <p className="meta">Fields save when you leave them.</p>
              </>
            ) : null}
            {tab === "board" ? (
              <div className="grid2">
                {meta.boardFields.map((k) => (
                  <label key={k}>
                    {humanize(k)}
                    {(p.boardLive || {})[k] ? <span className="badge info"> live from register</span> : null}
                    <input
                      key={p.board[k] || ""}
                      defaultValue={p.board[k] || ""}
                      disabled={!canRun || (p.boardLive || {})[k]}
                      onBlur={(e) => e.target.value !== (p.board[k] || "") && patchProject({ board: { [k]: e.target.value } }, "Saved")}
                    />
                  </label>
                ))}
              </div>
            ) : null}
            {tab === "readiness" ? (
              <div className="grid2">
                {meta.readinessItems.map((k) => (
                  <label key={k}>
                    {humanize(k)} <StatusBadge value={p.readiness[k] || "Pending"} />
                    <select value={p.readiness[k] || "Pending"} disabled={!canRun} onChange={(e) => patchProject({ readiness: { [k]: e.target.value } })}>
                      {["Pending", "Delivered", "Installation pending", "Installation done", "Done"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
            {tab === "stages" ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Stage</th>
                      <th>Status</th>
                      <th>Start → due</th>
                      <th>Date</th>
                      <th>Owner</th>
                      <th>Remarks</th>
                      <th>Evidence</th>
                      <th>Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.stages.map((s, i) => {
                      const open = i === 0 || !!p.stages[i - 1].approvedAt;
                      const locked = !!s.approvedAt && !isAdmin;
                      const editable = canRun && open && !locked && !p.held;
                      const planEditable = canRun && !locked && !p.held;
                      const ev = evidence.filter((d) => d.type === "Stage: " + s.name);
                      return (
                        <tr key={s.name} className={open ? "" : "locked"}>
                          <td>{i + 1}</td>
                          <td>
                            <strong>{s.name}</strong>
                            {s.name === "Branding" ? (
                              <div className="chips">
                                {meta.brandingItems.map((k) => (
                                  <label key={k} className="check">
                                    {k}
                                    <select style={{ width: "auto", height: 24 }} value={(s.extra || {})[k] || "Pending"} disabled={!editable} onChange={(e) => patchStage(i, { extra: { [k]: e.target.value } })}>
                                      <option>Pending</option>
                                      <option>Done</option>
                                    </select>
                                  </label>
                                ))}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <select value={s.status} disabled={!editable} onChange={(e) => patchStage(i, { status: e.target.value })}>
                              {meta.stageStatuses.map((x) => (
                                <option key={x}>{x}</option>
                              ))}
                            </select>
                          </td>
                          <td className="nowrap">
                            <input type="date" title="Planned start" defaultValue={s.startDate || ""} disabled={!planEditable} onBlur={(e) => e.target.value !== (s.startDate || "") && patchStage(i, { startDate: e.target.value })} />
                            <input type="date" title="Due date" defaultValue={s.dueDate || ""} disabled={!planEditable} onBlur={(e) => e.target.value !== (s.dueDate || "") && patchStage(i, { dueDate: e.target.value })} />
                            {s.overdue ? <StatusBadge value="Overdue" tone="bad" /> : null}
                          </td>
                          <td>
                            <input type="date" defaultValue={s.date || ""} disabled={!editable} onBlur={(e) => e.target.value !== (s.date || "") && patchStage(i, { date: e.target.value })} />
                          </td>
                          <td>
                            <input defaultValue={s.owner || ""} disabled={!editable} onBlur={(e) => e.target.value !== (s.owner || "") && patchStage(i, { owner: e.target.value })} />
                          </td>
                          <td>
                            <input defaultValue={s.remarks || ""} disabled={!editable} onBlur={(e) => e.target.value !== (s.remarks || "") && patchStage(i, { remarks: e.target.value })} />
                          </td>
                          <td>
                            <div className="actions-cell">
                              {ev.map((d) => (
                                <button key={d._id} className="btn ghost" type="button" title={d.gps ? "GPS " + d.gps.lat + "," + d.gps.lng : "no GPS"} onClick={() => dl(d._id)}>
                                  ⤓ v{d.version}
                                  {d.gps ? " 📍" : ""}
                                </button>
                              ))}
                              {canUpload && open && !p.held ? (
                                <label className="btn ghost filebtn">
                                  ⤒ Upload
                                  <input type="file" accept="image/*,.ppt,.pptx,.pdf" onChange={(e) => uploadEvidence(e, s)} />
                                </label>
                              ) : null}
                            </div>
                          </td>
                          <td className="nowrap">
                            {s.approvedAt ? (
                              <StatusBadge value={"Approved " + dateIN(s.approvedAt)} tone="good" />
                            ) : canDecide && open && !p.held ? (
                              <button className="btn good" type="button" onClick={() => approveStage(i, s)}>
                                ✓ Approve
                              </button>
                            ) : (
                              <StatusBadge value={open ? "Awaiting approval" : "Locked"} tone={open ? "warn" : "none"} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="meta">Franchise PPT mail needs a mail gateway; evidence is stored and downloadable instead.</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
