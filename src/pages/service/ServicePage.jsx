import { Fragment, useEffect, useState } from "react";
import { askText } from "../../components/common/Dialogs.jsx";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { StepNav, Steps } from "../../components/common/StepForm.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { t } from "../../i18n/index.js";
import { TicketMail } from "./mail/TicketMail.jsx";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { can, canDecide } from "../../utils/perm.js";
import { takeFocus } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";

const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "");
const PRIORITY_TONE = { Critical: "bad", High: "bad", Medium: "warn", Low: "info" };
const AGE_BUCKETS = ["0–1", "2–3", "4–7", "8–15", "16–30", "30+"];
const AGE_COLORS = ["#059669", "#65a30d", "#d97706", "#ea580c", "#dc2626", "#991b1b"];
const RAISE_STEPS = [
  { key: "problem", label: "Problem", hint: "ATM and issue" },
  { key: "who", label: "Complainant", hint: "Contact and routing" },
];

function gpsNow() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: String(p.coords.latitude), lng: String(p.coords.longitude) }),
      () => resolve({}),
      { timeout: 8000 }
    );
  });
}

const isVideo = (d) => /^video\//.test(d.mime || "") || /\.(mp4|webm|mov|3gp)$/i.test(d.fileName || "");
const MAX_VIDEO_MB = 12;

function Files({ files, onDownload, onPlay }) {
  return (files || []).map((d) => (
    <button key={d._id} className="btn ghost" type="button" onClick={() => (isVideo(d) && onPlay ? onPlay(d) : onDownload(d._id))} title={d.gps ? "GPS " + d.gps.lat + "," + d.gps.lng : ""}>
      {isVideo(d) ? "▶" : "⤓"} {d.fileName} v{d.version}
      {d.gps ? " 📍" : ""}
    </button>
  ));
}

function VideoUpload({ onChange, label }) {
  return (
    <label className="btn ghost filebtn" title={"Up to " + MAX_VIDEO_MB + " MB (mp4, webm, mov, 3gp)"}>
      🎥 {label || "Add video"}
      <input type="file" accept="video/mp4,video/webm,video/quicktime,video/3gpp" capture="environment" onChange={onChange} />
    </label>
  );
}

const mapLink = (q) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

const VISIT_FIELDS = ["findings", "remarks", "problemIdentified", "actionTaken", "spareRequired", "spareUsed", "siteStatus"];
const visitFields = (f) => Object.fromEntries(VISIT_FIELDS.filter((k) => f[k] !== undefined).map((k) => [k, f[k]]));
const ANSWER_OPTIONS = { passfail: ["Pass", "Fail", "NA"], yesno: ["Yes", "No", "NA"], rating: ["1", "2", "3", "4", "5", "NA"] };
const itemFailed = (c) => c.result === "Fail" || c.result === "No" || ((c.answer || "passfail") === "rating" && ["1", "2"].includes(c.result));

function PhotoUpload({ onChange, capture, label }) {
  return (
    <label className="btn ghost filebtn">
      📷 {label || "Add photo"}
      <input type="file" accept="image/*" capture={capture} onChange={onChange} />
    </label>
  );
}

