import { Fragment, useEffect, useRef, useState } from "react";
import { askText } from "../../components/common/Dialogs.jsx";
import { ExtraColumns } from "../../components/common/ExtraColumns.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { useFocusRow } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";

const TABS = ["Day board", "TXN", "CBR 1", "CBR 2", "Funding", "EOD", "Overage", "Imports"];
const TXN_LABEL = { nonCash: "Non-Cash", cash: "Cash", upi: "UPI", deposit: "Deposit" };
const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const EOD_FORM_FIELDS = ["eodTime", "opening", "dispenseMachine", "dispenseApna", "purgeNotes", "physicalNotes", "loadingNotes", "remarks"];
const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN");
const ENTRY_TITLE = { TXN: "Daily TXN entry", "CBR 1": "CBR 1 — denomination-wise (Dexter-3)", "CBR 2": "CBR 2 — site-wise line", Funding: "CBR 3 — funding", EOD: "EOD at 23:00", Overage: "Overage deposit" };

function downloadText(fileName, text) {
  downloadB64(fileName, "text/csv", btoa(unescape(encodeURIComponent(text))));
}

function AtmPick({ atms, value, onChange, disabled }) {
  return (
    <label>
      ATM ID (Cash Live)
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {atms.map((a) => (
          <option key={a._id} value={a.atmId}>
            {a.atmId} · {a.city} · {a.franchiseeName}
          </option>
        ))}
      </select>
    </label>
  );
}

