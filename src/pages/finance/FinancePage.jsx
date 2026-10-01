import { useEffect, useRef, useState } from "react";
import { askText } from "../../components/common/Dialogs.jsx";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { StepNav, Steps } from "../../components/common/StepForm.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { takeFocus } from "../../utils/focus.js";
import { can } from "../../utils/perm.js";

const TABS = ["Desk", "Charge-back", "Security deposit", "Payments", "Bank statements", "TDS", "GST bills", "Payout accounts", "Payouts"];
const TAB_ICON = { Desk: "★", "Charge-back": "⇄", "Security deposit": "⛁", Payments: "₹", "Bank statements": "▤", TDS: "%", "GST bills": "🧾", "Payout accounts": "🏦", Payouts: "⇪" };
const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "");
const sum = (rows, k) => rows.reduce((s, r) => s + (Number(typeof k === "function" ? k(r) : r[k]) || 0), 0);
const countBy = (rows, k) => rows.reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {});
const fyOf = (month) => {
  const y = Number(month.slice(0, 4));
  const start = Number(month.slice(5, 7)) >= 4 ? y : y - 1;
  return start + "-" + String(start + 1).slice(2);
};
const moveClass = (s) => (/accept|approv|settl|paid|verif|check|complet|close|confirm/i.test(s) ? "btn good" : /reject|fail|cancel/i.test(s) ? "btn bad" : /hold|pending|query/i.test(s) ? "btn warn" : "btn info");

async function readFile(input) {
  const file = input && input.files && input.files[0];
  if (!file) return null;
  return { fileName: file.name, mime: file.type, data: await fileToB64(file) };
}

function Files({ files, onDownload }) {
  return (files || []).map((d) => (
    <button key={d._id} className="btn ghost sm" type="button" onClick={() => onDownload(d._id)}>
      📎 {d.type} v{d.version}
    </button>
  ));
}

function Pick({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
      </select>
    </label>
  );
}

function Text({ label, value, onChange, type }) {
  return (
    <label>
      {label}
      <input type={type || "text"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Kpis({ items }) {
  return (
    <div className="kpis">
      {items.map(([label, value, color]) => (
        <div key={label} className="kpi" style={{ "--k": color }}>
          <div className="l">{label}</div>
          <div className="v">{value}</div>
        </div>
      ))}
    </div>
  );
}

function EntryModal({ open, title, subtitle, steps, submitLabel = "Save", busy, onClose, onSubmit, children }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);
  const panels = steps ? children : [children];
  const last = !steps || step === steps.length - 1;
  const submit = (
    <button className="btn good" type="button" disabled={busy} onClick={onSubmit}>
      {busy ? "Saving…" : submitLabel}
    </button>
  );
  return (
    <Modal
      open={open}
      size={steps ? "lg" : "md"}
      title={title}
      subtitle={subtitle}
      onClose={() => !busy && onClose()}
      footer={
        steps ? (
          <StepNav current={step} total={steps.length} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)}>
            {last ? submit : null}
          </StepNav>
        ) : (
          <>
            <button className="btn ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            {submit}
          </>
        )
      }
    >
      {steps ? <Steps steps={steps} current={step} onPick={setStep} /> : null}
      {panels.map((p, i) => (
        <div key={i} hidden={i !== step}>
          {p}
        </div>
      ))}
    </Modal>
  );
}