export function ServicePage({ user, atms, setError, setNotice }) {
  const field = !!user.fieldStaff;
  const franchiseUser = ["Franchise", "MasterFranchise", "SuperMasterFranchise"].includes(user.hierarchy);
  const [tab, setTab] = useState("My work");
  const [board, setBoard] = useState(null);
  const [q, setQ] = useState("");
  const [prio, setPrio] = useState("");
  const [focusId, setFocusId] = useState("");
  const [dup, setDup] = useState(null);
  const [meta, setMeta] = useState({ problemTypes: [], priorities: [], priorityLabels: {}, statuses: [], channels: [], visitOutcomes: [], inspectionTypes: [], checklist: [], slaHours: {} });
  const pl = (p) => (meta.priorityLabels || {})[p] || p;
  const [view, setView] = useState("open");
  const [exp, setExp] = useState({ from: "", to: "" });
  const [list, setList] = useState({ complaints: [], buckets: {} });
  const [openId, setOpenId] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [officers, setOfficers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [visits, setVisits] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [history, setHistory] = useState(null);
  const blankComplaint = () => ({ atmId: "", problemType: "", subject: "", description: "", complainantName: user.name || "", complainantMobile: "", frEmail: "", state: "", priority: "Medium", channel: "CRM" });
  const [nc, setNc] = useState(blankComplaint);
  const [raising, setRaising] = useState(false);
  const [raiseStep, setRaiseStep] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [act, setAct] = useState({});
  const [vf, setVf] = useState({});
  const [insp, setInsp] = useState(null);
  const [edit, setEdit] = useState({});
  const [resched, setResched] = useState(null);
  const [historyAtm, setHistoryAtm] = useState("");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(null);

  const tabs = field ? ["My work", "Visits", "Inspections"] : franchiseUser ? ["My work", "Complaints", "Inspections"] : ["My work", "Complaints", "Visits", "Inspections", "ATM history"];
  const desk = !!meta.desk;
  const admin = ["Admin", "DexterIndiaCompanyTeam"].includes(user.hierarchy);

  async function guard(fn, ok, onQueued) {
    setBusy(true);
    try {
      const r = await fn();
      if (r && r.queued) {
        setNotice(r.label + " saved on this device; it will be sent when you are back online");
        if (onQueued) onQueued();
        return r;
      }
      if (ok) setNotice(typeof ok === "function" ? ok(r) : ok);
      await load();
      return r || {};
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const send = (path, method, body) => api(path, { method, body: JSON.stringify(body || {}) });
  const sendField = (path, method, body, label) => api(path, { method, body: JSON.stringify(body || {}), offline: label });
  const markVisit = (id, patch) => setVisits((list) => list.map((x) => (x._id === id ? { ...x, ...patch, pendingSync: true } : x)));

  async function load() {
    try {
      const m = await api("/api/service/meta");
      setMeta(m);
      if (m.desk && !officers.length) setOfficers((await api("/api/service/officers")).officers || []);
      if (m.desk && !owners.length) setOwners((await api("/api/tasks/assignees").catch(() => ({ users: [] }))).users.filter((u) => !["Franchise", "MasterFranchise", "SuperMasterFranchise"].includes(u.hierarchy)));
      if (tab === "My work") setBoard(await api("/api/service/board"));
      if (tab === "Complaints") setList(await api("/api/complaints?view=" + view + (q.trim() ? "&q=" + encodeURIComponent(q.trim()) : "") + (prio ? "&priority=" + prio : "")));
      if (tab === "Visits") setVisits((await api("/api/visits")).visits || []);
      if (tab === "Inspections") setInspections((await api("/api/inspections")).inspections || []);
      if (openId) setDetail(await api("/api/complaints/" + openId));
      else setDetail(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [tab, view, openId, prio]);

  useEffect(() => {
    const link = takeFocus("service");
    if (!link) return;
    if (tabs.includes(link.type) && !link.id) {
      setTab(link.type);
    } else if (link.type === "visit") {
      setFocusId(link.id);
      setTab("Visits");
    } else if (link.type === "inspection") {
      setFocusId(link.id);
      setTab("Inspections");
    } else if (!field && link.id) {
      setTab("Complaints");
      openComplaint(link.id);
    }
  }, []);

  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      const el = document.getElementById("row-" + focusId);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 400);
    return () => clearTimeout(t);
  }, [focusId, visits, inspections]);

  useEffect(() => {
    if (tab !== "Inspections" || !focusId) return;
    const x = inspections.find((i) => i._id === focusId);
    if (x) {
      setEdit({ _id: x._id, checklist: x.checklist.map((i) => ({ ...i })), remarks: x.remarks || "" });
      setFocusId("");
    }
  }, [tab, focusId, inspections]);

  function goRecord(type, id) {
    if (type === "complaint") {
      setTab("Complaints");
      openComplaint(id);
    } else {
      setFocusId(id);
      setTab(type === "visit" ? "Visits" : "Inspections");
    }
  }

  function openComplaint(id) {
    setAct({});
    setDetailTab("overview");
    setOpenId(id);
  }

  async function exportCsv() {
    try {
      const r = await api("/api/complaints-export?from=" + (exp.from || "") + "&to=" + (exp.to || ""));
      downloadB64(r.fileName, "text/csv", btoa(unescape(encodeURIComponent(r.csv))));
    } catch (err) {
      setError(err.message);
    }
  }

  async function download(id) {
    try {
      const f = await api("/api/documents/" + id + "/file");
      downloadB64(f.fileName, f.mime, f.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function upload(e, parentType, parentId, type) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const video = /^video\//.test(file.type);
    if (video && file.size > MAX_VIDEO_MB * 1048576) return setError("Video is " + Math.round(file.size / 1048576) + " MB; the limit is " + MAX_VIDEO_MB + " MB. Record a shorter clip or lower the camera resolution.");
    const gps = await gpsNow();
    const data = await fileToB64(file);
    const body = { parentType, parentId, type, fileName: file.name, mime: file.type, data, capturedAt: new Date().toISOString(), ...gps };
    const field = parentType === "visit" || parentType === "inspection";
    await guard(() => (field ? sendField("/api/documents", "POST", body, type + " (" + file.name + ")") : send("/api/documents", "POST", body)), video ? "Video uploaded" : "Photo uploaded");
  }

  async function play(d) {
    try {
      const f = await api("/api/documents/" + d._id + "/file");
      const bytes = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
      if (playing) URL.revokeObjectURL(playing.url);
      setPlaying({ name: f.fileName, url: URL.createObjectURL(new Blob([bytes], { type: f.mime })) });
    } catch (err) {
      setError(err.message);
    }
  }

  async function pickRaiseAtm(atmId, problemType) {
    const a = atms.find((x) => x.atmId === atmId);
    setNc((n) => ({
      ...n,
      atmId,
      problemType,
      complainantMobile: n.complainantMobile || (a && a.mobile) || "",
      frEmail: n.frEmail || (a && a.email) || "",
      subject: n.subject || (problemType && atmId ? problemType + " — ATM " + atmId : ""),
    }));
    setDup(null);
    if (!atmId || !problemType) return;
    try {
      const r = await api("/api/complaints?view=open&atmId=" + encodeURIComponent(atmId));
      setDup((r.complaints || []).find((x) => x.problemType === problemType) || null);
    } catch {
      setDup(null);
    }
  }

  async function raise() {
    const r = await guard(() => send("/api/complaints", "POST", nc), (x) => x.message);
    if (r && r.id) {
      setRaising(false);
      setNc(blankComplaint());
      openComplaint(r.id);
    }
  }

  const c = detail && detail.complaint;
  const patchC = (body, ok) => guard(() => send("/api/complaints/" + c._id, "PATCH", body), ok);

  /* ---------- my work ---------- */

  function renderBoard() {
    const b = board;
    if (!b) return <p className="meta">Loading…</p>;
    const ticketList = (rows, empty, extra) =>
      rows.length ? (
        <table>
          <tbody>
            {rows.slice(0, 25).map((x) => (
              <tr key={x._id} className={x.overdue ? "flag" : ""}>
                <td className="nowrap">
                  <strong>{x.docketNumber}</strong>
                  <div className="meta">{x.atmId}</div>
                </td>
                <td>
                  {x.problemType}
                  <div className="meta">{x.franchiseName}</div>
                </td>
                <td>
                  <StatusBadge value={pl(x.priority)} tone={PRIORITY_TONE[x.priority]} /> <StatusBadge value={x.status} />
                </td>
                <td className={x.overdue ? "err nowrap" : "nowrap"}>{x.dueAt ? (x.overdue ? "Overdue · " : "Due ") + when(x.dueAt) : ""}</td>
                <td>
                  <button className="btn ghost" type="button" onClick={() => goRecord("complaint", x._id)}>
                    {extra || "Open ›"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="meta">{empty}</p>
      );
    const visitList = (rows, empty) =>
      rows.length ? (
        <table>
          <tbody>
            {rows.map((v) => (
              <tr key={v._id}>
                <td className="nowrap">
                  <strong>{v.docketNumber}</strong>
                  <div className="meta">{v.atmId}</div>
                </td>
                <td>{v.officerName}</td>
                <td className="nowrap">{when(v.scheduledAt)}</td>
                <td>
                  <StatusBadge value={v.status} />
                </td>
                <td>
                  <button className="btn ghost" type="button" onClick={() => goRecord("visit", v._id)}>
                    Open ›
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="meta">{empty}</p>
      );
    const inspList = (rows, empty) =>
      rows.length ? (
        <table>
          <tbody>
            {rows.map((x) => (
              <tr key={x._id}>
                <td className="nowrap">
                  <strong>{x.atmId}</strong>
                  <div className="meta">{x.type}</div>
                </td>
                <td>{x.officerName}</td>
                <td className="nowrap">{x.date}</td>
                <td>
                  <StatusBadge value={x.status} /> {x.result ? <StatusBadge value={x.result} /> : null}
                  {x.rejectReason && x.status === "Assigned" ? <div className="err">Returned: {x.rejectReason}</div> : null}
                </td>
                <td>
                  <button className="btn ghost" type="button" onClick={() => goRecord("inspection", x._id)}>
                    Open ›
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="meta">{empty}</p>
      );
    const sections = field
      ? [
          ["Visits in progress", b.visitsInProgress.length, visitList(b.visitsInProgress, "None checked in."), "#2563eb"],
          ["Visits today", b.visitsToday.length, visitList(b.visitsToday, "No visits scheduled today."), "#059669"],
          ["Overdue visits", b.visitsOverdue.length, visitList(b.visitsOverdue, "Nothing overdue."), "#dc2626"],
          ["Inspections due", b.inspectionsDue.length, inspList(b.inspectionsDue, "No inspections due."), "#d97706"],
        ]
      : franchiseUser
        ? [
            ["Resolved — confirm and close", b.toClose.length, ticketList(b.toClose, "Nothing waiting for your confirmation.", "Confirm ›"), "#059669"],
            ["My open tickets", b.mine.length + b.breaching.length, ticketList(b.breaching.length ? b.breaching : b.mine, "No open tickets."), "#2563eb"],
          ]
        : [
            ["SLA breaching (≤ 1 hour)", b.breaching.length, ticketList(b.breaching, "Nothing close to SLA."), "#dc2626"],
            ["My tickets", b.mine.length, ticketList(b.mine, "Nothing assigned to you."), "#2563eb"],
            ...(desk ? [["Unassigned", b.unassigned.length, ticketList(b.unassigned, "Every open ticket has an owner.", "Assign ›"), "#d97706"]] : []),
            ...(desk ? [["Resolutions to verify", b.toVerify.length, ticketList(b.toVerify, "Nothing to verify.", "Verify ›"), "#059669"]] : []),
            ["Visits today / overdue", b.visitsToday.length + b.visitsOverdue.length, visitList([...b.visitsOverdue, ...b.visitsToday], "No visits due."), "#7c3aed"],
            ...(meta.canVerifyInspection ? [["Inspections to verify", b.inspectionsToVerify.length, inspList(b.inspectionsToVerify, "Nothing submitted."), "#0891b2"]] : []),
          ];
    return (
      <>
        <div className="kpis">
          {sections.map(([label, n, , color]) => (
            <div key={label} className="kpi" style={{ "--k": color }}>
              <div className="l">{label}</div>
              <div className="v">{n}</div>
            </div>
          ))}
        </div>
        {sections
          .filter(([, n]) => n)
          .map(([label, n, body]) => (
            <div key={label} className="card">
              <h3>
                {label} <span className="badge">{n}</span>
              </h3>
              {body}
            </div>
          ))}
        {sections.every(([, n]) => !n) ? <div className="card empty">All clear — nothing needs your attention right now.</div> : null}
      </>
    );
  }

  /* ---------- complaints ---------- */

  function renderComplaints() {
    const total = AGE_BUCKETS.reduce((s, b) => s + (list.buckets[b] || 0), 0);
    return (
      <>
        <div className="kpis">
          {AGE_BUCKETS.map((b, i) => (
            <div key={b} className="kpi" style={{ "--k": AGE_COLORS[i] }}>
              <div className="l">Open · {b} days</div>
              <div className="v">{list.buckets[b] || 0}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <Tabs
            tabs={[
              ["open", t("Open")],
              ...(franchiseUser ? [] : [["mine", "Mine"]]),
              ["overdue", t("Overdue")],
              ...(desk ? [["toVerify", "To verify"]] : []),
              ["done", t("Resolved / Closed")],
              ["", t("All")],
            ]}
            value={view}
            onChange={setView}
          />
          <div className="toolbar">
            <form
              className="inline"
              onSubmit={(e) => {
                e.preventDefault();
                load();
              }}
            >
              <input placeholder="Search docket, ATM, franchise, subject…" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
            <select value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="Priority">
              <option value="">Any priority</option>
              {meta.priorities.map((p) => (
                <option key={p} value={p}>{pl(p)}</option>
              ))}
            </select>
            <span className="meta">
              {list.complaints.length} in view · {total} open
            </span>
            {meta.canExport ? (
              <>
                <label className="inline">
                  From <input type="date" value={exp.from} onChange={(e) => setExp({ ...exp, from: e.target.value })} />
                </label>
                <label className="inline">
                  To <input type="date" value={exp.to} onChange={(e) => setExp({ ...exp, to: e.target.value })} />
                </label>
                <button className="btn ghost" type="button" onClick={exportCsv}>
                  ⤓ Export CSV
                </button>
              </>
            ) : null}
            <span className="spacer" />
            {admin && meta.settings ? (
              <button className="btn ghost" type="button" onClick={() => setShowSettings(true)}>
                ⚙ Settings
              </button>
            ) : null}
            {!field && can(user, "Create", "CRM-05") ? (
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  setRaiseStep(0);
                  setDup(null);
                  setRaising(true);
                  if (atms.length === 1 && !nc.atmId) pickRaiseAtm(atms[0].atmId, nc.problemType);
                }}
              >
                + {t("Raise complaint")}
              </button>
            ) : null}
          </div>
          <table className="stack">
            <thead>
              <tr>
                <th>{t("Docket")}</th>
                <th>{t("ATM")}</th>
                <th>{t("Franchise")}</th>
                <th>{t("Problem")}</th>
                <th>{t("Priority")}</th>
                <th>{t("Status")}</th>
                <th>{t("Ageing")}</th>
                <th>{t("SLA due")}</th>
                <th>{t("Owner")}</th>
                <th>{t("Last action")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.complaints.map((x) => (
                <tr key={x._id} className={x.overdue ? "flag" : ""}>
                  <td className="nowrap" data-label="Docket">
                    <strong>{x.docketNumber}</strong>
                  </td>
                  <td className="nowrap" data-label="ATM">
                    {x.atmId}
                  </td>
                  <td data-label="Franchise">{x.franchiseName}</td>
                  <td data-label="Problem">{x.problemType}</td>
                  <td data-label="Priority">
                    <StatusBadge value={pl(x.priority)} tone={PRIORITY_TONE[x.priority]} />
                  </td>
                  <td data-label="Status">
                    <StatusBadge value={x.status} />
                    {x.escalationLevel ? <StatusBadge value={["", "SSM", "RM", "Management"][x.escalationLevel]} tone="bad" /> : null}
                  </td>
                  <td data-label="Ageing">
                    {x.ageingDays}d <span className="meta">({x.ageBucket})</span>
                  </td>
                  <td className={x.overdue ? "err" : ""} data-label="SLA due">
                    {when(x.dueAt)}
                    {x.slaBreached ? (
                      <div>
                        <StatusBadge value="SLA breached" tone="bad" />
                      </div>
                    ) : null}
                  </td>
                  <td data-label="Owner">{x.ownerName}</td>
                  <td data-label="Last action" className="meta">
                    {x.lastAction}
                  </td>
                  <td>
                    <button className="btn ghost" type="button" onClick={() => openComplaint(x._id)}>
                      Open ›
                    </button>
                  </td>
                </tr>
              ))}
              {!list.complaints.length ? (
                <tr>
                  <td colSpan={11} className="empty">
                    No complaints in this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function raiseModal() {
    return (
      <Modal
        open={raising}
        size="lg"
        title={t("Raise complaint")}
        subtitle={"SLA hours: " + Object.entries(meta.slaHours).map(([k, v]) => k + " " + v + "h").join(" · ")}
        onClose={() => !busy && setRaising(false)}
        footer={
          <StepNav current={raiseStep} total={RAISE_STEPS.length} onBack={() => setRaiseStep(raiseStep - 1)} onNext={() => setRaiseStep(raiseStep + 1)}>
            {raiseStep === RAISE_STEPS.length - 1 ? (
              <button className="btn good" type="button" disabled={busy || !nc.atmId || !nc.problemType} onClick={raise}>
                {busy ? "Submitting…" : t("Submit complaint")}
              </button>
            ) : null}
          </StepNav>
        }
      >
        <Steps steps={RAISE_STEPS} current={raiseStep} onPick={setRaiseStep} />
        {raiseStep === 0 ? (
          <>
            <div className="grid2">
              <label>
                {t("ATM ID")} *
                <select value={nc.atmId} onChange={(e) => pickRaiseAtm(e.target.value, nc.problemType)}>
                  <option value="">—</option>
                  {atms.map((a) => (
                    <option key={a._id} value={a.atmId}>
                      {a.atmId} · {a.city}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Problem type")} *
                <select value={nc.problemType} onChange={(e) => pickRaiseAtm(nc.atmId, e.target.value)}>
                  <option value="">—</option>
                  {(meta.categories || []).length
                    ? meta.categories.map((cat) => (
                        <optgroup key={cat.name} label={cat.name}>
                          {(cat.problemTypes || []).map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </optgroup>
                      ))
                    : meta.problemTypes.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="span-all">
                {t("Subject")}
                <input value={nc.subject} onChange={(e) => setNc({ ...nc, subject: e.target.value })} />
              </label>
            </div>
            <label>
              {t("Description / remark (Hindi or English)")}
              <textarea value={nc.description} onChange={(e) => setNc({ ...nc, description: e.target.value })} />
            </label>
            {dup ? (
              <p className="err">
                Docket {dup.docketNumber} is already open for this ATM and problem ({dup.status}).{" "}
                <button className="btn ghost" type="button" onClick={() => (setRaising(false), goRecord("complaint", dup._id))}>
                  Open it ›
                </button>
              </p>
            ) : (
              <p className="meta">A second open complaint on the same ATM and problem is rejected with the existing docket.</p>
            )}
          </>
        ) : (
          <div className="grid2">
            {["complainantName", "complainantMobile", "frEmail", "state"].map((k) => (
              <label key={k}>
                {t(humanize(k))}
                <input value={nc[k]} onChange={(e) => setNc({ ...nc, [k]: e.target.value })} />
              </label>
            ))}
            {desk ? (
              <>
                <label>
                  {t("Priority")}
                  <select value={nc.priority} onChange={(e) => setNc({ ...nc, priority: e.target.value })}>
                    {meta.priorities.map((p) => (
                      <option key={p} value={p}>{pl(p)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Received by
                  <select value={nc.channel} onChange={(e) => setNc({ ...nc, channel: e.target.value })}>
                    {meta.channels.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>
        )}
        {raiseStep === 1 && (!nc.atmId || !nc.problemType) ? <p className="err">ATM ID and problem type are required (step 1).</p> : null}
        {raiseStep === 1 && raiseSla() ? (
          <p className="meta">
            SLA: {raiseSla().label} → due by {when(new Date(Date.now() + raiseSla().hours * 3600000))}
          </p>
        ) : null}
      </Modal>
    );
  }

  function raiseSla() {
    const p = desk ? nc.priority : "Medium";
    const cat = (meta.categories || []).find((x) => (x.problemTypes || []).includes(nc.problemType));
    const own = cat && Number((cat.slaHours || {})[p]);
    const hours = own > 0 ? own : meta.slaHours[p];
    return hours ? { hours, label: pl(p) + " priority" + (own > 0 ? " · " + cat.name + " SLA" : "") } : null;
  }

  function settingsModal() {
    const s = meta.settings;
    if (!s) return null;
    const map = Object.entries(s.serviceMap || {});
    async function editMap() {
      const raw = await askText(
        "One line per region: Region = SSM name / RM name  (use * for the default)",
        map.map(([k, v]) => k + " = " + (v.ssm || "") + " / " + (v.rm || "")).join("\n"),
        { title: "SSM / RM mapping", multiline: true, okLabel: "Save" }
      );
      if (raw == null) return;
      const serviceMap = {};
      for (const line of raw.split(/\n|;/).map((l) => l.trim()).filter(Boolean)) {
        const [k, rest = ""] = line.split("=");
        const [ssm = "", rm = ""] = rest.split("/");
        serviceMap[k.trim()] = { ssm: ssm.trim(), rm: rm.trim() };
      }
      await guard(() => send("/api/service/settings", "PATCH", { serviceMap }), "SSM / RM mapping saved");
    }
    async function editHours() {
      const raw = await askText("Hours past SLA before auto-escalation: SSM, RM, Management", ["SSM", "RM", "Management"].map((k) => s.autoEscalateHours[k]).join(", "), { title: "Escalation hours", okLabel: "Save" });
      if (raw == null) return;
      const [SSM, RM, Management] = raw.split(",").map((x) => x.trim());
      await guard(() => send("/api/service/settings", "PATCH", { autoEscalateHours: { SSM, RM, Management } }), "Escalation hours saved");
    }
    async function editCategories() {
      const cats = meta.categories || [];
      const raw = await askText(
        "One line per category:  Category: problem type, problem type | Critical=2, High=8   (the | part is optional and overrides the priority SLA for that category)",
        cats
          .map((c) => {
            const sla = Object.entries(c.slaHours || {}).map(([p, h]) => p + "=" + h);
            return c.name + ": " + (c.problemTypes || []).join(", ") + (sla.length ? " | " + sla.join(", ") : "");
          })
          .join("\n"),
        { title: "Complaint categories", multiline: true, okLabel: "Save" }
      );
      if (raw == null) return;
      const categories = [];
      for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
        const [head, slaPart = ""] = line.split("|");
        const at = head.indexOf(":");
        const name = (at < 0 ? head : head.slice(0, at)).trim();
        const problemTypes = at < 0 ? [] : head.slice(at + 1).split(",").map((x) => x.trim()).filter(Boolean);
        const slaHours = {};
        slaPart.split(",").forEach((pair) => {
          const [p, h] = pair.split("=").map((x) => (x || "").trim());
          if (p && h) slaHours[p] = h;
        });
        categories.push({ name, problemTypes, slaHours });
      }
      await guard(() => send("/api/service/settings", "PATCH", { categories }), "Complaint categories saved");
    }
    async function editChecklist() {
      const raw = await askText(
        "One line per item:  Group | Item | answer | photo   (answer = passfail, yesno or rating; write photo to make a photo compulsory). Running inspections keep their old list.",
        (meta.checklist || []).map((c) => [c.group || "", c.item, c.answer || "passfail", c.photo ? "photo" : ""].join(" | ").replace(/ \| $/, "")).join("\n"),
        { title: "Inspection checklist", multiline: true, okLabel: "Save" }
      );
      if (raw == null) return;
      const checklist = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [group = "", item = "", answer = "passfail", photo = ""] = l.split("|").map((x) => x.trim());
          return { group, item, answer: answer || "passfail", photo: /^photo$/i.test(photo) };
        });
      await guard(() => send("/api/service/settings", "PATCH", { checklist }), "Inspection checklist saved");
    }
    async function editSla() {
      const raw = await askText("SLA hours per priority: " + meta.priorities.map(pl).join(", "), meta.priorities.map((p) => meta.slaHours[p]).join(", "), { title: "SLA hours", okLabel: "Save" });
      if (raw == null) return;
      const vals = raw.split(",").map((x) => x.trim());
      const body = {};
      meta.priorities.forEach((p, i) => vals[i] && (body[p] = vals[i]));
      await guard(() => send("/api/service/sla", "PATCH", body), "SLA hours saved");
    }
    const mat = s.mailAutoTicket || {};
    const saveMat = (patch) => guard(() => send("/api/service/settings", "PATCH", { mailAutoTicket: { ...mat, ...patch } }), "Auto-ticket from mail saved");
    const toggle = (k, label) => (
      <label className="check">
        <input type="checkbox" checked={!!s[k]} onChange={(e) => guard(() => send("/api/service/settings", "PATCH", { [k]: e.target.checked }), label + (e.target.checked ? " on" : " off"))} /> {label}
      </label>
    );
    return (
      <Modal open={showSettings} size="md" title="Complaint settings (Admin)" onClose={() => setShowSettings(false)}>
        <div className="section">
          <h4>Behaviour</h4>
          {toggle("autoEscalate", "Auto-escalate overdue tickets")}
          {toggle("verifyBeforeClose", "Verify resolution before close")}
          {toggle("autoTask", "Create a task when a ticket gets an owner")}
        </div>
        <div className="section">
          <h4>Auto-ticket from mail</h4>
          <p className="muted small">
            Mail arriving by webhook / IMAP that matches no ticket is raised as a ticket by the service-desk robot when it names one ATM ID (or the sender has only one ATM). The problem type is taken from the mail when it names one, else the default below. An open ticket for the same ATM and problem gets the mail instead. No-reply senders, automatic replies and more than 5 mails per sender a day are left for the desk.
          </p>
          <label className="check">
            <input type="checkbox" checked={!!mat.enabled} onChange={(e) => saveMat({ enabled: e.target.checked })} /> Create tickets from unmapped mail
          </label>
          <div className="grid2">
            <label>
              Default problem type
              <select value={mat.problemType || ""} onChange={(e) => saveMat({ problemType: e.target.value })}>
                <option value="">None (skip if the mail names none)</option>
                {(meta.problemTypes || []).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={mat.priority || "Medium"} onChange={(e) => saveMat({ priority: e.target.value })}>
                {meta.priorities.map((p) => (
                  <option key={p} value={p}>{pl(p)}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="section">
          <h4>
            SLA hours{" "}
            <button className="btn ghost" type="button" onClick={editSla}>
              ✎ Edit
            </button>
          </h4>
          <div className="chips">
            {meta.priorities.map((p) => (
              <span key={p} className={"badge " + (PRIORITY_TONE[p] || "")}>
                {pl(p)} {meta.slaHours[p]} h
              </span>
            ))}
          </div>
        </div>
        <div className="section">
          <h4>
            Categories and problem types{" "}
            <button className="btn ghost" type="button" onClick={editCategories}>
              ✎ Edit
            </button>
          </h4>
          <table>
            <tbody>
              {(meta.categories || []).map((c) => (
                <tr key={c.name}>
                  <td className="nowrap">
                    <strong>{c.name}</strong>
                  </td>
                  <td>{(c.problemTypes || []).join(", ")}</td>
                  <td className="meta">
                    {Object.entries(c.slaHours || {}).length
                      ? Object.entries(c.slaHours)
                          .map(([p, h]) => p + " " + h + "h")
                          .join(" · ")
                      : "priority SLA"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="section">
          <h4>
            Inspection checklist{" "}
            <button className="btn ghost" type="button" onClick={editChecklist}>
              ✎ Edit
            </button>
          </h4>
          <p className="meta">
            {(meta.checklist || []).length} items in {new Set((meta.checklist || []).map((c) => c.group || "—")).size} groups · {(meta.checklist || []).filter((c) => c.photo).length} need a photo ·{" "}
            {[...new Set((meta.checklist || []).map((c) => c.answer || "passfail"))].join(", ")}
          </p>
        </div>
        <div className="section">
          <h4>
            Auto-escalation hours{" "}
            <button className="btn ghost" type="button" onClick={editHours}>
              ✎ Edit
            </button>
          </h4>
          <div className="chips">
            {["SSM", "RM", "Management"].map((k) => (
              <span key={k} className="badge warn">
                {k} after {s.autoEscalateHours[k]} h
              </span>
            ))}
          </div>
        </div>
        <div className="section">
          <h4>
            SSM / RM by ATM region{" "}
            <button className="btn ghost" type="button" onClick={editMap}>
              ✎ Edit
            </button>
          </h4>
          {map.length ? (
            <div className="chips">
              {map.map(([k, v]) => (
                <span key={k} className="badge info">
                  {k} → {v.ssm || "—"} / {v.rm || "—"}
                </span>
              ))}
            </div>
          ) : (
            <span className="meta">none</span>
          )}
        </div>
      </Modal>
    );
  }

  function detailModal() {
    if (!c) return null;
    const done = ["Resolved", "Closed"].includes(c.status);
    const tabsList = [["overview", "Overview"], ...(meta.canAssign && c.status !== "Closed" ? [["assign", "Assign & route"]] : []), ...(desk && c.status !== "Closed" ? [["status", "Details & status"]] : []), ["visits", "Visits", detail.visits.length], ["mail", "Mail"], ["history", "History", (c.history || []).length]];
    return (
      <Modal
        open={!!c}
        size="xl"
        title={"Docket " + c.docketNumber}
        subtitle={
          <span className="chips">
            <StatusBadge value={c.status} />
            <StatusBadge value={pl(c.priority)} tone={PRIORITY_TONE[c.priority]} />
            <span>
              ATM {c.atmId} · {c.city} · {c.franchiseName} · {c.problemType} · via {c.channel}
            </span>
          </span>
        }
        onClose={() => setOpenId("")}
      >
        <div key={c._id}>
          <Tabs tabs={tabsList} value={detailTab} onChange={setDetailTab} />
          {detailTab === "overview" ? (
            <>
              <div className="section">
                <p>
                  <strong>{c.subject}</strong> — {c.description}
                </p>
                <p className="meta">
                  Raised {when(c.createdAt)} by {c.complainantName} {c.complainantMobile}
                  {c.ssm || c.rm ? " · " + (c.region ? "Region " + c.region + " · " : "") + "SSM " + (c.ssm || "—") + " · RM " + (c.rm || "—") : ""}
                </p>
                {c.resolution ? <p className="ok">Resolution: {c.resolution}</p> : null}
                {c.verifiedAt ? (
                  <p className="ok">
                    Resolution verified by {c.verifiedByName} on {when(c.verifiedAt)}
                  </p>
                ) : c.status === "Resolved" && meta.settings && meta.settings.verifyBeforeClose ? (
                  <p className="meta">Company setting: the desk must verify the resolution (not the person who resolved it) before closing.</p>
                ) : null}
                {c.closureRemarks ? <p className="ok">Closure: {c.closureRemarks}</p> : null}
              </div>
              <div className="section">
                <h4>Who is handling it</h4>
                <p>
                  Ticket owner: <strong>{c.ownerName || "not assigned yet"}</strong>
                  {c.ownerNumber ? " · " + c.ownerNumber : ""}
                  {detail.atmSalesOfficer ? " · Sales Officer for this ATM: " + detail.atmSalesOfficer : ""}
                </p>
                {(detail.officers || []).length ? (
                  <p>
                    Field officer:{" "}
                    {detail.officers.map((o, i) => (
                      <span key={o._id}>
                        {i ? ", " : ""}
                        <strong>{o.name}</strong> ({humanize(o.functionalRole || "Officer")}){o.mobile ? " · " + o.mobile : ""}
                      </span>
                    ))}
                  </p>
                ) : null}
                {(() => {
                  const upcoming = detail.visits.filter((v) => ["Scheduled", "Rescheduled", "CheckedIn"].includes(v.status)).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
                  const last = detail.visits.find((v) => v.status === "Submitted");
                  if (!upcoming.length && !last) return <p className="meta">No site visit scheduled yet.</p>;
                  return (
                    <>
                      {upcoming.map((v) => (
                        <p key={v._id}>
                          <StatusBadge value={v.status} /> Visit by {v.officerName} on <strong>{when(v.scheduledAt)}</strong>
                          {v.checkInAt ? " · checked in " + when(v.checkInAt) : ""}
                        </p>
                      ))}
                      {last ? (
                        <p className="meta">
                          Last visit completed {when(last.checkOutAt || last.scheduledAt)} by {last.officerName}
                          {last.outcome ? " · " + last.outcome : ""}
                        </p>
                      ) : null}
                    </>
                  );
                })()}
              </div>
              <div className="section">
                <h4>Photos</h4>
                <div className="actions-cell">
                  <Files files={detail.files} onDownload={download} onPlay={play} />
                  {c.status !== "Closed" ? (
                    <>
                      <PhotoUpload onChange={(e) => upload(e, "complaint", c._id, "Complaint photo")} />
                      <VideoUpload onChange={(e) => upload(e, "complaint", c._id, "Complaint video")} />
                    </>
                  ) : null}
                </div>
              </div>
              <div className="section">
                <h4>Remark and actions</h4>
                <label>
                  Remark
                  <input value={act.remark || ""} onChange={(e) => setAct({ ...act, remark: e.target.value })} />
                </label>
                <div className="actions-cell" style={{ marginTop: 8 }}>
                  <button className="btn ghost" type="button" onClick={() => patchC({ action: "remark", remark: act.remark }, "Remark added").then(() => setAct({}))}>
                    + Add remark
                  </button>
                  {c.status === "Resolved" && desk && !c.verifiedAt && String(c.resolvedBy || "") !== String(user.id) ? (
                    <button className="btn info" type="button" onClick={() => patchC({ action: "verify", remark: act.remark }, "Resolution verified").then(() => setAct({}))}>
                      ✓ Verify resolution (remark = how confirmed)
                    </button>
                  ) : null}
                  {c.status === "Resolved" && meta.canClose && (franchiseUser || c.verifiedAt || !(meta.settings && meta.settings.verifyBeforeClose)) ? (
                    <button className="btn good" type="button" onClick={() => patchC({ action: "status", status: "Closed", closureRemarks: act.remark }, "Ticket closed")}>
                      Confirm and close (remark = closure)
                    </button>
                  ) : null}
                  {done && (desk || franchiseUser) ? (
                    <button className="btn warn" type="button" onClick={() => patchC({ action: "status", status: "Reopened", remark: act.remark }, "Ticket reopened")}>
                      ↺ Reopen (remark = reason)
                    </button>
                  ) : null}
                  {desk && !done ? (
                    <button className="btn bad" type="button" onClick={() => patchC({ action: "escalate", remark: act.remark }, "Escalated")}>
                      ⇪ Escalate (SSM → RM → Management)
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {detailTab === "assign" ? (
            <>
              <div className="grid2">
                {["ownerName", "ownerNumber", "forwardedTo", "ssm", "rm", "reportingAuthority"].map((k) => (
                  <label key={k}>
                    {humanize(k)}
                    <input defaultValue={c[k] || ""} onChange={(e) => setAct({ ...act, [k]: e.target.value })} />
                  </label>
                ))}
                <label>
                  Priority
                  <select defaultValue={c.priority} onChange={(e) => setAct({ ...act, priority: e.target.value })}>
                    {meta.priorities.map((p) => (
                      <option key={p} value={p}>{pl(p)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Reminder
                  <input type="datetime-local" onChange={(e) => setAct({ ...act, reminderAt: e.target.value })} />
                </label>
                {owners.length ? (
                  <label>
                    Owner (CRM login; creates a linked task)
                    <select value={act.ownerUserId || ""} onChange={(e) => setAct({ ...act, ownerUserId: e.target.value })}>
                      <option value="">—</option>
                      {owners.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} · {u.login}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              <button className="btn primary" type="button" disabled={busy} onClick={() => patchC({ action: "assign", ...act }, "Assigned").then(() => setAct({}))}>
                Save assignment
              </button>
              {!done ? (
                <div className="section" style={{ marginTop: 12 }}>
                  <h4>Sales Officer visit</h4>
                  <div className="grid2">
                    <label>
                      Sales Officer
                      <select value={act.officerId || ""} onChange={(e) => setAct({ ...act, officerId: e.target.value })}>
                        <option value="">—</option>
                        {officers
                          .filter((o) => o.functionalRole === "SalesOfficer")
                          .map((o) => (
                            <option key={o._id} value={o._id}>
                              {o.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Visit date / time
                      <input type="datetime-local" value={act.scheduledAt || ""} onChange={(e) => setAct({ ...act, scheduledAt: e.target.value })} />
                    </label>
                  </div>
                  <button
                    className="btn info"
                    type="button"
                    disabled={busy || !act.officerId || !act.scheduledAt}
                    onClick={() => guard(() => send("/api/complaints/" + c._id + "/visits", "POST", { officerId: act.officerId, scheduledAt: act.scheduledAt }), "Visit scheduled").then(() => setAct({}))}
                  >
                    Schedule visit
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {detailTab === "status" ? (
            <>
              <div className="section">
                <h4>Ticket details</h4>
                <p className="meta">
                  Category {c.category || c.problemType} · Team {c.team || "—"} · FLM {c.flmDone ? "done" + (c.flmDoneAt ? " " + when(c.flmDoneAt) : "") : "not done"} · Forwarded {c.forwardedTo || "—"}
                  {c.forwardedOn ? " on " + when(c.forwardedOn) : ""} · Outcome {c.outcome || "—"}
                  {c.externalEngineerName || c.externalEngineerNumber ? " · Engineer " + [c.externalEngineerName, c.externalEngineerNumber].filter(Boolean).join(" ") : ""}
                  {c.slaCompliant === true ? " · SLA met" : c.slaCompliant === false ? " · SLA missed" : ""}
                </p>
                <div className="grid2">
                  <label>
                    Category
                    <select value={act.category || ""} onChange={(e) => setAct({ ...act, category: e.target.value })}>
                      <option value="">(unchanged)</option>
                      {(meta.categories || []).map((cat) => (
                        <option key={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Team
                    <select value={act.team === undefined ? "" : act.team} onChange={(e) => setAct({ ...act, team: e.target.value })}>
                      <option value="">(unchanged)</option>
                      {(meta.teams || []).map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Forwarded on
                    <input type="datetime-local" onChange={(e) => setAct({ ...act, forwardedOn: e.target.value })} />
                  </label>
                  <label>
                    Outcome
                    <input defaultValue={c.outcome || ""} onChange={(e) => setAct({ ...act, outcome: e.target.value })} />
                  </label>
                  <label>
                    External engineer name
                    <input defaultValue={c.externalEngineerName || ""} onChange={(e) => setAct({ ...act, externalEngineerName: e.target.value })} />
                  </label>
                  <label>
                    External engineer number
                    <input defaultValue={c.externalEngineerNumber || ""} inputMode="tel" onChange={(e) => setAct({ ...act, externalEngineerNumber: e.target.value })} />
                  </label>
                  <label className="check">
                    <input type="checkbox" defaultChecked={!!c.flmDone} onChange={(e) => setAct({ ...act, flmDone: e.target.checked })} /> FLM done
                  </label>
                </div>
                <button
                  className="btn primary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const body = { action: "details" };
                    ["category", "team", "forwardedOn", "outcome", "flmDone"].forEach((k) => act[k] !== undefined && act[k] !== "" && (body[k] = act[k]));
                    ["externalEngineerName", "externalEngineerNumber"].forEach((k) => act[k] !== undefined && (body[k] = act[k]));
                    patchC(body, "Ticket details saved").then(() => setAct({}));
                  }}
                >
                  Save details
                </button>
              </div>
              <div className="section">
                <h4>Status</h4>
                <div className="grid2">
                  <label>
                    New status
                    <select value={act.status || ""} onChange={(e) => setAct({ ...act, status: e.target.value })}>
                      <option value="">—</option>
                      {meta.statuses
                        .filter((s) => !["Closed", "Reopened"].includes(s))
                        .map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Resolution details (for Resolved)
                    <input value={act.resolution || ""} onChange={(e) => setAct({ ...act, resolution: e.target.value })} />
                  </label>
                  <label className="span-all">
                    Remark
                    <input value={act.remark || ""} onChange={(e) => setAct({ ...act, remark: e.target.value })} />
                  </label>
                </div>
                <button
                  className="btn primary"
                  type="button"
                  disabled={busy || !act.status}
                  onClick={() => patchC({ action: "status", status: act.status, resolution: act.resolution, remark: act.remark }, "Status changed").then(() => setAct({}))}
                >
                  Change status
                </button>
              </div>
            </>
          ) : null}

          {detailTab === "visits" ? (
            <table>
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Status</th>
                  <th>Scheduled</th>
                  <th>Check-in / out</th>
                  <th>Findings</th>
                  <th>Outcome</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {detail.visits.map((v) => (
                  <tr key={v._id}>
                    <td>{v.officerName}</td>
                    <td>
                      <StatusBadge value={v.status} />
                    </td>
                    <td>{when(v.scheduledAt)}</td>
                    <td>
                      {when(v.checkInAt) || "—"} / {when(v.checkOutAt) || "—"}
                    </td>
                    <td>
                      {v.findings}
                      {v.problemIdentified || v.actionTaken ? <div className="meta">{[v.problemIdentified && "Problem: " + v.problemIdentified, v.actionTaken && "Action: " + v.actionTaken].filter(Boolean).join(" · ")}</div> : null}
                      {v.spareRequired || v.spareUsed ? <div className="meta">{[v.spareRequired && "Spare needed: " + v.spareRequired, v.spareUsed && "Spare used: " + v.spareUsed].filter(Boolean).join(" · ")}</div> : null}
                    </td>
                    <td>
                      {v.outcome ? <StatusBadge value={v.outcome} /> : ""}
                      {v.siteStatus ? <StatusBadge value={v.siteStatus} tone={v.siteStatus === "Working" ? "good" : v.siteStatus === "Down" ? "bad" : "warn"} /> : null}
                    </td>
                    <td>
                      {desk && ["Scheduled", "Rescheduled"].includes(v.status) ? (
                        <div className="actions-cell">
                          <button className="btn ghost" type="button" onClick={() => setResched({ id: v._id, at: "", reason: "" })}>
                            Reschedule
                          </button>
                          <button
                            className="btn bad"
                            type="button"
                            onClick={async () => {
                              const reason = await askText("Reason for cancelling", "", { title: "Cancel visit", required: true, danger: true, okLabel: "Cancel visit" });
                              if (reason) guard(() => send("/api/visits/" + v._id, "PATCH", { action: "cancel", reason }), "Visit cancelled");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!detail.visits.length ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      No visits on this ticket.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {detailTab === "mail" ? <TicketMail user={user} ticket={c} ticketFiles={detail.files} onChange={load} setError={setError} setNotice={setNotice} /> : null}

          {detailTab === "history" ? (
            <ul className="timeline">
              {(c.history || []).map((h, i) => (
                <li key={i}>
                  <span className="meta">{when(h.at)}</span> · <strong>{h.byName}</strong> · {h.action}
                  {h.from || h.to ? (
                    <>
                      {" "}
                      <StatusBadge value={h.from || "—"} /> → <StatusBadge value={h.to || "—"} />
                    </>
                  ) : null}
                  {h.remark ? <div className="meta">{h.remark}</div> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Modal>
    );
  }

  /* ---------- visits ---------- */

  function renderVisits() {
    return (
      <>
        {visits.length ? null : <div className="card empty">No visits.</div>}
        {visits.map((v) => {
          const mine = String(v.officerId) === String(user.id);
          const f = vf[v._id] || {};
          const setF = (k, val) => setVf({ ...vf, [v._id]: { ...f, [k]: val } });
          const live = !["Submitted", "Cancelled"].includes(v.status);
          const patchV = async (action, extra, ok) => {
            const gps = ["checkIn", "checkOut", "submit"].includes(action) ? await gpsNow() : {};
            const at = new Date().toISOString();
            const local = { checkIn: { checkInAt: at, status: "CheckedIn" }, checkOut: { ...extra, checkOutAt: at }, update: extra, submit: { ...extra, status: "Submitted" } }[action];
            return guard(() => sendField("/api/visits/" + v._id, "PATCH", { action, ...extra, ...gps }, "Visit " + humanize(action).toLowerCase() + " " + v.docketNumber), ok, () => markVisit(v._id, local || {}));
          };
          return (
            <div key={v._id} id={"row-" + v._id} className={"card" + (focusId === v._id ? " focus" : "")}>
              <h3>
                Docket {v.docketNumber} · ATM {v.atmId} <StatusBadge value={v.status} />
                {v.pendingSync ? <StatusBadge value="Waiting to send" tone="warn" /> : null}
                {v.complaint && v.complaint.overdue ? <StatusBadge value="Overdue" tone="bad" /> : null}
                {!field && v.complaintId ? (
                  <button className="btn ghost" type="button" onClick={() => openComplaint(v.complaintId)}>
                    Open ticket ›
                  </button>
                ) : null}
                {desk && ["Scheduled", "Rescheduled"].includes(v.status) ? (
                  <>
                    <button className="btn ghost" type="button" onClick={() => setResched({ id: v._id, at: "", reason: "" })}>
                      Reschedule
                    </button>
                    <button
                      className="btn warn"
                      type="button"
                      onClick={async () => {
                        const reason = await askText("Why cancel this visit?", "", { title: "Cancel visit " + v.docketNumber, required: true, multiline: true, okLabel: "Cancel visit" });
                        if (reason) guard(() => send("/api/visits/" + v._id, "PATCH", { action: "cancel", reason }), "Visit cancelled");
                      }}
                    >
                      Cancel visit
                    </button>
                  </>
                ) : null}
              </h3>
              <p className="meta">
                Scheduled {when(v.scheduledAt)}
                {v.complaint ? " · " + v.complaint.problemType + " · " + pl(v.complaint.priority) + " · " + v.complaint.subject + " · SLA due " + when(v.complaint.dueAt) : ""}
                <br />
                {v.address || (v.atm ? v.atm.city : "")} {v.atm && v.atm.mobile ? "· FR mobile " + v.atm.mobile : ""}
                {v.mapQuery ? (
                  <>
                    {" · "}
                    <a href={mapLink(v.mapQuery)} target="_blank" rel="noreferrer">
                      Navigate ↗
                    </a>
                  </>
                ) : null}
              </p>
              <div className="chips">
                <StatusBadge value={"Check-in " + (when(v.checkInAt) || "—")} tone={v.checkInAt ? "good" : "none"} />
                <StatusBadge value={"Check-out " + (when(v.checkOutAt) || "—")} tone={v.checkOutAt ? "good" : "none"} />
                <StatusBadge value={"ATM confirmed " + (v.atmConfirmed ? "Yes" : "No")} tone={v.atmConfirmed ? "good" : "warn"} />
                {v.outcome ? <StatusBadge value={"Outcome " + v.outcome} tone="info" /> : null}
              </div>
              {mine && live ? (
                <div style={{ marginTop: 10 }}>
                  {!v.checkInAt ? (
                    <button className="btn primary" type="button" onClick={() => patchV("checkIn", {}, "Checked in")}>
                      📍 Check in (GPS)
                    </button>
                  ) : (
                    <>
                      <div className="grid2">
                        <label>
                          ATM ID seen on site
                          <input value={f.atmIdSeen || ""} onChange={(e) => setF("atmIdSeen", e.target.value)} />
                        </label>
                        {[
                          ["problemIdentified", "Problem identified"],
                          ["actionTaken", "Action taken *"],
                          ["spareRequired", "Spare required"],
                          ["spareUsed", "Spare used"],
                          ["findings", "Findings (summary) *"],
                          ["remarks", "Remarks"],
                        ].map(([k, label]) => (
                          <label key={k}>
                            {label}
                            <input value={f[k] !== undefined ? f[k] : v[k] || ""} onChange={(e) => setF(k, e.target.value)} />
                          </label>
                        ))}
                        <label>
                          Site status *
                          <select value={f.siteStatus !== undefined ? f.siteStatus : v.siteStatus || ""} onChange={(e) => setF("siteStatus", e.target.value)}>
                            <option value="">—</option>
                            {(meta.siteStatuses || []).map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Outcome
                          <select value={f.outcome || ""} onChange={(e) => setF("outcome", e.target.value)}>
                            <option value="">—</option>
                            {meta.visitOutcomes.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="actions-cell" style={{ marginTop: 8 }}>
                        <PhotoUpload capture="environment" label="Before photo" onChange={(e) => upload(e, "visit", v._id, "Before photo")} />
                        <PhotoUpload capture="environment" label="After photo" onChange={(e) => upload(e, "visit", v._id, "After photo")} />
                        <VideoUpload label="Video" onChange={(e) => upload(e, "visit", v._id, "Visit video")} />
                        <button className="btn ghost" type="button" onClick={() => patchV("update", { atmConfirmed: !!f.atmIdSeen, atmIdSeen: f.atmIdSeen, ...visitFields(f) }, "Visit saved")}>
                          Save
                        </button>
                        {!v.checkOutAt ? (
                          <button className="btn info" type="button" onClick={() => patchV("checkOut", visitFields(f), "Checked out")}>
                            📍 Check out (GPS)
                          </button>
                        ) : null}
                        <button
                          className="btn good"
                          type="button"
                          onClick={() =>
                            patchV("submit", { atmConfirmed: v.atmConfirmed || !!f.atmIdSeen, atmIdSeen: f.atmIdSeen || v.atmId, ...visitFields(f), outcome: f.outcome }, "Visit submitted; ticket updated")
                          }
                        >
                          Submit visit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </>
    );
  }

  /* ---------- inspections ---------- */

  function renderInspections() {
    return (
      <div className="card">
        <div className="toolbar">
          <span className="meta">{field ? "My inspections" : "Bulk list: Daily ops → Imports → template \"inspection-list\" (Admin only)."}</span>
          <span className="spacer" />
          {meta.canAssign ? (
            <button className="btn primary" type="button" onClick={() => setInsp({ atmId: "", date: "", type: meta.inspectionTypes[0] || "Routine", officerId: "" })}>
              + Assign inspection
            </button>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>ATM</th>
              <th>Type</th>
              <th>Officer</th>
              <th>Status</th>
              <th>Result</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((x) => (
              <tr key={x._id} id={"row-" + x._id} className={(x.result === "Fail" ? "flag" : "") + (focusId === x._id ? " focus" : "")}>
                <td className="nowrap">{x.date}</td>
                <td>
                  <strong>{x.atmId}</strong>
                </td>
                <td>{x.type}</td>
                <td>{x.officerName}</td>
                <td>
                  <StatusBadge value={x.status} />
                  {x.rejectReason && x.status === "Assigned" ? <div className="err">Returned: {x.rejectReason}</div> : null}
                </td>
                <td>
                  {x.result ? <StatusBadge value={x.result} /> : ""}
                  {x.correctiveTaskNo ? <div className="meta">Corrective task {x.correctiveTaskNo}</div> : null}
                  {x.reinspectionId ? <div className="meta">Re-inspection scheduled</div> : null}
                  {x.reinspectionOf ? <div className="meta">Re-inspection of an earlier failure</div> : null}
                </td>
                <td>
                  <button className="btn ghost" type="button" onClick={() => setEdit({ _id: x._id, checklist: x.checklist.map((i) => ({ ...i })), remarks: x.remarks || "" })}>
                    Open ›
                  </button>
                </td>
              </tr>
            ))}
            {!inspections.length ? (
              <tr>
                <td colSpan={7} className="empty">
                  No inspections.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  function inspectionModal() {
    const x = edit._id ? inspections.find((i) => i._id === edit._id) : null;
    if (!x) return null;
    const mine = String(x.officerId) === String(user.id);
    const editable = (mine || admin) && x.status === "Assigned";
    const setItem = (i, k, v) => setEdit({ ...edit, checklist: edit.checklist.map((c2, j) => (j === i ? { ...c2, [k]: v } : c2)) });
    const act2 = async (action, extra, ok) => {
      const gps = ["checkIn", "submit"].includes(action) ? await gpsNow() : {};
      return guard(() => sendField("/api/inspections/" + x._id, "PATCH", { action, ...extra, ...gps }, "Inspection " + humanize(action).toLowerCase() + " " + x.atmId), ok, () => setInspections((list) => list.map((i) => (i._id === x._id ? { ...i, ...extra, pendingSync: true, ...(action === "submit" ? { status: "Submitted" } : {}) } : i))));
    };
    const canVerify = x.status === "Submitted" && !field && !mine && (meta.canVerifyInspection ?? canDecide(user));
    const failed = edit.checklist.filter(itemFailed).length;
    const passed = edit.checklist.filter((i) => i.result && i.result !== "NA" && !itemFailed(i)).length;
    const itemPhotos = (item) => (x.photos || []).filter((d) => d.type === "Item photo: " + item);
    return (
      <Modal
        open
        size="lg"
        title={"Inspection " + x.atmId + " · " + x.date}
        subtitle={
          <span className="chips">
            <StatusBadge value={x.status} />
            <StatusBadge value={x.type} tone="info" />
            <StatusBadge value={passed + " pass"} tone="good" />
            <StatusBadge value={failed + " fail"} tone={failed ? "bad" : "none"} />
          </span>
        }
        onClose={() => setEdit({})}
        footer={
          <>
            {editable && !x.checkInAt ? (
              <button className="btn primary" type="button" onClick={() => act2("checkIn", {}, "Checked in")}>
                📍 Check in (GPS)
              </button>
            ) : null}
            <span className="spacer" />
            {editable ? (
              <>
                <button className="btn ghost" type="button" disabled={busy} onClick={() => act2("save", { checklist: edit.checklist, remarks: edit.remarks }, "Saved")}>
                  Save
                </button>
                <button className="btn good" type="button" disabled={busy} onClick={() => act2("submit", { checklist: edit.checklist, remarks: edit.remarks }, "Inspection submitted")}>
                  Submit
                </button>
              </>
            ) : null}
            {canVerify ? (
              <>
                <button
                  className="btn warn"
                  type="button"
                  onClick={async () => {
                    const reason = await askText("Reason for returning to the officer", "", { title: "Return inspection", required: true, multiline: true, okLabel: "Return" });
                    if (reason) act2("reject", { reason }, "Returned to officer");
                  }}
                >
                  Return
                </button>
                <button className="btn good" type="button" onClick={() => act2("verify", {}, x.result === "Fail" ? "Inspection verified — corrective task and 7-day re-inspection created, franchise told" : "Inspection verified")}>
                  ✓ Verify
                </button>
              </>
            ) : null}
          </>
        }
      >
        <p className="meta">
          Check-in {when(x.checkInAt) || "—"} {x.gps ? "(GPS " + x.gps.lat + "," + x.gps.lng + ")" : ""} · Submitted {when(x.submittedAt) || "—"}
        </p>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Result</th>
              <th>Remark</th>
              <th>Photo</th>
            </tr>
          </thead>
          <tbody>
            {edit.checklist.map((i, idx) => (
              <Fragment key={i.item}>
                {i.group && (idx === 0 || edit.checklist[idx - 1].group !== i.group) ? (
                  <tr>
                    <td colSpan={4}>
                      <strong>{i.group}</strong>
                    </td>
                  </tr>
                ) : null}
                <tr className={itemFailed(i) ? "flag" : ""}>
                  <td>{i.item}</td>
                  <td>
                    <select value={i.result} disabled={!editable} onChange={(e) => setItem(idx, "result", e.target.value)}>
                      <option value="">—</option>
                      {(ANSWER_OPTIONS[i.answer || "passfail"] || ANSWER_OPTIONS.passfail).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input value={i.remark} disabled={!editable} placeholder={itemFailed(i) ? "required" : ""} onChange={(e) => setItem(idx, "remark", e.target.value)} />
                  </td>
                  <td>
                    <div className="actions-cell">
                      <Files files={itemPhotos(i.item)} onDownload={download} onPlay={play} />
                      {editable ? <PhotoUpload capture="environment" label={i.photo ? "Photo *" : "Photo"} onChange={(e) => upload(e, "inspection", x._id, "Item photo: " + i.item)} /> : i.photo && !itemPhotos(i.item).length ? <span className="meta">none</span> : null}
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
        <label>
          Remarks
          <input value={edit.remarks} disabled={!editable} onChange={(e) => setEdit({ ...edit, remarks: e.target.value })} />
        </label>
        <div className="section" style={{ marginTop: 10 }}>
          <h4>Photos</h4>
          <div className="actions-cell">
            <Files files={x.photos} onDownload={download} onPlay={play} />
            {editable ? (
              <>
                <PhotoUpload capture="environment" onChange={(e) => upload(e, "inspection", x._id, "Inspection photo")} />
                <VideoUpload onChange={(e) => upload(e, "inspection", x._id, "Inspection video")} />
              </>
            ) : null}
          </div>
        </div>
      </Modal>
    );
  }

  /* ---------- ATM history ---------- */

  async function loadHistory() {
    try {
      setHistory(await api("/api/service/atm-history/" + encodeURIComponent(historyAtm)));
    } catch (err) {
      setError(err.message);
    }
  }

  function renderHistory() {
    return (
      <>
        <div className="toolbar">
          <label className="inline">
            ATM ID
            <select value={historyAtm} onChange={(e) => setHistoryAtm(e.target.value)}>
              <option value="">—</option>
              {atms.map((a) => (
                <option key={a._id} value={a.atmId}>
                  {a.atmId} · {a.city}
                </option>
              ))}
            </select>
          </label>
          <button className="btn primary" type="button" disabled={!historyAtm} onClick={loadHistory}>
            Show history
          </button>
        </div>
        {history ? (
          <>
            <div className="kpis">
              <div className="kpi" style={{ "--k": "#2563eb" }}>
                <div className="l">
                  {history.atm.atmId} · {history.atm.city}
                </div>
                <div>Cash Live {history.atm.cashLiveDate ? new Date(history.atm.cashLiveDate).toLocaleDateString("en-IN") : "—"}</div>
              </div>
              <div className="kpi" style={{ "--k": "#e11d48" }}>
                <div className="l">Complaints</div>
                <div className="v">{history.complaints.length}</div>
              </div>
              <div className="kpi" style={{ "--k": "#d97706" }}>
                <div className="l">Visits</div>
                <div className="v">{history.visits.length}</div>
              </div>
              <div className="kpi" style={{ "--k": "#059669" }}>
                <div className="l">Inspections</div>
                <div className="v">{history.inspections.length}</div>
              </div>
            </div>
            <div className="card">
              <h3>Complaints</h3>
              <table>
                <tbody>
                  {history.complaints.map((x) => (
                    <tr key={x._id}>
                      <td>
                        <strong>{x.docketNumber}</strong>
                      </td>
                      <td>{x.problemType}</td>
                      <td>
                        <StatusBadge value={x.status} />
                      </td>
                      <td>{x.ageingDays}d</td>
                      <td className="meta">{when(x.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Visits</h3>
              <table>
                <tbody>
                  {history.visits.map((x) => (
                    <tr key={x._id}>
                      <td>
                        <strong>{x.docketNumber}</strong>
                      </td>
                      <td>{x.officerName}</td>
                      <td>
                        <StatusBadge value={x.status} />
                      </td>
                      <td>{x.outcome || ""}</td>
                      <td className="meta">{when(x.scheduledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Inspections</h3>
              <table>
                <tbody>
                  {history.inspections.map((x) => (
                    <tr key={x._id}>
                      <td>{x.date}</td>
                      <td>{x.type}</td>
                      <td>{x.officerName}</td>
                      <td>
                        <StatusBadge value={x.status} />
                      </td>
                      <td>{x.result ? <StatusBadge value={x.result} /> : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Tabs tabs={tabs.map((n) => [n, t(n)])} value={tab} onChange={setTab} />
      {tab === "My work" && renderBoard()}
      {tab === "Complaints" && renderComplaints()}
      {tab === "Complaints" && desk && !franchiseUser && list.complaints.length ? (
        <ExtraColumns register="complaint" rows={list.complaints} rowLabel={(x) => x.docketNumber + " · " + x.atmId} office={desk} admin={!!user.officeAdmin} setError={setError} setNotice={setNotice} onReload={load} />
      ) : null}
      {tab === "Visits" && renderVisits()}
      {tab === "Inspections" && renderInspections()}
      {tab === "ATM history" && renderHistory()}

      {raiseModal()}
      {admin ? settingsModal() : null}
      {detailModal()}
      {inspectionModal()}

      <Modal
        open={!!insp}
        title="Assign inspection"
        onClose={() => !busy && setInsp(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setInsp(null)}>
              Cancel
            </button>
            <button
              className="btn good"
              type="button"
              disabled={busy || !insp || !insp.atmId || !insp.date || !insp.officerId}
              onClick={async () => {
                if (await guard(() => send("/api/inspections", "POST", insp), "Inspection assigned")) setInsp(null);
              }}
            >
              Assign
            </button>
          </>
        }
      >
        {insp ? (
          <div className="grid2">
            <label>
              ATM ID
              <select value={insp.atmId} onChange={(e) => setInsp({ ...insp, atmId: e.target.value })}>
                <option value="">—</option>
                {atms.map((a) => (
                  <option key={a._id} value={a.atmId}>
                    {a.atmId} · {a.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input type="date" value={insp.date} onChange={(e) => setInsp({ ...insp, date: e.target.value })} />
            </label>
            <label>
              Type
              <select value={insp.type} onChange={(e) => setInsp({ ...insp, type: e.target.value })}>
                {meta.inspectionTypes.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Officer
              <select value={insp.officerId} onChange={(e) => setInsp({ ...insp, officerId: e.target.value })}>
                <option value="">—</option>
                {officers.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name} ({humanize(o.functionalRole)})
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!resched}
        size="sm"
        title="Reschedule visit"
        onClose={() => !busy && setResched(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setResched(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={busy || !resched || !resched.at || !resched.reason.trim()}
              onClick={async () => {
                if (await guard(() => send("/api/visits/" + resched.id, "PATCH", { action: "reschedule", scheduledAt: resched.at, reason: resched.reason }), "Visit rescheduled")) setResched(null);
              }}
            >
              Reschedule
            </button>
          </>
        }
      >
        {resched ? (
          <>
            <label>
              New date / time
              <input type="datetime-local" value={resched.at} onChange={(e) => setResched({ ...resched, at: e.target.value })} />
            </label>
            <label>
              Reason for reschedule
              <textarea value={resched.reason} onChange={(e) => setResched({ ...resched, reason: e.target.value })} />
            </label>
          </>
        ) : null}
      </Modal>
      <Modal
        open={!!playing}
        size="lg"
        title={playing ? playing.name : ""}
        onClose={() => {
          URL.revokeObjectURL(playing.url);
          setPlaying(null);
        }}
      >
        {playing ? <video src={playing.url} controls autoPlay style={{ width: "100%", maxHeight: "70vh" }} /> : null}
      </Modal>
    </>
  );
}