function Num({ label, value, onChange, disabled }) {
  return (
    <label>
      {label}
      <input type="number" value={value === undefined ? "" : value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function DenoNotes({ title, denos, value, onChange, disabled }) {
  return (
    <div className="section">
      <h4>{title} (notes)</h4>
      <div className="grid5">
        {denos.map((d) => (
          <label key={d}>
            ₹{d}
            <input type="number" value={(value || {})[d] || ""} disabled={disabled} onChange={(e) => onChange({ ...(value || {}), [d]: e.target.value })} />
          </label>
        ))}
      </div>
    </div>
  );
}

function DateFilter({ value, onChange, label = "Date" }) {
  return (
    <label className="inline">
      {label} <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function sumNotes(denos, m) {
  return denos.reduce((s, d) => s + (Number((m || {})[d]) || 0) * d, 0);
}

function Preview({ items }) {
  return (
    <div className="chips">
      {items.map(([label, value, tone]) => (
        <span key={label} className={"badge " + (tone || "info")}>
          {label}: ₹{fmt(value)}
        </span>
      ))}
    </div>
  );
}

function Step({ done, label, tone }) {
  return <StatusBadge value={label || (done ? "✓ Done" : "Missing")} tone={tone || (done ? "good" : "bad")} />;
}

export function OpsPage({ canRun, canDecide, isAdmin, setError, setNotice }) {
  const [tab, setTab] = useState("Day board");
  const [pre, setPre] = useState(null);
  const nextOpen = useRef(null);
  const [meta, setMeta] = useState({ denos: [], cbr1Cols: [], txnTypes: [], cbr2Fields: [], wlaFields: [], axisFields: [], templates: {} });
  const [atms, setAtms] = useState([]);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [date, setDate] = useState(today());
  const [data, setData] = useState({});
  const [f, setF] = useState({ atmId: "", date: today() });
  const [fundType, setFundType] = useState("WLA");
  const [template, setTemplate] = useState("TXN-daily");
  const [lastBatch, setLastBatch] = useState(null);
  const [pending, setPending] = useState(null);
  const [entry, setEntry] = useState(null);
  const [txnView, setTxnView] = useState("summary");
  const { rowProps } = useFocusRow("ops", (link) => {
    if (link.date) setDate(link.date);
    if (TABS.includes(link.type)) setTab(link.type);
  }, [data]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const open = nextOpen.current;
    nextOpen.current = null;
    setPre(null);
    if (open) {
      setF(open);
      setEntry({ mode: "new" });
    } else {
      setF((x) => ({ atmId: x.atmId, date: x.date }));
      setEntry(null);
    }
  }, [tab]);

  function openNew() {
    setPre(null);
    setF((x) => ({ atmId: x.atmId, date: x.date || today() }));
    setEntry({ mode: "new" });
  }

  function openOn(tabName, fields) {
    if (tabName === tab) {
      setPre(null);
      setF(fields);
      setEntry({ mode: "new" });
    } else {
      nextOpen.current = fields;
      setTab(tabName);
    }
  }

  const isNew = !!entry && entry.mode === "new";
  useEffect(() => {
    if (!isNew || !f.atmId || !f.date || !["CBR 1", "CBR 2", "Funding", "EOD"].includes(tab)) return;
    let live = true;
    api("/api/ops/prefill?atmId=" + encodeURIComponent(f.atmId) + "&date=" + f.date)
      .then((p) => {
        if (!live) return;
        setPre(p);
        if (tab === "Funding" && ["WLA", "Axis", "ICD"].includes(p.fundingPath)) setFundType(p.fundingPath);
        setF((x) => {
          const n = { ...x };
          const fill = (k, v) => (n[k] === undefined || n[k] === "") && v !== null && v !== undefined && v !== "" && (n[k] = v);
          if (tab === "CBR 1") ["fr", "location", "bank", "cra"].forEach((k) => fill(k, p[k]));
          if (tab === "CBR 1" || tab === "CBR 2") fill("eodTime", "23:00");
          if (tab === "Funding") fill("openingWla", p.previousWlaClosing);
          if (tab === "EOD" && p.previousClosing !== null) n.opening = p.previousClosing;
          return n;
        });
      })
      .catch(() => live && setPre(null));
    return () => {
      live = false;
    };
  }, [isNew, f.atmId, f.date, tab]);

  function loadIntoForm(r, fields, mode = "edit") {
    const next = { atmId: r.atmId, date: r.date };
    fields.forEach((k) => r[k] !== undefined && (next[k] = r[k]));
    setF(next);
    setEntry({ mode, row: r });
  }

  async function load() {
    try {
      const [m, a] = await Promise.all([api("/api/ops/meta"), api("/api/ops/live-atms")]);
      setMeta(m);
      setAtms(a.atms || []);
      const q = "?date=" + date;
      const next = {};
      if (tab === "Day board") next.day = await api("/api/ops/day" + q);
      if (tab === "TXN") next.txn = await api("/api/ops/txn?month=" + month);
      if (tab === "CBR 1") next.cbr1 = await api("/api/ops/cbr1" + q);
      if (tab === "CBR 2") next.cbr2 = await api("/api/ops/cbr2" + q);
      if (tab === "Funding") next.funding = await api("/api/ops/funding" + q);
      if (tab === "EOD") next.eod = await api("/api/ops/eod" + q);
      if (tab === "Overage") next.overage = await api("/api/ops/overage");
      if (tab === "Imports") next.imports = await api("/api/imports");
      setData(next);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [tab, month, date]);

  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  async function send(path, method, body, okText, offline) {
    if (sending.current) return null;
    sending.current = true;
    setBusy(true);
    try {
      const r = await api(path, { method, body: JSON.stringify(body), offline });
      if (r && r.queued) {
        setNotice(r.label + " saved on this device; it will be sent when you are back online");
        return r;
      }
      setNotice(okText);
      await load();
      return r;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function saveEntry(path, method, body, okText, offline) {
    const r = await send(path, method, body, okText, offline);
    if (r) setEntry(null);
    return r;
  }

  async function exportTxn() {
    try {
      const r = await api("/api/ops/txn/export?month=" + month);
      downloadB64(r.fileName, "text/csv", btoa(unescape(encodeURIComponent(r.csv))));
    } catch (err) {
      setError(err.message);
    }
  }

  const editing = entry && entry.mode !== "new";
  const atmDate = (
    <>
      <AtmPick atms={atms} value={f.atmId} disabled={editing} onChange={(v) => set("atmId", v)} />
      <label>
        Business date
        <input type="date" value={f.date} disabled={editing} onChange={(e) => set("date", e.target.value)} />
      </label>
    </>
  );
  const newBtn = (label) =>
    canRun ? (
      <button className="btn primary" type="button" onClick={openNew}>
        + {label}
      </button>
    ) : null;

  /* ---------- entry forms (shown in the modal) ---------- */

  function txnForm() {
    return (
      <>
        <div className="grid2">
          {atmDate}
          <Num label="Issued indent" value={f.issuedIndent} onChange={(v) => set("issuedIndent", v)} />
          <Num label="Failed / declined TXN count (optional)" value={f.failedCount} onChange={(v) => set("failedCount", v)} />
        </div>
        <div className="section">
          <h4>Counts and amounts</h4>
          <div className="grid2">
            {meta.txnTypes.map((k) => (
              <Fragment key={k}>
                <Num label={TXN_LABEL[k] + " count"} value={f[k + "Count"]} onChange={(v) => set(k + "Count", v)} />
                <Num label={TXN_LABEL[k] + " amount (₹)"} value={f[k + "Amount"]} onChange={(v) => set(k + "Amount", v)} />
              </Fragment>
            ))}
          </div>
        </div>
        <p className="meta">Entries older than {meta.txnEntryDays || 45} days, or already confirmed, can only be changed by an Admin.</p>
      </>
    );
  }

  function cbr1Form() {
    const cell = (d, c) => ((f.denos || {})[d] || {})[c + "Notes"] || "";
    const setCell = (d, c, v) => setF((x) => ({ ...x, denos: { ...(x.denos || {}), [d]: { ...((x.denos || {})[d] || {}), [c + "Notes"]: v } } }));
    const sideCell = (s, c) => ((f.side || {})[s] || {})[c + "Amount"] || "";
    const setSide = (s, c, v) => setF((x) => ({ ...x, side: { ...(x.side || {}), [s]: { ...((x.side || {})[s] || {}), [c + "Amount"]: v } } }));
    return (
      <>
        <div className="grid2">
          {atmDate}
          {["cra", "fr", "location", "bank", "indent", "eodTime", "remarks"].map((k) => (
            <label key={k}>
              {humanize(k)}
              <input value={f[k] || ""} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
        </div>
        <div className="section table-scroll">
          <h4>Denominations</h4>
          <table className="grid-input">
            <thead>
              <tr>
                <th>Deno</th>
                {meta.cbr1Cols.map((c) => (
                  <th key={c}>{humanize(c)} notes</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meta.denos.map((d) => (
                <tr key={d}>
                  <td>
                    <strong>₹{d}</strong>
                  </td>
                  {meta.cbr1Cols.map((c) => (
                    <td key={c}>
                      <input type="number" value={cell(d, c)} onChange={(e) => setCell(d, c, e.target.value)} />
                      <div className="meta">₹{fmt((Number(cell(d, c)) || 0) * d)}</div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="total">
                <td>
                  <strong>Total</strong>
                </td>
                {meta.cbr1Cols.map((c) => (
                  <td key={c}>
                    <strong>₹{fmt(meta.denos.reduce((s, d) => s + (Number(cell(d, c)) || 0) * d, 0))}</strong>
                  </td>
                ))}
              </tr>
              {(meta.cbr1SideRows || []).map((s) => (
                <tr key={s}>
                  <td>{s} ₹</td>
                  {meta.cbr1Cols.map((c) => (
                    <td key={c}>
                      <input type="number" value={sideCell(s, c)} onChange={(e) => setSide(s, c, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function cbr2Form() {
    return (
      <div className="grid2">
        {atmDate}
        {["mfName", "indentNo", "eodTime", "remarks"].map((k) => (
          <label key={k}>
            {humanize(k)}
            <input value={f[k] || ""} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
        {meta.cbr2Fields.map((k) => (
          <Num key={k} label={humanize(k)} value={f[k]} onChange={(v) => set(k, v)} />
        ))}
      </div>
    );
  }

  function fundingForm() {
    const fields = fundType === "WLA" ? meta.wlaFields : meta.axisFields;
    return (
      <>
        {entry && entry.mode === "new" ? (
          <Tabs
            tabs={[
              ["WLA", "WLA account"],
              ["Axis", "Axis indent"],
              ["ICD", "ICD"],
            ]}
            value={fundType}
            onChange={setFundType}
          />
        ) : null}
        <div className="grid2">
          {atmDate}
          {fields.map((k) => (
            <Num key={k} label={humanize(k)} value={f[k]} onChange={(v) => set(k, v)} />
          ))}
        </div>
        {pre && fundType === "WLA" && pre.previousWlaClosing !== null ? (
          <p className="meta">
            Opening WLA filled from the {pre.previousWlaDate} closing (₹{fmt(pre.previousWlaClosing)}).
          </p>
        ) : null}
        {fundType === "WLA" ? (
          <Preview
            items={[
              ["Closing WLA", (Number(f.openingWla) || 0) + (Number(f.fundHpy) || 0) - (Number(f.withdrawal) || 0), (Number(f.openingWla) || 0) + (Number(f.fundHpy) || 0) - (Number(f.withdrawal) || 0) < 0 ? "bad" : "info"],
              ["Loading difference", (Number(f.loadingCbr) || 0) - (Number(f.withdrawal) || 0), (Number(f.loadingCbr) || 0) - (Number(f.withdrawal) || 0) ? "warn" : "good"],
            ]}
          />
        ) : (
          <Preview
            items={[
              ["Indent total", (Number(f.axisLot1) || 0) + (Number(f.axisLot2) || 0)],
              ["Loading difference", (Number(f.loadingCbr) || 0) - (Number(f.axisLot1) || 0) - (Number(f.axisLot2) || 0), (Number(f.loadingCbr) || 0) - (Number(f.axisLot1) || 0) - (Number(f.axisLot2) || 0) ? "warn" : "good"],
            ]}
          />
        )}
        <p className="meta">
          {fundType === "WLA" ? "Closing WLA = opening + HPY fund − withdrawal. Loading difference = CBR loading − withdrawal." : "Loading difference = CBR loading − (1st lot + 2nd lot)."}
        </p>
      </>
    );
  }

  function eodForm() {
    const fromPrev = entry && entry.mode === "new" ? !!pre && pre.previousClosing !== null : !!(entry && entry.row && entry.row.openingFromPreviousDay && entry.mode !== "correct");
    const opening = Number(f.opening) || 0;
    const purge = sumNotes(meta.denos, f.purgeNotes);
    const physical = sumNotes(meta.denos, f.physicalNotes);
    const loading = sumNotes(meta.denos, f.loadingNotes);
    const expected = opening - (Number(f.dispenseMachine) || 0) - purge;
    const diff = (Number(f.dispenseMachine) || 0) - (Number(f.dispenseApna) || 0);
    return (
      <>
        <div className="grid2">
          {atmDate}
          <label>
            EOD time <input value={f.eodTime || "23:00"} onChange={(e) => set("eodTime", e.target.value)} />
          </label>
          <Num label={fromPrev ? "Opening (previous day's closing)" : "Opening (no previous-day EOD, enter from DMS)"} value={f.opening} disabled={fromPrev} onChange={(v) => set("opening", v)} />
          <Num label="Dispense — machine counter" value={f.dispenseMachine} onChange={(v) => set("dispenseMachine", v)} />
          <Num label="Dispense — Apna App" value={f.dispenseApna} onChange={(v) => set("dispenseApna", v)} />
        </div>
        <DenoNotes title="Purge bin" denos={meta.denos} value={f.purgeNotes} onChange={(v) => set("purgeNotes", v)} />
        <DenoNotes title="Physical cash at 23:00" denos={meta.denos} value={f.physicalNotes} onChange={(v) => set("physicalNotes", v)} />
        <DenoNotes title="Loading" denos={meta.denos} value={f.loadingNotes} onChange={(v) => set("loadingNotes", v)} />
        <label>
          Remarks <input value={f.remarks || ""} onChange={(e) => set("remarks", e.target.value)} />
        </label>
        <Preview
          items={[
            ["Expected", expected],
            ["Physical", physical],
            [physical >= expected ? "Overage" : "Shortage", Math.abs(physical - expected), physical === expected ? "good" : physical > expected ? "warn" : "bad"],
            ["Closing", physical + loading, "good"],
            ["Machine − Apna dispense", diff, diff ? "bad" : "good"],
          ]}
        />
        <p className="meta">Expected = opening − machine dispense − purge. Overage / shortage = physical vs expected. Closing = physical + loading.</p>
      </>
    );
  }

  function overageForm() {
    return (
      <div className="grid2">
        {atmDate}
        <Num label="Overage amount" value={f.amount} onChange={(v) => set("amount", v)} />
        <label>
          Mode
          <select value={f.mode || ""} onChange={(e) => set("mode", e.target.value)}>
            {["", "NEFT", "RTGS", "IMPS", "UPI", "Cash deposit"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          UTR / TXN <input value={f.utr || ""} onChange={(e) => set("utr", e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={!!f.emailFlag} onChange={(e) => set("emailFlag", e.target.checked)} /> Email sent
        </label>
      </div>
    );
  }

  async function applyFundingCorrection() {
    const r = entry.row;
    const reason = await askText("Reason for correcting the " + r.type + " calculation for " + r.atmId + " " + r.date, "", { title: "Admin correction", required: true, multiline: true });
    if (!reason) return;
    const fields = fundType === "WLA" ? meta.wlaFields : meta.axisFields;
    const body = { reason };
    fields.forEach((k) => f[k] !== undefined && f[k] !== "" && (body[k] = f[k]));
    saveEntry("/api/ops/funding/" + r._id + "/correct", "PATCH", body, "Calculation corrected by Admin");
  }

  async function applyEodCorrection() {
    const r = entry.row;
    const reason = await askText("Reason for Admin correction of " + r.atmId + " " + r.date, "", { title: "Admin correction", required: true, multiline: true });
    if (!reason) return;
    const body = { reason };
    EOD_FORM_FIELDS.forEach((k) => f[k] !== undefined && (body[k] = f[k]));
    saveEntry("/api/ops/eod/" + r._id + "/admin-correct", "PATCH", body, "EOD corrected by Admin");
  }

  function entryFooter() {
    const correcting = entry && entry.mode === "correct";
    const primary = {
      TXN: ["Save TXN", () => saveEntry("/api/ops/txn", "PUT", f, "TXN saved")],
      "CBR 1": ["Save CBR 1", () => saveEntry("/api/ops/cbr1", "PUT", f, "CBR 1 saved")],
      "CBR 2": ["Save CBR 2", () => saveEntry("/api/ops/cbr2", "PUT", f, "CBR 2 saved")],
      Funding: correcting ? ["Apply correction", applyFundingCorrection] : ["Save funding", () => saveEntry("/api/ops/funding", "PUT", { ...f, type: fundType }, "Funding saved")],
      EOD: correcting ? ["Apply Admin correction", applyEodCorrection] : ["Save EOD draft", () => saveEntry("/api/ops/eod", "PUT", f, "EOD draft saved", "EOD draft " + f.atmId + " " + (f.date || ""))],
      Overage: ["Log deposit", () => saveEntry("/api/ops/overage", "POST", f, "Overage deposit logged")],
    }[tab];
    if (!primary) return null;
    return (
      <>
        <button className="btn ghost" type="button" onClick={() => setEntry(null)}>
          Cancel
        </button>
        <button className={"btn " + (correcting ? "warn" : "good")} type="button" disabled={busy || !f.atmId} onClick={primary[1]}>
          {busy ? "Saving…" : primary[0]}
        </button>
      </>
    );
  }

  const entryBody = { TXN: txnForm, "CBR 1": cbr1Form, "CBR 2": cbr2Form, Funding: fundingForm, EOD: eodForm, Overage: overageForm }[tab];

  /* ---------- registers ---------- */

  function rowEdit(r, fields) {
    if (r.locked && !isAdmin) return <span className="meta" title="EOD verified for this ATM-day">🔒</span>;
    const row = r.denos
      ? { ...r, denos: Object.fromEntries(Object.entries(r.denos).map(([d, v]) => [d, Object.fromEntries(Object.entries(v || {}).filter(([k]) => k.endsWith("Notes")))])) }
      : r;
    return (
      <button className="btn ghost" type="button" onClick={() => loadIntoForm(row, fields)}>
        ✎
      </button>
    );
  }

  function renderDay() {
    const d = data.day || { rows: [] };
    const rows = d.rows;
    const count = (fn) => rows.filter(fn).length;
    const submitted = count((r) => r.eod && r.eod.status === "Submitted");
    const open = (tabName, r, extra) => openOn(tabName, { atmId: r.atmId, date, ...(extra || {}) });
    async function returnEod(r) {
      const reason = await askText("Why return to Executive?", "", { title: "Return EOD — " + r.atmId, required: true, multiline: true, okLabel: "Return" });
      if (reason) send("/api/ops/eod/" + r.eod._id + "/verify", "POST", { returnToDraft: true, reason }, "EOD returned");
    }
    async function verifyDay() {
      const r = await send("/api/ops/eod/verify-day", "POST", { date }, "EODs verified for " + date);
      if (r && r.skipped && r.skipped.length) setError("Verified " + r.verified + ". Skipped: " + r.skipped.join("; "));
    }
    const missingBtn = (tabName, r) =>
      canRun ? (
        <button className="btn ghost" type="button" onClick={() => open(tabName, r)}>
          + Enter
        </button>
      ) : null;
    return (
      <div className="card">
        <div className="toolbar">
          <DateFilter value={date} onChange={setDate} />
          <div className="chips">
            <span className="badge info">Live ATMs: {rows.length}</span>
            <span className={"badge " + (count((r) => !r.txn) ? "bad" : "good")}>TXN missing: {count((r) => !r.txn)}</span>
            <span className={"badge " + (count((r) => !r.cbr1) ? "warn" : "good")}>CBR 1 missing: {count((r) => !r.cbr1)}</span>
            <span className={"badge " + (count((r) => !r.eod) ? "bad" : "good")}>EOD missing: {count((r) => !r.eod)}</span>
            <span className="badge warn">EOD to verify: {submitted}</span>
            <span className="badge good">Locked: {count((r) => r.eod && r.eod.status === "Verified")}</span>
          </div>
          <span className="spacer" />
          {canDecide && submitted ? (
            <button className="btn good" type="button" disabled={busy} onClick={verifyDay}>
              ✓ Verify all submitted
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ATM</th>
                <th>TXN</th>
                <th>CBR 1</th>
                <th>CBR 2</th>
                <th>Funding</th>
                <th>EOD</th>
                <th>Overage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const e = r.eod;
                const locked = e && e.status === "Verified";
                const owed = e ? e.overage - r.overageDeposited : 0;
                return (
                  <tr key={r.atmId} className={locked ? "" : !r.txn || !e ? "flag" : ""}>
                    <td>
                      <strong>{r.atmId}</strong>
                      <div className="meta">{[r.city, r.franchiseeName].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="nowrap">
                      {r.txn ? <Step done label={r.txn.zero ? "Zero TXN" : r.txn.confirmed ? "✓ Confirmed" : "✓ Entered"} tone={r.txn.zero ? "warn" : r.txn.confirmed ? "good" : "info"} /> : <Step />}{" "}
                      {!r.txn ? missingBtn("TXN", r) : null}
                    </td>
                    <td className="nowrap">
                      <Step done={r.cbr1} /> {!r.cbr1 && !locked ? missingBtn("CBR 1", r) : null}
                    </td>
                    <td className="nowrap">
                      <Step done={r.cbr2} tone={r.cbr2 ? "good" : "none"} label={r.cbr2 ? "✓ Done" : "—"} /> {!r.cbr2 && !locked ? missingBtn("CBR 2", r) : null}
                    </td>
                    <td className="nowrap">
                      {r.funding.length ? <Step done label={"✓ " + r.funding.join(", ")} /> : <Step done={false} tone="none" label="—" />} {!r.funding.length && !locked ? missingBtn("Funding", r) : null}
                    </td>
                    <td>
                      {e ? (
                        <>
                          <StatusBadge value={locked ? "Verified 🔒" : e.status} />
                          {e.dispenseFlag ? <div className="err">machine ≠ Apna dispense</div> : null}
                          {e.openingMismatch ? <div className="err">opening ≠ previous closing</div> : null}
                          {e.shortage ? <div className="err">shortage ₹{fmt(e.shortage)}</div> : null}
                          {e.returnReason ? <div className="err">Returned: {e.returnReason}</div> : null}
                          <div className="actions-cell">
                            {canRun && e.status === "Draft" ? (
                              <>
                                <button className="btn ghost" type="button" onClick={() => (setDate(date), setTab("EOD"))}>
                                  ✎ Open
                                </button>
                                <button className="btn info" type="button" disabled={busy} onClick={() => send("/api/ops/eod/" + e._id + "/submit", "POST", {}, "EOD submitted")}>
                                  Submit
                                </button>
                              </>
                            ) : null}
                            {canDecide && e.status === "Submitted" && (isAdmin || String(e.submittedBy) !== d.me) ? (
                              <>
                                <button className="btn good" type="button" disabled={busy} onClick={() => send("/api/ops/eod/" + e._id + "/verify", "POST", {}, "EOD verified; day locked")}>
                                  ✓ Verify
                                </button>
                                <button className="btn warn" type="button" onClick={() => returnEod(r)}>
                                  Return
                                </button>
                              </>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <>
                          <Step /> {missingBtn("EOD", r)}
                        </>
                      )}
                    </td>
                    <td className="nowrap">
                      {e && e.overage ? (
                        owed > 0 ? (
                          <>
                            <StatusBadge value={"₹" + fmt(owed) + " to deposit"} tone="warn" />{" "}
                            <button className="btn ghost" type="button" onClick={() => open("Overage", r, { amount: owed })}>
                              + Log deposit
                            </button>
                          </>
                        ) : (
                          <StatusBadge value={"₹" + fmt(e.overage) + " deposited"} tone="good" />
                        )
                      ) : (
                        <span className="meta">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="empty">
                    No ATMs were Cash Live on {date}.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="meta">Daily order: TXN → CBR 1 (and CBR 2) → funding → EOD at 23:00 → Executive submits → Verifier verifies, which locks the ATM-day for everyone except Admin.</p>
      </div>
    );
  }

  function renderTxn() {
    const t = data.txn || { rows: [], summary: [] };
    return (
      <div className="card">
        <div className="toolbar">
          <label className="inline">
            Month <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          {meta.canExport ? (
            <button className="btn ghost" type="button" onClick={exportTxn}>
              ⤓ Export CSV
            </button>
          ) : null}
          {meta.canConfirm ? (
            <>
              <DateFilter label="Confirm date" value={date} onChange={setDate} />
              <button className="btn info" type="button" onClick={() => send("/api/ops/txn/confirm", "POST", { date }, "TXN confirmed for " + date)}>
                ✓ Confirm day
              </button>
            </>
          ) : null}
          <span className="spacer" />
          {newBtn("TXN entry")}
        </div>
        <Tabs
          tabs={[
            ["summary", "Monthly summary", t.summary.length],
            ["rows", "Daily rows", t.rows.length],
          ]}
          value={txnView}
          onChange={setTxnView}
        />
        {txnView === "summary" ? (
          <table>
            <thead>
              <tr>
                <th>ATM</th>
                {meta.txnTypes.map((k) => (
                  <th key={k}>{TXN_LABEL[k]} (count / ₹)</th>
                ))}
                <th>Zero TXN days</th>
                <th>Non-TXN days</th>
                <th>Longest zero run</th>
              </tr>
            </thead>
            <tbody>
              {t.summary.map((s) => (
                <tr key={s.atmId}>
                  <td>
                    <strong>{s.atmId}</strong>
                  </td>
                  {meta.txnTypes.map((k) => (
                    <td key={k}>
                      {fmt(s.totals[k + "Count"])} / ₹{fmt(s.totals[k + "Amount"])}
                    </td>
                  ))}
                  <td>{s.zeroDays ? <StatusBadge value={s.zeroDays} tone="warn" /> : 0}</td>
                  <td>{s.nonTxnDays}</td>
                  <td>{s.consecutiveZero >= 2 ? <StatusBadge value={s.consecutiveZero} tone="bad" /> : s.consecutiveZero}</td>
                </tr>
              ))}
              {!t.summary.length ? (
                <tr>
                  <td colSpan={4 + meta.txnTypes.length} className="empty">
                    No TXN this month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>ATM</th>
                {meta.txnTypes.map((k) => (
                  <th key={k}>{TXN_LABEL[k]}</th>
                ))}
                <th>Indent</th>
                <th>Source</th>
                <th>Confirmed</th>
                {canRun ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r) => (
                <tr key={r._id} className={r.zeroTxn ? "flag" : ""}>
                  <td className="nowrap">{r.date}</td>
                  <td>
                    <strong>{r.atmId}</strong>
                  </td>
                  {meta.txnTypes.map((k) => (
                    <td key={k}>
                      {fmt(r[k + "Count"])} / ₹{fmt(r[k + "Amount"])}
                    </td>
                  ))}
                  <td>
                    {r.issuedIndent || ""}
                    {r.failedCount ? <div className="meta">{fmt(r.failedCount)} failed</div> : null}
                  </td>
                  <td>
                    <StatusBadge value={r.source} tone="none" />
                  </td>
                  <td>{r.confirmedAt ? <StatusBadge value="Confirmed" tone="good" /> : <StatusBadge value="Open" tone="warn" />}</td>
                  {canRun ? (
                    <td>
                      {r.locked && !isAdmin ? (
                        <span className="meta" title="EOD verified for this ATM-day">🔒</span>
                      ) : (
                        <button className="btn ghost" type="button" onClick={() => loadIntoForm(r, [...meta.txnTypes.flatMap((k) => [k + "Count", k + "Amount"]), "issuedIndent", "failedCount"])}>
                          ✎
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  function renderCbr1() {
    const rows = (data.cbr1 || {}).rows || [];
    return (
      <div className="card">
        <div className="toolbar">
          <DateFilter value={date} onChange={setDate} />
          <span className="spacer" />
          {newBtn("CBR 1 entry")}
        </div>
        <table>
          <thead>
            <tr>
              <th>Sr. No.</th>
              <th>ATM</th>
              <th>Indent</th>
              <th>EOD time</th>
              {meta.cbr1Cols.map((c) => (
                <th key={c}>{c} ₹</th>
              ))}
              <th>Total − WLACBR</th>
              <th>Source</th>
              {canRun ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.srNo}</td>
                <td>
                  <strong>{r.atmId}</strong>
                </td>
                <td>{r.indent}</td>
                <td>{r.eodTime}</td>
                {meta.cbr1Cols.map((c) => (
                  <td key={c}>{fmt(r.totals[c])}</td>
                ))}
                <td>{r.totals.wlacbrDiff ? "closing " + fmt(r.totals.wlacbrDiff.closing) : "—"}</td>
                <td>
                  <StatusBadge value={r.source} tone="none" />
                </td>
                {canRun ? <td>{rowEdit(r, ["denos", "side", "cra", "fr", "location", "bank", "indent", "eodTime", "remarks"])}</td> : null}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7 + meta.cbr1Cols.length} className="empty">
                  No CBR 1 rows for {date}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="meta">Totals = sum across denos 100–2000. Switch Counter is entered per deno as notes (amount computed). AQS and WLACBR rows are entered as amounts; the difference column compares the deno total against WLACBR.</p>
      </div>
    );
  }

  function renderCbr2() {
    const rows = (data.cbr2 || {}).rows || [];
    return (
      <div className="card">
        <div className="toolbar">
          <DateFilter value={date} onChange={setDate} />
          <span className="spacer" />
          {newBtn("CBR 2 entry")}
        </div>
        <table>
          <thead>
            <tr>
              <th>ATM</th>
              <th>MF</th>
              <th>Indent</th>
              {meta.cbr2Fields.map((k) => (
                <th key={k}>{humanize(k)}</th>
              ))}
              {canRun ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>
                  <strong>{r.atmId}</strong>
                </td>
                <td>{r.mfName}</td>
                <td>{r.indentNo}</td>
                {meta.cbr2Fields.map((k) => (
                  <td key={k}>{fmt(r[k])}</td>
                ))}
                {canRun ? <td>{rowEdit(r, ["mfName", "indentNo", "eodTime", "remarks", ...meta.cbr2Fields])}</td> : null}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4 + meta.cbr2Fields.length} className="empty">
                  No CBR 2 rows for {date}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  function renderFunding() {
    const res = data.funding || { rows: [] };
    function correct(r) {
      setFundType(r.type);
      loadIntoForm(r, r.type === "WLA" ? meta.wlaFields : meta.axisFields, "correct");
    }
    return (
      <div className="card">
        <div className="toolbar">
          <DateFilter value={date} onChange={setDate} />
          <span className="spacer" />
          {newBtn("Funding entry")}
        </div>
        <table>
          <thead>
            <tr>
              <th>ATM</th>
              <th>Type</th>
              <th>Apna last-day dispense</th>
              <th>Funding in</th>
              <th>Withdrawal / lots</th>
              <th>CBR loading</th>
              <th>Difference</th>
              {res.adminView ? <th>Calculation (Admin)</th> : canRun ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {res.rows.map((r) => (
              <tr key={r._id}>
                <td>
                  <strong>{r.atmId}</strong>
                </td>
                <td>
                  <StatusBadge value={r.type} tone={r.type === "WLA" ? "info" : r.type === "Axis" ? "warn" : "good"} />
                </td>
                <td>{fmt(r.lastDayDispenseApna)}</td>
                <td>{r.type === "WLA" ? fmt(r.openingWla) + " + " + fmt(r.fundHpy) + " → closing " + fmt(r.closingWla) : ""}</td>
                <td>{r.type === "WLA" ? fmt(r.withdrawal) : fmt(r.axisLot1) + " + " + fmt(r.axisLot2)}</td>
                <td>{fmt(r.loadingCbr)}</td>
                <td className={Number(r.loadingDiff) ? "err" : ""}>{fmt(r.loadingDiff)}</td>
                {res.adminView ? (
                  <td>
                    <div className="actions-cell">
                      <StatusBadge value={r.calcMismatch ? "Mismatch" : "OK"} tone={r.calcMismatch ? "bad" : "good"} />
                      <button className="btn warn" type="button" onClick={() => correct(r)}>
                        Correct
                      </button>
                    </div>
                    {r.adminCorrected ? <div className="meta">Corrected: {r.adminCorrected.reason}</div> : null}
                  </td>
                ) : canRun ? (
                  <td>
                    {r.locked ? (
                      <span className="meta" title="EOD verified for this ATM-day">🔒</span>
                    ) : (
                      <button className="btn ghost" type="button" onClick={() => (setFundType(r.type), loadIntoForm(r, r.type === "WLA" ? meta.wlaFields : meta.axisFields))}>
                        ✎
                      </button>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
            {!res.rows.length ? (
              <tr>
                <td colSpan={8} className="empty">
                  No funding rows for {date}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  function renderEod() {
    const rows = (data.eod || {}).rows || [];
    async function returnEod(r) {
      const reason = await askText("Why return to Executive?", "", { title: "Return EOD — " + r.atmId, required: true, multiline: true, okLabel: "Return" });
      if (reason) send("/api/ops/eod/" + r._id + "/verify", "POST", { returnToDraft: true, reason }, "EOD returned");
    }
    return (
      <div className="card">
        <div className="toolbar">
          <DateFilter value={date} onChange={setDate} />
          <span className="spacer" />
          {newBtn("EOD entry")}
        </div>
        <table>
          <thead>
            <tr>
              <th>ATM</th>
              <th>Status</th>
              <th>Opening</th>
              <th>Dispense machine / Apna</th>
              <th>Physical</th>
              <th>Overage</th>
              <th>Shortage</th>
              <th>Closing</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} {...rowProps(r)}>
                <td>
                  <strong>{r.atmId}</strong>
                </td>
                <td>
                  <StatusBadge value={r.status === "Verified" ? "Verified 🔒" : r.status} />
                  {r.status === "Draft" && r.returnReason ? <div className="err">Returned: {r.returnReason}</div> : null}
                  {r.adminCorrected ? <div className="meta">Admin corrected: {r.adminCorrected.reason}</div> : null}
                </td>
                <td>
                  {fmt(r.opening)}
                  {r.openingFromPreviousDay ? <div className="meta">from previous day</div> : null}
                  {r.openingMismatch ? <div className="err">≠ previous day closing</div> : null}
                </td>
                <td className={r.dispenseFlag ? "err" : ""}>
                  {fmt(r.dispenseMachine)} / {fmt(r.dispenseApna)}
                  {r.dispenseFlag ? <div>difference {fmt(r.dispenseDiff)}</div> : null}
                </td>
                <td>{fmt(r.physicalTotal)}</td>
                <td className={Number(r.overage) ? "ok" : ""}>
                  {fmt(r.overage)}
                  {Number(r.overage) ? (
                    <div>
                      <button className="btn ghost" type="button" onClick={() => openOn("Overage", { atmId: r.atmId, date: r.date, amount: r.overage })}>
                        + Deposit
                      </button>
                    </div>
                  ) : null}
                </td>
                <td className={Number(r.shortage) ? "err" : ""}>{fmt(r.shortage)}</td>
                <td>
                  <strong>{fmt(r.closing)}</strong>
                </td>
                <td>
                  <div className="actions-cell">
                    {canRun && r.status === "Draft" ? (
                      <>
                        <button className="btn ghost" type="button" onClick={() => loadIntoForm(r, EOD_FORM_FIELDS)}>
                          ✎ Edit
                        </button>
                        <button className="btn info" type="button" onClick={() => send("/api/ops/eod/" + r._id + "/submit", "POST", {}, "EOD submitted")}>
                          Submit
                        </button>
                      </>
                    ) : null}
                    {canDecide && r.status === "Submitted" ? (
                      <>
                        <button className="btn good" type="button" onClick={() => send("/api/ops/eod/" + r._id + "/verify", "POST", {}, "EOD verified; day locked")}>
                          ✓ Verify &amp; lock
                        </button>
                        <button className="btn warn" type="button" onClick={() => returnEod(r)}>
                          Return
                        </button>
                      </>
                    ) : null}
                    {isAdmin ? (
                      <button className="btn ghost" type="button" onClick={() => loadIntoForm(r, EOD_FORM_FIELDS, "correct")}>
                        Admin correct
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={9} className="empty">
                  No EOD rows for {date}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  function renderOverage() {
    const rows = (data.overage || {}).rows || [];
    async function attach(e, r) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const b64 = await fileToB64(file);
      send("/api/documents", "POST", { parentType: "overage", parentId: r._id, type: "Overage proof", fileName: file.name, mime: file.type, data: b64 }, "Proof attached");
    }
    async function downloadProof(id) {
      try {
        const d = await api("/api/documents/" + id + "/file");
        downloadB64(d.fileName, d.mime, d.data);
      } catch (err) {
        setError(err.message);
      }
    }
    return (
      <div className="card">
        <div className="toolbar">
          <span className="meta">Overage deposits and proofs.</span>
          <span className="spacer" />
          <button className="btn primary" type="button" onClick={openNew}>
            + Log deposit
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Deposit date</th>
              <th>ATM</th>
              <th>FR</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>UTR</th>
              <th>Email</th>
              <th>Proof</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td className="nowrap">{r.date}</td>
                <td>
                  <strong>{r.atmId}</strong>
                </td>
                <td>{r.frName}</td>
                <td>₹{fmt(r.amount)}</td>
                <td>{r.mode ? <StatusBadge value={r.mode} tone="info" /> : ""}</td>
                <td>{r.utr}</td>
                <td>{r.emailFlag ? <StatusBadge value="Sent" /> : ""}</td>
                <td>
                  <div className="actions-cell">
                    {(r.proofs || []).map((d) => (
                      <button key={d._id} className="btn ghost" type="button" onClick={() => downloadProof(d._id)}>
                        ⤓ v{d.version} {d.fileName}
                      </button>
                    ))}
                    <label className="btn ghost filebtn">
                      ⤒ Attach
                      <input type="file" onChange={(e) => attach(e, r)} />
                    </label>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="empty">
                  No deposits logged.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  function renderImports() {
    const batches = (data.imports || {}).batches || [];
    const headers = meta.templates[template] || [];
    async function upload(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const payload = { template, fileName: file.name };
      if (/\.xlsx$/i.test(file.name)) payload.xlsx = await fileToB64(file);
      else payload.csv = await file.text();
      try {
        const r = await api("/api/imports", { method: "POST", body: JSON.stringify({ ...payload, preview: true }) });
        setPending({ payload, preview: r.preview });
      } catch (err) {
        setError(err.message);
      }
    }
    async function confirmImport() {
      const r = await send("/api/imports", "POST", pending.payload, "Import finished");
      setPending(null);
      if (r) setLastBatch(r.batch);
    }
    async function original(id) {
      try {
        const r = await api("/api/imports/" + id + "/original");
        downloadB64(r.fileName, r.mime, r.data);
      } catch (err) {
        setError(err.message);
      }
    }
    async function errors(id) {
      try {
        const r = await api("/api/imports/" + id + "/errors");
        downloadText(r.fileName, r.csv);
      } catch (err) {
        setError(err.message);
      }
    }
    return (
      <>
        <div className="card">
          <h3>Import a CSV or Excel (.xlsx) file</h3>
          <div className="toolbar">
            <label className="inline">
              Template
              <select value={template} onChange={(e) => setTemplate(e.target.value)}>
                {Object.keys(meta.templates).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <button className="btn ghost" type="button" onClick={() => downloadText(template + "-template.csv", headers.join(",") + "\n")}>
              ⤓ Blank template
            </button>
            <span className="spacer" />
            {canRun ? (
              <label className="btn primary filebtn">
                ⤒ Choose file…
                <input type="file" accept=".csv,text/csv,.xlsx" onChange={upload} />
              </label>
            ) : (
              <span className="meta">Company-wide imports are Ops / Admin only.</span>
            )}
          </div>
          <p className="meta">
            Columns: {template === "TXN-grid" ? "atmId, metric, then one column per date (metric = cashCount, cashAmount, upiCount … issuedIndent)" : headers.join(", ")}
          </p>
          <p className="meta">Good rows are accepted and bad rows rejected. Re-importing the same company + ATM + date replaces the earlier value. Only this company's Cash Live ATMs are accepted.</p>
          {lastBatch ? (
            <p>
              <StatusBadge value={lastBatch.accepted + " accepted"} tone="good" /> <StatusBadge value={lastBatch.rejected + " rejected"} tone={lastBatch.rejected ? "bad" : "none"} />{" "}
              <span className="meta">
                {lastBatch.template} · {lastBatch.totalRows} rows
                {lastBatch.ignoredColumns && lastBatch.ignoredColumns.length ? " · ignored columns: " + lastBatch.ignoredColumns.join(", ") : ""}
              </span>
            </p>
          ) : null}
        </div>
        <div className="card">
          <h3>Import batches</h3>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Template</th>
                <th>File</th>
                <th>By</th>
                <th>Accepted</th>
                <th>Rejected</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b._id}>
                  <td className="nowrap">{new Date(b.at).toLocaleString("en-IN")}</td>
                  <td>{b.template}</td>
                  <td>{b.fileName}</td>
                  <td>{b.login}</td>
                  <td>
                    <StatusBadge value={b.accepted} tone="good" />
                  </td>
                  <td>
                    <StatusBadge value={b.rejected} tone={b.rejected ? "bad" : "none"} />
                  </td>
                  <td>
                    <div className="actions-cell">
                      {b.rejected ? (
                        <button className="btn warn" type="button" onClick={() => errors(b._id)}>
                          ⤓ Error file
                        </button>
                      ) : null}
                      {b.fileKind ? (
                        <button className="btn ghost" type="button" onClick={() => original(b._id)}>
                          ⤓ Original
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Modal
          open={!!pending}
          size="xl"
          title={"Import preview — " + ((pending && pending.payload.fileName) || "")}
          subtitle={
            pending
              ? pending.preview.totalRows +
                " data rows" +
                (pending.preview.replaces ? " · replaces " + pending.preview.replaces + " existing row(s)" : "") +
                (pending.preview.ignoredColumns && pending.preview.ignoredColumns.length ? " · ignored columns: " + pending.preview.ignoredColumns.join(", ") : "") +
                " · " +
                pending.preview.rule
              : ""
          }
          onClose={() => !busy && setPending(null)}
          footer={
            <>
              <button className="btn ghost" type="button" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button className="btn good" type="button" disabled={busy} onClick={confirmImport}>
                {busy ? "Importing…" : "Confirm import"}
              </button>
            </>
          }
        >
          {pending ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {pending.preview.header.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending.preview.sample.map((r, i) => (
                    <tr key={i}>
                      {pending.preview.header.map((h, j) => (
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

  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {!atms.length ? <p className="offline">No Cash Live ATMs in your scope yet. An ATM becomes available here when its project reaches Cash Live.</p> : null}
      {tab === "Day board" && renderDay()}
      {tab === "TXN" && renderTxn()}
      {tab === "TXN" && canRun && data.txn && (data.txn.rows || []).length ? (
        <ExtraColumns register="txn" rows={data.txn.rows} rowLabel={(r) => r.atmId + " · " + r.date} office={canRun} admin={isAdmin} setError={setError} setNotice={setNotice} onReload={load} />
      ) : null}
      {tab === "CBR 1" && renderCbr1()}
      {tab === "CBR 2" && renderCbr2()}
      {tab === "Funding" && renderFunding()}
      {tab === "EOD" && renderEod()}
      {tab === "Overage" && renderOverage()}
      {tab === "Imports" && renderImports()}

      <Modal
        open={!!entry && !!entryBody}
        size={tab === "CBR 1" || tab === "EOD" ? "xl" : "lg"}
        title={(entry && entry.mode === "correct" ? "Admin correction — " : entry && entry.mode === "edit" ? "Edit — " : "") + (ENTRY_TITLE[tab] || "")}
        subtitle={editing ? f.atmId + " · " + f.date : ""}
        onClose={() => !busy && setEntry(null)}
        footer={entryFooter()}
      >
        {entryBody ? entryBody() : null}
      </Modal>
    </>
  );
}