export function FinancePage({ user, atms, franchises, setError, setNotice }) {
  const franchiseUser = ["Franchise", "MasterFranchise", "SuperMasterFranchise"].includes(user.hierarchy);
  const [tab, setTab] = useState("Desk");
  const [focusId, setFocusId] = useState("");
  const [gstPreview, setGstPreview] = useState(null);
  const nextOpen = useRef(null);
  const [meta, setMeta] = useState({ cbKinds: [], cbStatuses: [], payKinds: [], payTypes: [], settlementBanks: [], gstPendingAt: [], payoutNext: {}, cbNext: {}, quarters: [] });
  const [data, setData] = useState({});
  const [f, setF] = useState({});
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fy, setFy] = useState("");
  const [settle, setSettle] = useState(null);
  const [payoutView, setPayoutView] = useState("register");
  const [payoutPreview, setPayoutPreview] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [pnlRange, setPnlRange] = useState({});
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const canFinUpload = (meta.finance || franchiseUser) && can(user, "Create", "CRM-04");
  const frOptions = franchises.filter((x) => x.layer === "Franchise").map((x) => [x._id, x.name]);
  const atmOptions = atms.map((a) => [a.atmId, a.atmId + " · " + (a.city || "")]);

  const paths = {
    Desk: "/api/finance/desk",
    "Charge-back": "/api/finance/chargebacks",
    "Security deposit": "/api/finance/security-deposits",
    Payments: "/api/finance/payments",
    "Bank statements": "/api/finance/bank-statements" + (fy ? "?fy=" + fy : ""),
    TDS: "/api/finance/tds",
    "GST bills": "/api/finance/gst-bills",
    "Payout accounts": "/api/finance/payout-accounts",
    Payouts: "/api/finance/payouts",
  };

  const loadSeq = useRef(0);
  const gstKey = useRef("");
  async function load() {
    const seq = ++loadSeq.current;
    try {
      const m = await api("/api/finance/meta");
      const next = { [tab]: await api(paths[tab]) };
      if (tab === "Payments") next.sd = await api("/api/finance/security-deposits");
      if (seq !== loadSeq.current) return;
      setMeta(m);
      setData(next);
    } catch (err) {
      if (seq === loadSeq.current) setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const open = nextOpen.current;
    nextOpen.current = null;
    setF(open || {});
    setFormOpen(!!open);
    setGstPreview(null);
  }, [tab, fy]);

  function openOn(tabName, fields) {
    setGstPreview(null);
    if (tabName === tab) {
      setF(fields);
      setFormOpen(true);
    } else {
      nextOpen.current = fields;
      setTab(tabName);
    }
  }

  function goRow(tabName, id, rowFy) {
    setFocusId(id);
    if (rowFy) setFy(rowFy);
    setTab(tabName);
  }

  useEffect(() => {
    const link = takeFocus("finance");
    if (!link || !TABS.includes(link.type)) return;
    if (link.month) {
      nextOpen.current = { month: link.month };
      setFy(fyOf(link.month));
    }
    if (link.fy) setFy(link.fy);
    if (link.id) setFocusId(link.id);
    setTab(link.type);
  }, []);

  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      const el = document.getElementById("row-" + focusId);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 400);
    return () => clearTimeout(t);
  }, [focusId, data]);

  const rowProps = (r, cls) => ({ id: "row-" + r._id, className: [cls, focusId === r._id ? "focus" : ""].filter(Boolean).join(" ") || undefined });

  /* ---------- Desk ---------- */

  function desk() {
    const sections = (data.Desk && data.Desk.sections) || [];
    return (
      <div className="card">
        <div className="toolbar">
          <span className="meta">What needs your action in Finance right now</span>
          <span className="spacer" />
          <button className="btn ghost" type="button" onClick={load}>
            ↻ Refresh
          </button>
        </div>
        {!sections.length ? <p className="empty">Nothing waiting on you. 🎉</p> : null}
        <div className="grid2">
          {sections.map((s) => (
            <div key={s.key} className="section">
              <h4>
                {s.title} <StatusBadge value={String(s.count)} tone={s.tone} />
              </h4>
              <table>
                <tbody>
                  {s.rows.map((r, i) => (
                    <tr key={r.id || i}>
                      <td>
                        <strong>{r.label}</strong>
                        {r.sub ? <div className="meta">{r.sub}</div> : null}
                      </td>
                      <td className="nowrap">
                        {r.month ? (
                          <button className="btn primary sm" type="button" onClick={() => openOn("Bank statements", { month: r.month })}>
                            ⤒ Upload
                          </button>
                        ) : (
                          <button className="btn ghost sm" type="button" onClick={() => goRow(s.tab, r.id, r.fy)}>
                            Open ›
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.count > s.rows.length ? (
                <button className="btn ghost sm" type="button" onClick={() => setTab(s.tab)}>
                  +{s.count - s.rows.length} more in {s.tab} ›
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sending = useRef(false);
  async function send(path, method, body, ok) {
    if (sending.current) return null;
    sending.current = true;
    setBusy(true);
    try {
      const r = await api(path, { method, body: JSON.stringify(body || {}) });
      setNotice(typeof ok === "function" ? ok(r || {}) : ok);
      await load();
      return r || {};
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const submitForm = (promise) => promise.then((r) => r && (setFormOpen(false), setF({}), setGstPreview(null)));

  async function download(id) {
    try {
      const d = await api("/api/documents/" + id + "/file");
      downloadB64(d.fileName, d.mime, d.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function exportCsv(kind) {
    try {
      const r = await api("/api/finance/export?kind=" + kind);
      downloadB64(r.fileName, "text/csv", btoa(unescape(encodeURIComponent(r.csv))));
    } catch (err) {
      setError(err.message);
    }
  }

  const rows = (data[tab] && data[tab].rows) || [];

  function toolbar({ count, exportKind, newLabel, canNew, children }) {
    return (
      <div className="toolbar">
        <span className="meta">{count === undefined ? rows.length : count} records</span>
        {children}
        <span className="spacer" />
        {exportKind && meta.export ? (
          <button className="btn ghost" type="button" onClick={() => exportCsv(exportKind)}>
            ⤓ Export CSV
          </button>
        ) : null}
        {canNew ? (
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setF({});
              setGstPreview(null);
              setFormOpen(true);
            }}
          >
            {newLabel}
          </button>
        ) : null}
      </div>
    );
  }

  /* ---------- Charge-back ---------- */

  function chargeback() {
    const by = countBy(rows, "status");
    return (
      <>
        <Kpis
          items={[
            ["Open", by.Open || 0, "#e11d48"],
            ["Under review", by["Under Review"] || 0, "#d97706"],
            ["Accepted", by.Accepted || 0, "#059669"],
            ["Dispute amount", inr(sum(rows, "disputeAmount")), "#7c3aed"],
          ]}
        />
        <div className="card table-scroll">
          {toolbar({ exportKind: "chargebacks", newLabel: "+ Log failed TXN / charge-back", canNew: meta.chargeback })}
          <table>
            <thead>
              <tr>
                <th>Kind</th>
                <th>Complaint</th>
                <th>Subject</th>
                <th>FR contact / state</th>
                <th>ATM / site</th>
                <th>TXN</th>
                <th>Dispute</th>
                <th>Card</th>
                <th>RRN</th>
                <th>EJ</th>
                <th>Footage</th>
                <th>Pending since</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} {...rowProps(r)}>
                  <td>
                    <StatusBadge value={r.kind} tone="info" />
                  </td>
                  <td>
                    {r.complaintDate} {r.complainant}
                  </td>
                  <td>{r.complaintSubject || ""}</td>
                  <td>{[r.mobile, r.frEmail, r.state].filter(Boolean).join(" · ")}</td>
                  <td>
                    <strong>{r.atmId}</strong> · {r.site}
                  </td>
                  <td className="nowrap">
                    {r.txnDate} {r.txnTime} {inr(r.txnAmount)}
                  </td>
                  <td className="nowrap">
                    <strong>{inr(r.disputeAmount)}</strong>
                  </td>
                  <td>{r.cardMasked}</td>
                  <td>{r.tlfRrn}</td>
                  <td>{r.ejStatus}</td>
                  <td>{r.cameraFootageRequested ? <StatusBadge value="Requested" tone="warn" /> : ""}</td>
                  <td>{r.pendingSinceDays === null ? "" : <StatusBadge value={r.pendingSinceDays + " days"} tone={r.pendingSinceDays > 30 ? "bad" : r.pendingSinceDays > 7 ? "warn" : "none"} />}</td>
                  <td>
                    <StatusBadge value={r.status} />
                    {r.billedIn ? <div className="meta">🔒 deducted in a GST bill / payout</div> : null}
                  </td>
                  <td>
                    <div className="actions-cell">
                      {meta.finance
                        ? (meta.cbNext[r.status] || []).filter((s) => (r.billedIn ? s === "Closed" : s !== "Closed")).map((s) => (
                            <button
                              key={s}
                              className={moveClass(s)}
                              type="button"
                              onClick={async () => {
                                const remark = s === "Rejected" ? await askText("Reason for rejecting", "", { title: "Reject charge-back", required: true, danger: true, okLabel: "Reject" }) : "";
                                if (s !== "Rejected" || remark) send("/api/finance/chargebacks/" + r._id, "PATCH", { status: s, remark: remark || r.remark }, "Status " + s);
                              }}
                            >
                              {s}
                            </button>
                          ))
                        : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={14} className="empty">
                    No charge-backs.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p className="meta">Accepted charge-backs are deducted in the franchise's next GST bill. Card numbers are stored masked.</p>
        </div>
        <EntryModal
          open={formOpen}
          title="Log failed TXN / charge-back"
          steps={[
            { key: "txn", label: "Transaction", hint: "ATM, TXN, card" },
            { key: "who", label: "Complainant", hint: "Contact details" },
            { key: "ev", label: "Evidence", hint: "EJ, footage, remark" },
          ]}
          busy={busy}
          onClose={() => setFormOpen(false)}
          onSubmit={() => submitForm(send("/api/finance/chargebacks", "POST", f, "Logged"))}
        >
          {[
            <div className="grid2" key="a">
              <Pick label="Kind" value={f.kind} onChange={(v) => set("kind", v)} options={meta.cbKinds} />
              <Pick label="ATM" value={f.atmId} onChange={(v) => set("atmId", v)} options={atmOptions} />
              <Text label="TXN date" type="date" value={f.txnDate} onChange={(v) => set("txnDate", v)} />
              <Text label="TXN time" type="time" value={f.txnTime} onChange={(v) => set("txnTime", v)} />
              <Text label="TXN amount" type="number" value={f.txnAmount} onChange={(v) => set("txnAmount", v)} />
              <Text label="Dispute amount" type="number" value={f.disputeAmount} onChange={(v) => set("disputeAmount", v)} />
              <Text label="Card number (stored masked)" value={f.cardNumber} onChange={(v) => set("cardNumber", v)} />
              <Text label="TLF / RRN" value={f.tlfRrn} onChange={(v) => set("tlfRrn", v)} />
            </div>,
            <div className="grid2" key="b">
              <Text label="Complaint date" type="date" value={f.complaintDate} onChange={(v) => set("complaintDate", v)} />
              <Text label="Complainant" value={f.complainant} onChange={(v) => set("complainant", v)} />
              <Text label="Mobile" value={f.mobile} onChange={(v) => set("mobile", v)} />
              <Text label="FR email" value={f.frEmail} onChange={(v) => set("frEmail", v)} />
              <Text label="State" value={f.state} onChange={(v) => set("state", v)} />
              <Text label="Complaint subject" value={f.complaintSubject} onChange={(v) => set("complaintSubject", v)} />
            </div>,
            <div className="grid2" key="c">
              <Text label="EJ status" value={f.ejStatus} onChange={(v) => set("ejStatus", v)} />
              <Text label="Remark" value={f.remark} onChange={(v) => set("remark", v)} />
              <label className="check">
                <input type="checkbox" checked={!!f.cameraFootageRequested} onChange={(e) => set("cameraFootageRequested", e.target.checked)} /> Camera footage requested
              </label>
            </div>,
          ]}
        </EntryModal>
      </>
    );
  }

  /* ---------- Security deposit ---------- */

  function securityDeposit() {
    const heldOf = (r) => (r.held === undefined ? r.received || 0 : r.held);
    return (
      <>
        <Kpis
          items={[
            ["Due", inr(sum(rows, "amountDue")), "#2563eb"],
            ["Received", inr(sum(rows, "received")), "#059669"],
            ["Balance", inr(sum(rows, "balance")), "#e11d48"],
            ["Held", inr(sum(rows, heldOf)), "#d97706"],
          ]}
        />
        <div className="card table-scroll">
          {toolbar({ exportKind: "security-deposits", newLabel: "+ Security deposit due", canNew: meta.finance })}
          <table>
            <thead>
              <tr>
                <th>Franchise</th>
                <th>Label</th>
                <th>Site / ATM / project</th>
                <th>Cash live</th>
                <th>HPY account / holder</th>
                <th>Due</th>
                <th>Received (settled)</th>
                <th>Balance</th>
                <th>Refunded / adjusted</th>
                <th>Held</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const held = heldOf(r);
                return (
                  <tr key={r._id} {...rowProps(r)}>
                    <td>
                      <strong>{r.franchiseName}</strong>
                      {r.franchiseeNo ? <div className="meta">No. {r.franchiseeNo}</div> : null}
                    </td>
                    <td>{r.label}</td>
                    <td>{[r.siteId, r.atmId, r.projectCode].filter(Boolean).join(" · ")}</td>
                    <td>{r.cashLiveDate ? day(r.cashLiveDate) : ""}</td>
                    <td>{[r.hpyAccount, r.accountHolder].filter(Boolean).join(" · ")}</td>
                    <td className="nowrap">{inr(r.amountDue)}</td>
                    <td className="nowrap ok">{inr(r.received)}</td>
                    <td className={"nowrap" + (r.balance > 0 ? " err" : "")}>{inr(r.balance)}</td>
                    <td>
                      {inr((r.refunded || 0) + (r.adjusted || 0))}
                      {(r.movements || []).map((m, i) => (
                        <div key={i} className="meta">
                          {m.action === "refund" ? "Refund UTR " + m.utr : "Adjusted vs " + m.against} · {inr(m.amount)} · {m.reason}
                        </div>
                      ))}
                    </td>
                    <td className="nowrap">
                      <strong>{inr(held)}</strong>
                    </td>
                    <td>
                      <StatusBadge value={r.status} />
                    </td>
                    <td>
                      {meta.finance && held > 0 ? (
                        <div className="actions-cell">
                          <button className="btn info" type="button" onClick={() => setSettle({ id: r._id, name: r.franchiseName + " · " + r.label, held, action: "refund", amount: "", reason: "", utr: "", against: "" })}>
                            Refund
                          </button>
                          <button className="btn warn" type="button" onClick={() => setSettle({ id: r._id, name: r.franchiseName + " · " + r.label, held, action: "adjust", amount: "", reason: "", utr: "", against: "" })}>
                            Adjust
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={12} className="empty">
                    No security deposits.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p className="meta">Status follows settled SD payments: Pending → Partially Received → Received. Finance can refund (with UTR) or adjust (against charge-back, shortage, payout or other dues) any amount still held; every move is audited.</p>
        </div>
        <EntryModal
          open={formOpen}
          title="Security deposit due"
          steps={[
            { key: "fr", label: "Franchise & amount" },
            { key: "acct", label: "Site & account" },
          ]}
          submitLabel="Create"
          busy={busy}
          onClose={() => setFormOpen(false)}
          onSubmit={() => submitForm(send("/api/finance/security-deposits", "POST", f, "Security deposit created"))}
        >
          {[
            <div className="grid2" key="a">
              <Pick label="Franchise" value={f.franchiseId} onChange={(v) => set("franchiseId", v)} options={frOptions} />
              <Text label="Label" value={f.label} onChange={(v) => set("label", v)} />
              <Text label="Amount due" type="number" value={f.amountDue} onChange={(v) => set("amountDue", v)} />
              <Text label="Franchisee no." value={f.franchiseeNo} onChange={(v) => set("franchiseeNo", v)} />
              <Text label="Remark" value={f.remark} onChange={(v) => set("remark", v)} />
            </div>,
            <div className="grid2" key="b">
              <Pick label="ATM (cash live date comes from ATM master)" value={f.atmId} onChange={(v) => set("atmId", v)} options={atmOptions} />
              <Text label="Site ID" value={f.siteId} onChange={(v) => set("siteId", v)} />
              <Text label="Project code" value={f.projectCode} onChange={(v) => set("projectCode", v)} />
              <Text label="HPY account" value={f.hpyAccount} onChange={(v) => set("hpyAccount", v)} />
              <Text label="Account holder" value={f.accountHolder} onChange={(v) => set("accountHolder", v)} />
            </div>,
          ]}
        </EntryModal>
        <Modal
          open={!!settle}
          size="sm"
          title={settle ? (settle.action === "refund" ? "Refund deposit" : "Adjust deposit") : ""}
          subtitle={settle ? settle.name + " · held " + inr(settle.held) : ""}
          onClose={() => !busy && setSettle(null)}
          footer={
            <>
              <button className="btn ghost" type="button" onClick={() => setSettle(null)}>
                Cancel
              </button>
              <button
                className="btn good"
                type="button"
                disabled={busy || !settle || !settle.amount || !settle.reason.trim()}
                onClick={async () => {
                  const { id, action, amount, reason, utr, against } = settle;
                  const extra = action === "refund" ? { utr } : { against };
                  const r = await send("/api/finance/security-deposits/" + id + "/settle", "POST", { action, amount, reason, ...extra }, "Deposit " + (action === "refund" ? "refunded" : "adjusted"));
                  if (r) setSettle(null);
                }}
              >
                {settle && settle.action === "refund" ? "Refund" : "Adjust"}
              </button>
            </>
          }
        >
          {settle ? (
            <>
              <Text label={"Amount (max " + inr(settle.held) + ")"} type="number" value={settle.amount} onChange={(v) => setSettle({ ...settle, amount: v })} />
              {settle.action === "refund" ? (
                <Text label="Refund UTR" value={settle.utr} onChange={(v) => setSettle({ ...settle, utr: v })} />
              ) : (
                <Pick label="Adjust against" value={settle.against} onChange={(v) => setSettle({ ...settle, against: v })} options={meta.sdAdjustAgainst || []} />
              )}
              <label>
                Reason
                <textarea value={settle.reason} onChange={(e) => setSettle({ ...settle, reason: e.target.value })} />
              </label>
            </>
          ) : null}
        </Modal>
      </>
    );
  }

  /* ---------- Payments ---------- */

  function payments() {
    const sds = ((data.sd && data.sd.rows) || []).filter((s) => s.balance > 0);
    const by = countBy(rows, "status");
    const valid = (r) => r.status !== "Rejected";
    const sdBank = (s) => {
      const last = s && rows.find((r) => r.kind === "SD" && valid(r) && String(r.franchiseId) === String(s.franchiseId));
      return { type: last ? last.type : "", bank: last ? last.bank : "", account: last ? last.account : "", ifsc: last ? last.ifsc : "", accountHolder: (last && last.accountHolder) || s.accountHolder || "" };
    };
    const clfFill = (atmId) => {
      const same = rows.filter((r) => r.kind === "CLF" && r.atmId === atmId && valid(r));
      const last = same[0];
      const lastInst = same.reduce((m, r) => Math.max(m, Number(r.installment) || 0), 0);
      return { atmId, bank: last ? last.bank : "", accountHolder: last ? last.accountHolder : "", hpyAccount: last ? last.hpyAccount : "", settlementBank: last ? last.settlementBank : "", installment: atmId && lastInst < 10 ? String(lastInst + 1) : "" };
    };
    function pickKind(kind) {
      setF((x) => {
        const keepCommon = { amount: x.amount, paidAt: x.paidAt, txnNumber: x.txnNumber };
        if (kind === "SD") {
          const s = sds.length === 1 ? sds[0] : null;
          return { kind, ...keepCommon, ...(s ? { securityDepositId: s._id, amount: x.amount || s.balance, ...sdBank(s) } : {}) };
        }
        if (kind === "CLF") return { kind, ...keepCommon, ...clfFill(atms.length === 1 ? atms[0].atmId : "") };
        return { kind, ...keepCommon };
      });
    }
    function pickSd(id) {
      const s = sds.find((x) => x._id === id);
      setF((x) => ({ ...x, securityDepositId: id, ...(s ? { amount: s.balance, ...sdBank(s) } : {}) }));
    }
    const pickClfAtm = (atmId) => setF((x) => ({ ...x, ...clfFill(atmId) }));
    return (
      <>
        <Kpis
          items={[
            ["Submitted", by.Submitted || 0, "#d97706"],
            ["Approved", by.Approved || 0, "#2563eb"],
            ["Settled", by.Settled || 0, "#059669"],
            ["Rejected", by.Rejected || 0, "#e11d48"],
          ]}
        />
        <div className="card">
          {toolbar({ exportKind: "payments", newLabel: "+ Record payment", canNew: canFinUpload })}
          <table>
            <thead>
              <tr>
                <th>Kind</th>
                <th>Franchise / ATM</th>
                <th>Amount</th>
                <th>Mode / bank</th>
                <th>UTR</th>
                <th>Paid at</th>
                <th>Proof</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} {...rowProps(r)}>
                  <td>
                    <StatusBadge value={r.kind} tone={r.kind === "SD" ? "info" : "warn"} />
                  </td>
                  <td>
                    <strong>{r.franchiseName}</strong> {r.atmId || ""}
                  </td>
                  <td className="nowrap">
                    <strong>{inr(r.amount)}</strong>
                  </td>
                  <td>
                    {r.kind === "SD" ? r.type + " · " + r.bank + " · " + r.ifsc : [r.installment ? "Inst. " + r.installment : "", r.bank, r.settlementBank, r.hpyAccount].filter(Boolean).join(" · ")}
                    {r.accountHolder ? <div className="meta">{r.accountHolder}</div> : null}
                  </td>
                  <td>{r.txnNumber}</td>
                  <td className="nowrap">{new Date(r.paidAt).toLocaleString("en-IN")}</td>
                  <td>
                    <Files files={r.files} onDownload={download} />
                  </td>
                  <td>
                    <StatusBadge value={r.status} />
                    {r.rejectReason ? <div className="err">{r.rejectReason}</div> : null}
                  </td>
                  <td>
                    <div className="actions-cell">
                      {meta.verifier && !franchiseUser && r.status === "Submitted" && String(r.createdBy) !== user.id ? (
                        <>
                          <button className="btn good" type="button" onClick={() => send("/api/finance/payments/" + r._id, "PATCH", { action: "approve" }, "Approved")}>
                            ✓ Approve
                          </button>
                          <button
                            className="btn bad"
                            type="button"
                            onClick={async () => {
                              const reason = await askText("Reason for rejecting", "", { title: "Reject payment", required: true, danger: true, okLabel: "Reject" });
                              if (reason) send("/api/finance/payments/" + r._id, "PATCH", { action: "reject", reason }, "Rejected");
                            }}
                          >
                            ✕ Reject
                          </button>
                        </>
                      ) : null}
                      {meta.finance && r.status === "Approved" ? (
                        <button className="btn good" type="button" onClick={() => send("/api/finance/payments/" + r._id, "PATCH", { action: "settle" }, "Settled")}>
                          Settle
                        </button>
                      ) : null}
                      {r.status === "Submitted" && String(r.createdBy) === user.id ? <span className="meta">awaiting another verifier</span> : null}
                      {r.status === "Settled" ? <span className="meta">🔒 settled</span> : null}
                      {r.status === "Rejected" && String(r.createdBy) === user.id ? (
                        <button
                          className="btn primary sm"
                          type="button"
                          onClick={() => openOn("Payments", { kind: r.kind, securityDepositId: r.securityDepositId, type: r.type, bank: r.bank, account: r.account, ifsc: r.ifsc, accountHolder: r.accountHolder, atmId: r.atmId, installment: r.installment, hpyAccount: r.hpyAccount, settlementBank: r.settlementBank, amount: r.amount })}
                        >
                          ↻ Resubmit
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={9} className="empty">
                    No payments.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p className="meta">Verify → Approved → Settled. The person who entered a payment cannot verify it.</p>
        </div>
        <EntryModal
          open={formOpen}
          title="Record payment with proof"
          steps={[
            { key: "what", label: "Payment for", hint: "SD or CLF" },
            { key: "proof", label: "Amount & proof" },
          ]}
          submitLabel="Submit for verification"
          busy={busy}
          onClose={() => setFormOpen(false)}
          onSubmit={async () => {
            const proof = document.getElementById("payProof");
            submitForm(send("/api/finance/payments", "POST", { ...f, file: await readFile(proof) }, "Payment submitted for verification"));
          }}
        >
          {[
            <div className="grid2" key="a">
              <Pick label="Kind" value={f.kind} onChange={pickKind} options={[["SD", "SD money"], ["CLF", "CLF"]]} />
              {f.kind === "SD" ? (
                <>
                  <Pick label="Security deposit (fills the balance)" value={f.securityDepositId} onChange={pickSd} options={sds.map((s) => [s._id, s.franchiseName + " · " + s.label + " · balance " + inr(s.balance)])} />
                  <Pick label="Type" value={f.type} onChange={(v) => set("type", v)} options={meta.payTypes} />
                  <Text label="Bank" value={f.bank} onChange={(v) => set("bank", v)} />
                  <Text label="Account" value={f.account} onChange={(v) => set("account", v)} />
                  <Text label="IFSC" value={f.ifsc} onChange={(v) => set("ifsc", v)} />
                  <Text label="Account holder" value={f.accountHolder} onChange={(v) => set("accountHolder", v)} />
                </>
              ) : f.kind === "CLF" ? (
                <>
                  <Pick label="ATM (fills last CLF details)" value={f.atmId} onChange={pickClfAtm} options={atmOptions} />
                  <Pick label="Installment" value={f.installment} onChange={(v) => set("installment", v)} options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]} />
                  <Text label="Bank" value={f.bank} onChange={(v) => set("bank", v)} />
                  <Text label="Account holder" value={f.accountHolder} onChange={(v) => set("accountHolder", v)} />
                  <Text label="HPY account" value={f.hpyAccount} onChange={(v) => set("hpyAccount", v)} />
                  <Pick label="Settlement bank" value={f.settlementBank} onChange={(v) => set("settlementBank", v)} options={meta.settlementBanks} />
                </>
              ) : (
                <p className="meta">Choose SD or CLF to see the bank fields.</p>
              )}
            </div>,
            <div className="grid2" key="b">
              <Text label="Amount" type="number" value={f.amount} onChange={(v) => set("amount", v)} />
              {f.kind === "SD" && f.securityDepositId ? (
                (() => {
                  const s = sds.find((x) => x._id === f.securityDepositId);
                  if (!s) return null;
                  const left = s.balance - (Number(f.amount) || 0);
                  return (
                    <div className="chips span-all">
                      <span className="badge info">Balance {inr(s.balance)}</span>
                      <span className={"badge " + (left < 0 ? "bad" : left === 0 ? "good" : "warn")}>{left < 0 ? "Exceeds balance by " + inr(-left) : left === 0 ? "Clears the deposit" : "Leaves " + inr(left) + " due"}</span>
                    </div>
                  );
                })()
              ) : null}
              <Text label="Paid at" type="datetime-local" value={f.paidAt} onChange={(v) => set("paidAt", v)} />
              <Text label="TXN / UTR number" value={f.txnNumber} onChange={(v) => set("txnNumber", v)} />
              <label>
                Proof
                <input id="payProof" type="file" />
              </label>
            </div>,
          ]}
        </EntryModal>
      </>
    );
  }

  /* ---------- Bank statements ---------- */

  function bankStatements() {
    const d = data[tab] || { rows: [], pending: [] };
    const canUpload = canFinUpload;
    const curFy = meta.currentFy || fyOf(new Date().toISOString().slice(0, 7));
    const fyChoices = [0, 1, 2, 3].map((n) => { const s = Number(curFy.slice(0, 4)) - n; return s + "-" + String(s + 1).slice(2); });
    const byStatus = countBy(d.rows, "financeStatus");
    return (
      <>
        <Kpis
          items={[
            ["To check", byStatus.Pending || 0, "#d97706"],
            ["Query", byStatus.Query || 0, "#e11d48"],
            ["Checked", byStatus.Checked || 0, "#059669"],
            ["Not uploaded", d.pending.length, "#7c3aed"],
          ]}
        />
        <div className="card table-scroll">
          {toolbar({
            count: d.rows.length,
            exportKind: "bank-statements",
            newLabel: "⤒ Upload statement",
            canNew: canUpload,
            children: (
              <label className="inline">
                F.Y.{" "}
                <select value={fy || d.fy || curFy} onChange={(e) => setFy(e.target.value)}>
                  {fyChoices.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            ),
          })}
          <table>
            <thead>
              <tr>
                <th>Franchise</th>
                <th>Month</th>
                <th>ATM / Hitachi code</th>
                <th>Location / state</th>
                <th>CL date</th>
                <th>Account type</th>
                <th>Upload status</th>
                <th>Finance A/C status</th>
                <th>Action to be taken</th>
                <th>File</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r._id} {...rowProps(r, r.financeStatus === "Query" ? "flag" : "")}>
                  <td>
                    <strong>{r.franchiseName}</strong>
                  </td>
                  <td>{r.month}</td>
                  <td>{[r.atmId, r.hitachiCode].filter(Boolean).join(" · ")}</td>
                  <td>{[r.location, r.state].filter(Boolean).join(", ")}</td>
                  <td>{r.clDate ? day(r.clDate) : ""}</td>
                  <td>{r.accountType || ""}</td>
                  <td>
                    <StatusBadge value={r.uploadStatus} />
                  </td>
                  <td>
                    <StatusBadge value={r.financeStatus} />
                    {r.financeRemark ? <div className="meta">{r.financeRemark}</div> : null}
                  </td>
                  <td>{r.actionToBeTaken || ""}</td>
                  <td>
                    <Files files={r.files} onDownload={download} />
                  </td>
                  <td>
                    {r.financeStatus === "Query" && canUpload ? (
                      <button className="btn primary sm" type="button" onClick={() => openOn("Bank statements", { franchiseId: r.franchiseId, month: r.month, atmId: r.atmId, accountType: r.accountType })}>
                        ⤒ Re-upload
                      </button>
                    ) : null}
                    {r.financeStatus === "Checked" ? (
                      <span className="meta">🔒 checked</span>
                    ) : meta.finance ? (
                      <div className="actions-cell">
                        <button className="btn good" type="button" onClick={() => send("/api/finance/bank-statements/" + r._id, "PATCH", { financeStatus: "Checked" }, "Checked")}>
                          ✓ Checked
                        </button>
                        <button
                          className="btn warn"
                          type="button"
                          onClick={async () => {
                            const remark = await askText("Query for the franchisee", "", { title: "Raise query", required: true, multiline: true, okLabel: "Next" });
                            if (!remark) return;
                            const actionToBeTaken = await askText("Action to be taken (optional)", "", { title: "Raise query", okLabel: "Raise query" });
                            if (actionToBeTaken === null) return;
                            send("/api/finance/bank-statements/" + r._id, "PATCH", { financeStatus: "Query", remark, actionToBeTaken }, "Query raised");
                          }}
                        >
                          ? Query
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!d.rows.length ? (
                <tr>
                  <td colSpan={11} className="empty">
                    No statements.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="section">
            <h4>
              Pending <StatusBadge value={String(d.pending.length)} tone={d.pending.length ? "bad" : "good"} />
            </h4>
            <div className="chips">
              {d.pending.length ? (
                d.pending.map((p, i) =>
                  canUpload ? (
                    <button key={i} type="button" className="badge warn" title="Upload this statement" onClick={() => openOn("Bank statements", { franchiseId: p.franchiseId, month: p.month })}>
                      ⤒ {p.franchiseName} {p.month}
                    </button>
                  ) : (
                    <span key={i} className="badge warn">
                      {p.franchiseName} {p.month}
                    </span>
                  )
                )
              ) : (
                <span className="meta">None</span>
              )}
            </div>
          </div>
        </div>
        <EntryModal
          open={formOpen}
          title="Upload bank statement"
          submitLabel="Upload"
          busy={busy}
          onClose={() => setFormOpen(false)}
          onSubmit={async () => submitForm(send("/api/finance/bank-statements", "POST", { ...f, file: await readFile(document.getElementById("bsFile")) }, "Statement uploaded"))}
        >
          <div className="grid2">
            {user.hierarchy !== "Franchise" ? <Pick label="Franchise" value={f.franchiseId} onChange={(v) => set("franchiseId", v)} options={frOptions} /> : null}
            <Text label="Month" type="month" value={f.month} onChange={(v) => set("month", v)} />
            <Pick label="ATM (fills location and CL date)" value={f.atmId} onChange={(v) => set("atmId", v)} options={atmOptions} />
            <Text label="Hitachi code" value={f.hitachiCode} onChange={(v) => set("hitachiCode", v)} />
            <Text label="Location" value={f.location} onChange={(v) => set("location", v)} />
            <Text label="State" value={f.state} onChange={(v) => set("state", v)} />
            <Pick label="Account type" value={f.accountType} onChange={(v) => set("accountType", v)} options={meta.bsAccountTypes || []} />
            <label>
              File
              <input id="bsFile" type="file" />
            </label>
            {f.month
              ? (() => {
                  const same = d.rows.find((r) => r.month === f.month && (!f.franchiseId || String(r.franchiseId) === String(f.franchiseId)));
                  return same ? (
                    <div className="chips span-all">
                      <span className={"badge " + (same.financeStatus === "Checked" ? "bad" : "warn")}>
                        {same.financeStatus === "Checked" ? "Already checked by Finance — only Finance can replace it" : "Replaces the " + same.month + " statement (new version, back to Pending)"}
                      </span>
                    </div>
                  ) : null;
                })()
              : null}
          </div>
        </EntryModal>
      </>
    );
  }

  /* ---------- TDS ---------- */

  function tds() {
    return (
      <>
        <div className="card">
          {meta.finance ? (
            <div className="toolbar">
              <span className="meta">{rows.length} records</span>
              <span className="spacer" />
              <button className="btn primary" type="button" onClick={() => openOn("TDS", { fy: meta.currentFy || "" })}>
                ⤒ Upload TDS letter
              </button>
            </div>
          ) : (
            toolbar({})
          )}
          <table>
            <thead>
              <tr>
                <th>Franchise</th>
                <th>F.Y.</th>
                <th>Quarter</th>
                <th>Letter</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} {...rowProps(r)}>
                  <td>
                    <strong>{r.franchiseName}</strong>
                  </td>
                  <td>{r.fy}</td>
                  <td>
                    <StatusBadge value={r.quarter} tone="info" />
                  </td>
                  <td>
                    <Files files={r.files} onDownload={download} />
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={4} className="empty">
                    No TDS letters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <EntryModal
          open={formOpen}
          title="Upload TDS letter"
          submitLabel="Upload"
          busy={busy}
          onClose={() => setFormOpen(false)}
          onSubmit={async () => submitForm(send("/api/finance/tds", "POST", { ...f, file: await readFile(document.getElementById("tdsFile")) }, "TDS letter uploaded"))}
        >
          <div className="grid2">
            <Pick label="Franchise" value={f.franchiseId} onChange={(v) => set("franchiseId", v)} options={frOptions} />
            <Text label="F.Y. (2026-27)" value={f.fy} onChange={(v) => set("fy", v)} />
            <Pick label="Quarter" value={f.quarter} onChange={(v) => set("quarter", v)} options={meta.quarters} />
            <label>
              File
              <input id="tdsFile" type="file" />
            </label>
          </div>
        </EntryModal>
      </>
    );
  }

  /* ---------- GST bills ---------- */

  function printBill(r) {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const line = (k, v) => "<tr><td>" + esc(k) + "</td><td style='text-align:right'>" + esc(inr(v)) + "</td></tr>";
    w.document.write(
      "<html><head><title>" + esc(r.billNo) + "</title></head><body style='font-family:sans-serif'><h2>Tax invoice " + esc(r.billNo) + "</h2><p>" + esc(r.franchiseName) + " · GSTIN " + esc(r.gstin) + " · Month " + esc(r.month) +
        "</p><table border='1' cellpadding='6' style='border-collapse:collapse'>" +
        line("Gross", r.grossAmount) + line("GST " + r.gstRate + "%", r.gstAmount) + line("Less TDS", -r.deductions.tds) + line("Less shortage", -r.deductions.shortage) + line("Less dispute", -r.deductions.dispute) + line("Less charge-back", -r.deductions.chargeBack) + line("Less GST deduction", -(r.deductions.gstDeduction || 0)) + line("Net payable", r.net) +
        "</table><p style='margin-top:60px'>Stamp and signature of franchisee</p></body></html>"
    );
    w.document.close();
    w.print();
  }

  async function editPaid(r) {
    const paidAmount = await askText("Paid amount", r.paidAmount == null ? "" : String(r.paidAmount), { title: "Payment details · " + r.billNo, inputType: "number", okLabel: "Save" });
    if (paidAmount == null) return;
    let reason = "";
    if (r.status === "Completed") {
      reason = await askText("Bill is completed. Reason for the change (audited)", "", { title: "Change completed bill", required: true, multiline: true, okLabel: "Save" });
      if (!reason) return;
    }
    send("/api/finance/gst-bills/" + r._id, "PATCH", { action: "details", paidAmount, reason }, "Payment details saved");
  }

  async function markPending(r) {
    const pendingAt = await askText("Where is the bill pending?", "Pending at FR End", { title: "Mark pending · " + r.billNo, options: ["Pending", "Pending at FR End", "Pending at Hitachi End"], required: true, okLabel: "Next" });
    if (!pendingAt) return;
    const remark = await askText("Remark", "", { title: "Mark pending · " + r.billNo, required: true, multiline: true, okLabel: "Mark pending" });
    if (remark) send("/api/finance/gst-bills/" + r._id, "PATCH", { action: "pending", pendingAt, remark }, "Marked pending");
  }

  async function gstPick(k, v) {
    const next = { ...f, [k]: v };
    if (k === "franchiseId") Object.assign(next, { gstin: "", atmId: "", siteId: "" });
    setF(next);
    setGstPreview(null);
    const key = next.franchiseId + "|" + next.month;
    gstKey.current = key;
    if (!next.franchiseId || !/^\d{4}-\d{2}$/.test(next.month || "")) return;
    try {
      const p = await api("/api/finance/gst-bills/preview?franchiseId=" + next.franchiseId + "&month=" + next.month);
      if (gstKey.current !== key) return;
      const e = p.existing || {};
      const str = (n) => (n != null && n !== 0 ? String(n) : "");
      setGstPreview(p);
      setF((x) => {
        return {
          ...x,
          gstin: x.gstin || p.gstin,
          atmId: x.atmId || p.atmId,
          siteId: x.siteId || p.siteId,
          grossAmount: str(e.grossAmount),
          gstRate: str(e.gstRate),
          tds: str(e.tds),
          dispute: str(e.dispute),
          gstDeduction: str(e.gstDeduction),
        };
      });
    } catch (err) {
      setError(err.message);
    }
  }

  function gstNetPreview() {
    if (!gstPreview) return null;
    const n = (v) => Number(v) || 0;
    const gross = n(f.grossAmount);
    const rate = f.gstRate === undefined || f.gstRate === "" ? 18 : n(f.gstRate);
    const gst = Math.round(gross * rate) / 100;
    const net = Math.round((gross + gst - n(f.tds) - gstPreview.shortage - n(f.dispute) - gstPreview.chargeBack - n(f.gstDeduction)) * 100) / 100;
    const e = gstPreview.existing;
    return (
      <div className="chips span-all">
        {e ? <span className={"badge " + (e.status === "Generated" ? "warn" : "bad")}>{e.status === "Generated" ? "Regenerates " + e.billNo : e.billNo + " is " + e.status + " — cannot regenerate"}</span> : null}
        <span className="badge info">GST {inr(gst)}</span>
        <span className="badge warn">Shortage {inr(gstPreview.shortage)} ({gstPreview.shortageEodCount} verified EODs)</span>
        <span className="badge warn">Charge-back {inr(gstPreview.chargeBack)} ({gstPreview.chargeBackCount})</span>
        <span className={"badge " + (net < 0 ? "bad" : "good")}>Net {inr(net)}</span>
      </div>
    );
  }

  function gstBills() {
    const by = countBy(rows, "status");
    return (
      <>
        <Kpis
          items={[
            ["Generated / pending", (by.Generated || 0) + (by.Pending || 0), "#d97706"],
            ["Submitted / processing", (by.Submitted || 0) + (by["Under Processing"] || 0), "#2563eb"],
            ["Completed", by.Completed || 0, "#059669"],
            ["Net payable", inr(sum(rows, "net")), "#7c3aed"],
          ]}
        />
        <div className="card table-scroll">
          {toolbar({ exportKind: "gst-bills", newLabel: "+ Generate GST bill", canNew: meta.finance })}
          <table>
            <thead>
              <tr>
                <th>Bill</th>
                <th>Franchise</th>
                <th>Site / ATM</th>
                <th>SAP / FR invoice</th>
                <th>Month</th>
                <th>Gross + GST</th>
                <th>TDS / shortage / dispute / charge-back / GST ded.</th>
                <th>Net</th>
                <th>Paid / payment status</th>
                <th>Status</th>
                <th>Files</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} {...rowProps(r, r.status === "Pending" && r.pendingAt === "Pending at FR End" ? "flag" : "")}>
                  <td className="nowrap">
                    <strong>{r.billNo}</strong>
                    {r.status === "Completed" ? <div className="meta">🔒 completed</div> : null}
                  </td>
                  <td>
                    {r.franchiseName}
                    <div className="meta">{r.gstin}</div>
                  </td>
                  <td>{[r.siteId, r.atmId].filter(Boolean).join(" · ")}</td>
                  <td>{[r.sapCode, r.frInvoiceNo].filter(Boolean).join(" · ")}</td>
                  <td>{r.month}</td>
                  <td className="nowrap">
                    {inr(r.grossAmount)} + {inr(r.gstAmount)}
                  </td>
                  <td className="err">
                    {inr(r.deductions.tds)} / {inr(r.deductions.shortage)} / {inr(r.deductions.dispute)} / {inr(r.deductions.chargeBack)} / {inr(r.deductions.gstDeduction)}
                  </td>
                  <td className="nowrap">
                    <strong>{inr(r.net)}</strong>
                  </td>
                  <td>
                    {r.paidAmount !== undefined ? inr(r.paidAmount) : ""} {r.paymentStatus ? <StatusBadge value={r.paymentStatus} /> : null}
                    {meta.finance ? (
                      <button className="btn ghost sm" type="button" onClick={() => editPaid(r)}>
                        ✎
                      </button>
                    ) : null}
                  </td>
                  <td>
                    <StatusBadge value={r.status} />
                    {r.pendingAt ? <div className="meta">{r.pendingAt}</div> : null}
                    {r.utr ? <div className="meta">Paid UTR {r.utr}</div> : null}
                    {r.pendingRemark && r.status === "Pending" ? <div className="err">{r.pendingRemark}</div> : null}
                  </td>
                  <td>
                    <Files files={r.files} onDownload={download} />
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn ghost" type="button" onClick={() => printBill(r)}>
                        🖶 Print
                      </button>
                      {["Generated", "Pending"].includes(r.status) && (meta.finance || franchiseUser) ? (
                        <label className="btn info filebtn">
                          ⤒ Signed copy
                          <input
                            type="file"
                            onChange={async (e) => {
                              const file = await readFile(e.target);
                              e.target.value = "";
                              if (file) send("/api/finance/gst-bills/" + r._id, "PATCH", { action: "submit", file }, "Signed bill submitted");
                            }}
                          />
                        </label>
                      ) : null}
                      {meta.finance && r.status === "Submitted" ? (
                        <button className="btn info" type="button" onClick={() => send("/api/finance/gst-bills/" + r._id, "PATCH", { action: "process" }, "Under processing")}>
                          Process
                        </button>
                      ) : null}
                      {meta.finance && r.status === "Under Processing" ? (
                        <button
                          className="btn good"
                          type="button"
                          onClick={async () => {
                            const utr = await askText("Payment UTR", "", { title: "Mark paid · " + r.billNo, required: true, okLabel: "Mark paid" });
                            if (utr) send("/api/finance/gst-bills/" + r._id, "PATCH", { action: "complete", utr }, "Completed and paid");
                          }}
                        >
                          ₹ Paid
                        </button>
                      ) : null}
                      {meta.finance && r.status !== "Completed" ? (
                        <button className="btn warn" type="button" onClick={() => markPending(r)}>
                          Pending
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={12} className="empty">
                    No GST bills.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <EntryModal
          open={formOpen}
          title="Generate / regenerate GST bill"
          subtitle="Shortage is taken from Verified EODs of the franchise's ATMs for the month; charge-back from Accepted, not-yet-billed charge-backs."
          steps={[
            { key: "bill", label: "Bill", hint: "Franchise, month, amount" },
            { key: "ded", label: "Deductions & refs" },
          ]}
          submitLabel="Generate"
          busy={busy}
          onClose={() => setFormOpen(false)}
          onSubmit={() => submitForm(send("/api/finance/gst-bills", "PUT", f, "Bill generated"))}
        >
          {[
            <div className="grid2" key="a">
              <Pick label="Franchise" value={f.franchiseId} onChange={(v) => gstPick("franchiseId", v)} options={frOptions} />
              <Text label="Month" type="month" value={f.month} onChange={(v) => gstPick("month", v)} />
              <Text label="GSTIN (from franchise master)" value={f.gstin} onChange={(v) => set("gstin", v)} />
              <Text label="Gross amount" type="number" value={f.grossAmount} onChange={(v) => set("grossAmount", v)} />
              <Text label="GST rate % (default 18)" type="number" value={f.gstRate} onChange={(v) => set("gstRate", v)} />
              {gstNetPreview()}
            </div>,
            <div className="grid2" key="b">
              <Text label="TDS" type="number" value={f.tds} onChange={(v) => set("tds", v)} />
              <Text label="Dispute" type="number" value={f.dispute} onChange={(v) => set("dispute", v)} />
              <Text label="GST deduction" type="number" value={f.gstDeduction} onChange={(v) => set("gstDeduction", v)} />
              <Text label="Site ID" value={f.siteId} onChange={(v) => set("siteId", v)} />
              <Pick label="ATM" value={f.atmId} onChange={(v) => set("atmId", v)} options={atmOptions} />
              <Text label="SAP code" value={f.sapCode} onChange={(v) => set("sapCode", v)} />
              <Text label="FR invoice no." value={f.frInvoiceNo} onChange={(v) => set("frInvoiceNo", v)} />
              {gstNetPreview()}
            </div>,
          ]}
        </EntryModal>
      </>
    );
  }

  /* ---------- Payout accounts ---------- */

  function payoutAccounts() {
    return (
      <>
        <div className="card">
          {toolbar({ newLabel: "+ Settlement account", canNew: canFinUpload })}
          <table>
            <thead>
              <tr>
                <th>Franchise</th>
                <th>Account</th>
                <th>IFSC / PAN</th>
                <th>Proof</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} {...rowProps(r, r.status === "Rejected" ? "flag" : "")}>
                  <td>
                    <strong>{r.franchiseName}</strong>
                  </td>
                  <td>
                    {r.accountName} · {r.bank} · {r.accountNumber}
                  </td>
                  <td>
                    {r.ifsc} / {r.pan}
                  </td>
                  <td>
                    <Files files={r.files} onDownload={download} />
                  </td>
                  <td>
                    <StatusBadge value={r.status} />
                    {r.rejectReason ? <div className="err">{r.rejectReason}</div> : null}
                    {r.status === "Verified" ? <div className="meta">{r.confirmationMailSent ? "✉ confirmation mail queued" : "✉ no confirmation mail"}</div> : null}
                  </td>
                  <td>
                    {meta.admin && r.status === "Pending" ? (
                      <div className="actions-cell">
                        <button className="btn good" type="button" onClick={() => send("/api/finance/payout-accounts/" + r._id, "PATCH", { action: "verify" }, (r) => "Verified" + (r.confirmationMail ? " · confirmation mail " + r.confirmationMail : ""))}>
                          ✓ Verify
                        </button>
                        <button
                          className="btn bad"
                          type="button"
                          onClick={async () => {
                            const reason = await askText("Reason for rejecting", "", { title: "Reject account", required: true, danger: true, okLabel: "Reject" });
                            if (reason) send("/api/finance/payout-accounts/" + r._id, "PATCH", { action: "reject", reason }, "Rejected");
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    ) : null}
                    {r.status === "Rejected" && canFinUpload ? (
                      <button className="btn primary sm" type="button" onClick={() => openOn("Payout accounts", { franchiseId: r.franchiseId, accountName: r.accountName, accountNumber: r.accountNumber, ifsc: r.ifsc, pan: r.pan, bank: r.bank })}>
                        ✎ Fix and resubmit
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No payout accounts.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <EntryModal
          open={formOpen}
          title="Settlement account"
          subtitle="Changing a verified account sends it back to Pending for Admin verification."
          busy={busy}
          onClose={() => setFormOpen(false)}
          onSubmit={async () => submitForm(send("/api/finance/payout-accounts", "PUT", { ...f, file: await readFile(document.getElementById("paFile")) }, "Account saved; awaiting Admin verification"))}
        >
          <div className="grid2">
            {user.hierarchy !== "Franchise" ? <Pick label="Franchise" value={f.franchiseId} onChange={(v) => set("franchiseId", v)} options={frOptions} /> : null}
            <Text label="Account name" value={f.accountName} onChange={(v) => set("accountName", v)} />
            <Text label="Account number" value={f.accountNumber} onChange={(v) => set("accountNumber", v)} />
            <Text label="IFSC" value={f.ifsc} onChange={(v) => set("ifsc", v)} />
            <Text label="PAN" value={f.pan} onChange={(v) => set("pan", v)} />
            <Text label="Bank" value={f.bank} onChange={(v) => set("bank", v)} />
            <label className="span-all">
              Cancelled cheque / passbook
              <input id="paFile" type="file" />
            </label>
          </div>
        </EntryModal>
      </>
    );
  }

  /* ---------- Payouts ---------- */

  async function payoutFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const payload = { template: "payout", fileName: file.name };
    if (/\.xlsx$/i.test(file.name)) payload.xlsx = await fileToB64(file);
    else payload.csv = await file.text();
    try {
      const r = await api("/api/imports", { method: "POST", body: JSON.stringify({ ...payload, preview: true }) });
      setPayoutPreview({ payload, preview: r.preview });
    } catch (err) {
      setError(err.message);
    }
  }

  async function payoutConfirm() {
    const r = await send("/api/imports", "POST", payoutPreview.payload, "Payout file processed");
    setPayoutPreview(null);
    if (r && r.batch) setNotice("Payout file: " + r.batch.accepted + " accepted, " + r.batch.rejected + " rejected" + (r.batch.errors.length ? " — " + r.batch.errors.slice(0, 3).map((x) => "line " + x.line + " " + x.column + ": " + x.reason).join("; ") : ""));
  }

  async function loadPnl() {
    try {
      setPnl(await api("/api/finance/pnl?from=" + (pnlRange.from || "") + "&to=" + (pnlRange.to || "")));
    } catch (err) {
      setError(err.message);
    }
  }

  async function exportPnl() {
    try {
      const r = await api("/api/finance/pnl?csv=1&from=" + (pnlRange.from || "") + "&to=" + (pnlRange.to || ""));
      downloadB64(r.fileName, "text/csv", btoa(unescape(encodeURIComponent(r.csv))));
    } catch (err) {
      setError(err.message);
    }
  }

  async function movePayout(r, s) {
    const body = { status: s };
    if (s === "Paid") {
      body.utr = await askText("UTR", "", { title: "Mark payout paid", required: true, okLabel: "Mark paid" });
      if (!body.utr) return;
    }
    if (["On Hold", "Rejected", "Failed"].includes(s)) {
      body.reason = await askText("Reason", "", { title: "Payout → " + s, required: true, multiline: true, danger: s !== "On Hold", okLabel: s });
      if (!body.reason) return;
    }
    send("/api/finance/payouts/" + r._id, "PATCH", body, "Payout " + s);
  }

  function pnlView() {
    return (
      <div className="card table-scroll">
        <div className="toolbar">
          <label className="inline">
            From
            <input type="month" value={pnlRange.from || ""} onChange={(e) => setPnlRange({ ...pnlRange, from: e.target.value })} />
          </label>
          <label className="inline">
            To
            <input type="month" value={pnlRange.to || ""} onChange={(e) => setPnlRange({ ...pnlRange, to: e.target.value })} />
          </label>
          <button className="btn primary" type="button" onClick={loadPnl}>
            Show
          </button>
          <span className="spacer" />
          {meta.export && !franchiseUser ? (
            <button className="btn ghost" type="button" onClick={exportPnl}>
              ⤓ Export CSV
            </button>
          ) : null}
        </div>
        {pnl ? (
          <>
            <div className="chips">
              {pnl.top ? <span className="badge good">★ Top performer: {pnl.top}</span> : null}
              {pnl.inLoss.length ? <span className="badge bad">In loss: {pnl.inLoss.join(", ")}</span> : <span className="badge good">No franchise in loss</span>}
              {pnl.consistentLoss.length ? <span className="badge bad">Consistent loss (3+ months): {pnl.consistentLoss.join(", ")}</span> : null}
            </div>
            <p className="meta">Profit = revenue − expenses − charge-backs when the payout file carries revenue and expenses; otherwise the net payout.</p>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Franchise</th>
                  <th>Months</th>
                  <th>Total</th>
                  <th>Loss months</th>
                  <th>Longest loss run</th>
                  <th>Result</th>
                  <th>By month</th>
                </tr>
              </thead>
              <tbody>
                {pnl.rows.map((r) => (
                  <tr key={r.franchiseId} className={r.consistentLoss ? "flag" : ""}>
                    <td>
                      <strong>#{r.rank}</strong>
                    </td>
                    <td>{r.franchise}</td>
                    <td>{r.months.length}</td>
                    <td className={"nowrap " + (r.total < 0 ? "err" : "ok")}>{inr(r.total)}</td>
                    <td>{r.lossMonths}</td>
                    <td>{r.longestLossRun}</td>
                    <td>
                      <StatusBadge value={r.result} tone={r.result === "Loss" ? "bad" : "good"} />
                    </td>
                    <td className="meta">{r.months.map((m) => m.month + ": " + inr(m.profit)).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="empty">Pick a month range and press Show.</p>
        )}
      </div>
    );
  }

  function payouts() {
    const by = countBy(rows, "status");
    return (
      <>
        <Tabs
          tabs={[
            ["register", "Payout register", rows.length],
            ["pnl", "Profit / loss"],
          ]}
          value={payoutView}
          onChange={setPayoutView}
        />
        {payoutView === "pnl" ? (
          pnlView()
        ) : (
          <>
            <Kpis
              items={[
                ["Total amount", inr(sum(rows, "amount")), "#2563eb"],
                ["Net", inr(sum(rows, (r) => (r.netAmount === undefined ? r.amount : r.netAmount))), "#059669"],
                ["Paid", by.Paid || 0, "#65a30d"],
                ["On hold / failed", (by["On Hold"] || 0) + (by.Failed || 0), "#e11d48"],
              ]}
            />
            <div className="card table-scroll">
              <div className="toolbar">
                <span className="meta">{rows.length} records</span>
                <span className="spacer" />
                {meta.export ? (
                  <button className="btn ghost" type="button" onClick={() => exportCsv("payouts")}>
                    ⤓ Export CSV
                  </button>
                ) : null}
                {meta.finance ? (
                  <label className="btn primary filebtn">
                    ⤒ Upload payout file
                    <input type="file" accept=".csv,text/csv,.xlsx" onChange={payoutFile} />
                  </label>
                ) : null}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Franchise</th>
                    <th>LOI code</th>
                    <th>ATM</th>
                    <th>PAN name</th>
                    <th>Email subject</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Charge-back deduction</th>
                    <th>Net</th>
                    <th>Status</th>
                    <th>UTR</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id} {...rowProps(r, ["On Hold", "Failed"].includes(r.status) ? "flag" : "")}>
                      <td>
                        <strong>{r.franchiseName}</strong>
                      </td>
                      <td>{r.loiCode || ""}</td>
                      <td>{r.atmId || ""}</td>
                      <td>{r.panName || ""}</td>
                      <td>{r.emailSubject || ""}</td>
                      <td>{r.month}</td>
                      <td className="nowrap">{inr(r.amount)}</td>
                      <td className="nowrap err">{r.chargeBackDeduction ? inr(r.chargeBackDeduction) : ""}</td>
                      <td className="nowrap">
                        <strong>{inr(r.netAmount === undefined ? r.amount : r.netAmount)}</strong>
                      </td>
                      <td>
                        <StatusBadge value={r.status} />
                      </td>
                      <td>{r.utr}</td>
                      <td>
                        <div className="actions-cell">
                          {!franchiseUser
                            ? (meta.payoutNext[r.status] || [])
                                .filter((s) => (["Approved", "Rejected"].includes(s) ? meta.verifier && !(s === "Approved" && String(r.createdBy) === user.id && !meta.admin) : meta.finance))
                                .map((s) => (
                                  <button key={s} className={moveClass(s)} type="button" onClick={() => movePayout(r, s)}>
                                    {s}
                                  </button>
                                ))
                            : null}
                          {r.status === "Pending" && String(r.createdBy) === user.id && !meta.admin ? <span className="meta">awaiting another approver</span> : null}
                          {["Paid", "Rejected"].includes(r.status) ? <span className="meta">🔒 {r.status.toLowerCase()}</span> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={12} className="empty">
                        No payouts.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <p className="meta">
                Columns: franchise, month, amount, loiCode, atmId, panName, emailSubject, remark, revenue, expenses (revenue / expenses optional, for the P&amp;L). All-or-nothing: one bad row rejects the whole file. Franchise needs a verified payout account. Accepted, unbilled charge-backs are deducted.
              </p>
            </div>
          </>
        )}
        <Modal
          open={!!payoutPreview}
          size="xl"
          title={payoutPreview ? "Preview · " + payoutPreview.payload.fileName : ""}
          subtitle={
            payoutPreview
              ? payoutPreview.preview.totalRows + " row(s) · " + payoutPreview.preview.rule + (payoutPreview.preview.ignoredColumns.length ? " · ignored columns: " + payoutPreview.preview.ignoredColumns.join(", ") : "")
              : ""
          }
          onClose={() => !busy && setPayoutPreview(null)}
          footer={
            <>
              <button className="btn ghost" type="button" onClick={() => setPayoutPreview(null)}>
                Cancel
              </button>
              <button className="btn good" type="button" disabled={busy} onClick={payoutConfirm}>
                Confirm upload
              </button>
            </>
          }
        >
          {payoutPreview ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {payoutPreview.preview.header.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payoutPreview.preview.sample.map((r, i) => (
                    <tr key={i}>
                      {payoutPreview.preview.header.map((h, j) => (
                        <td key={h}>{String(r[j] === undefined ? "" : r[j])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Modal>
      </>
    );
  }

  const render = {
    Desk: desk,
    "Charge-back": chargeback,
    "Security deposit": securityDeposit,
    Payments: payments,
    "Bank statements": bankStatements,
    TDS: tds,
    "GST bills": gstBills,
    "Payout accounts": payoutAccounts,
    Payouts: payouts,
  };

  return (
    <>
      <Tabs tabs={TABS.map((x) => [x, TAB_ICON[x] + " " + x])} value={tab} onChange={setTab} />
      {render[tab]()}
      {EXTRA_REGISTER[tab] && !franchiseUser && rows.length ? (
        <ExtraColumns
          register={EXTRA_REGISTER[tab]}
          rows={rows}
          rowLabel={(r) => [r.franchiseName, r.month || r.fy || r.quarter || (r.date ? day(r.date) : ""), r.amount ? inr(r.amount) : ""].filter(Boolean).join(" · ") || r._id}
          office={!user.fieldStaff && can(user, "Edit", "CRM-04")}
          admin={user.officeAdmin}
          setError={setError}
          setNotice={setNotice}
          onReload={load}
        />
      ) : null}
    </>
  );
}

const EXTRA_REGISTER = { Payments: "payment", "Bank statements": "bankStatement", TDS: "tds", "GST bills": "gstBill", Payouts: "payout" };
