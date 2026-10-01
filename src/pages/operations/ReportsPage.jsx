import { useEffect, useState } from "react";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { StepNav, Steps } from "../../components/common/StepForm.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api, downloadB64 } from "../../services/api.js";
import { csvToB64, printReport } from "../../utils/report.js";

const TABS = [
  ["cbr1", "CBR 1"],
  ["cbr2", "CBR 2"],
  ["cbr3-wla", "CBR 3 WLA"],
  ["cbr3-axis", "CBR 3 Axis"],
  ["overage", "Overage Deposit"],
  ["ffm-eod", "FFM EOD"],
  ["sf-loading", "SF Loading"],
  ["mobile-app", "Mobile APP"],
  ["mobile-loading", "Mobile daily loading"],
  ["dlr2", "DLR 2"],
  ["dlr3", "DLR 3"],
  ["monthly", "Monthly inputs"],
];
const LOADING_BLOCKS = [
  ["withdrawalNotes", "Withdrawal denominations (must equal withdrawal)"],
  ["rejectNotes", "Reject bin"],
  ["cassetteNotes", "Cassette"],
  ["loadingNotes", "Total loading cash"],
];
const LOADING_STEPS = [
  { key: "funds", label: "Funds", hint: "ATM, date, amounts" },
  { key: "withdrawal", label: "Withdrawal & reject bin" },
  { key: "cassette", label: "Cassette & loading" },
  { key: "closing", label: "Closing", hint: "WLA balance" },
];

function fmt(v) {
  if (v === null || v === undefined) return "";
  return typeof v === "number" ? v.toLocaleString("en-IN") : String(v);
}

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function Notes({ label, denos, value, onChange }) {
  return (
    <div className="section">
      <h4>{label}</h4>
      <div className="grid5">
        {denos.map((d) => (
          <label key={d}>
            ₹{d} ×
            <input type="number" min="0" value={(value || {})[d] || ""} onChange={(e) => onChange({ ...(value || {}), [d]: e.target.value })} />
          </label>
        ))}
      </div>
    </div>
  );
}

export function ReportsPage({ user, atms, setError, setNotice }) {
  const franchiseUser = ["Franchise", "MasterFranchise", "SuperMasterFranchise"].includes(user.hierarchy);
  const [tab, setTab] = useState("ffm-eod");
  const [meta, setMeta] = useState({ models: [], denos: [], month: "" });
  const [month, setMonth] = useState("");
  const [atmId, setAtmId] = useState("");
  const [lang, setLang] = useState(franchiseUser ? "hi" : "en");
  const [report, setReport] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [f, setF] = useState({});
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [options, setOptions] = useState({ franchises: [], salesOfficers: [], banks: [], fundingPaths: [], regions: [], cras: [] });
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [corr, setCorr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setFilter = (k, v) => setFilters((x) => ({ ...x, [k]: v }));
  const liveAtms = atms.filter((a) => a.cashLiveDate);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  async function load() {
    try {
      const m = meta.month ? meta : await api("/api/reports/meta");
      if (!meta.month) setMeta(m);
      const mo = month || m.month;
      if (!month) setMonth(mo);
      if (tab === "monthly") {
        setMonthly((await api("/api/reports/monthly?month=" + mo)).rows);
        setReport(null);
      } else setReport(await api("/api/reports/view/" + tab + "?month=" + mo + query()));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [tab, month, atmId, filters]);

  useEffect(() => {
    api("/api/reports/filters")
      .then(setOptions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setF({});
    setFormOpen(false);
  }, [tab]);

  async function send(path, method, body, ok) {
    setBusy(true);
    try {
      const r = await api(path, { method, body: JSON.stringify(body) });
      setNotice(ok);
      await load();
      return r || {};
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function query() {
    const q = { atmId, ...filters };
    return Object.entries(q)
      .filter(([, v]) => v)
      .map(([k, v]) => "&" + k + "=" + encodeURIComponent(v))
      .join("");
  }

  async function download(kind) {
    try {
      const r = await api("/api/reports/view/" + tab + "?" + kind + "=1&month=" + month + query());
      if (kind === "xlsx") downloadB64(r.fileName, r.mime, r.data);
      else downloadB64(r.fileName, "text/csv", csvToB64(r.csv));
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveCorrection() {
    const r = corr.row;
    const body = { reason: corr.reason };
    if (corr.withdrawal !== "" && Number(corr.withdrawal) !== r.withdrawal) {
      const notes = {};
      for (const m of String(corr.deno).matchAll(/(\d+)\s*[×xX:*]\s*(\d+)/g)) notes[m[1]] = Number(m[2]);
      body.withdrawal = corr.withdrawal;
      body.withdrawalNotes = notes;
    }
    if (await send("/api/reports/loading/" + r._id + "/correct", "PATCH", body, "Loading corrected")) setCorr(null);
  }

  const label = (col) => (lang === "hi" && col.hi ? col.hi : lang === "both" && col.hi ? col.en + " / " + col.hi : col.en);
  const statusCol = (key) => /status|eod$|result/i.test(key);

  function table() {
    if (!report) return null;
    const canCorrect = tab === "mobile-loading" && meta.admin;
    return (
      <div className="card print-area table-scroll">
        <h3>{report.title}</h3>
        {report.note ? <p className="meta">{report.note}</p> : null}
        <table>
          <thead>
            <tr>
              {report.columns.map((col) => (
                <th key={col.key}>{label(col)}</th>
              ))}
              {canCorrect ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r, i) => (
              <tr key={i} className={r.deno === "Total=" ? "total" : ""}>
                {report.columns.map((col) => (
                  <td key={col.key}>{statusCol(col.key) && typeof r[col.key] === "string" ? <StatusBadge value={r[col.key]} /> : fmt(r[col.key])}</td>
                ))}
                {canCorrect ? (
                  <td>
                    <button className="btn warn" type="button" onClick={() => setCorr({ row: r, reason: "", withdrawal: r.withdrawal == null ? "" : String(r.withdrawal), deno: r.withdrawalDeno || "" })}>
                      Admin correct
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {!report.rows.length ? <p className="empty">No data for this month.</p> : null}
      </div>
    );
  }

  function mobileCards() {
    if (!report) return null;
    return (
      <div className="print-area">
        <p className="meta">{report.title}</p>
        <div className="kpis">
          {report.rows.map((r) => (
            <div className="card" key={r.atmId}>
              <table>
                <tbody>
                  {report.columns.map((col) => (
                    <tr key={col.key}>
                      <th>{label(col)}</th>
                      <td>{fmt(r[col.key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const atmSelect = (
    <label>
      ATM ID *
      <select value={f.atmId || ""} onChange={(e) => set("atmId", e.target.value)}>
        <option value="">—</option>
        {liveAtms.map((a) => (
          <option key={a.atmId} value={a.atmId}>
            {a.atmId}
          </option>
        ))}
      </select>
    </label>
  );

  function loadingModal() {
    const denos = meta.denos.filter((d) => d <= 500);
    const total = (m) => denos.reduce((s, d) => s + (Number((m || {})[d]) || 0) * d, 0);
    const block = ([k, t]) => <Notes key={k} label={t + " — ₹" + fmt(total(f[k]))} denos={denos} value={f[k]} onChange={(v) => set(k, v)} />;
    return (
      <Modal
        open={formOpen}
        size="lg"
        title="Daily loading status"
        onClose={() => !busy && setFormOpen(false)}
        footer={
          <StepNav current={step} total={LOADING_STEPS.length} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)}>
            <button
              className="btn good"
              type="button"
              disabled={busy || !f.atmId}
              onClick={async () => {
                const r = await send("/api/reports/loading", "PUT", { ...f, date: f.date || localToday() }, "Daily loading saved");
                if (r) setFormOpen(false);
              }}
            >
              {busy ? "Saving…" : "Save loading"}
            </button>
          </StepNav>
        }
      >
        <Steps steps={LOADING_STEPS} current={step} onPick={setStep} />
        {step === 0 ? (
          <div className="grid2">
            {atmSelect}
            <label>
              Date
              <input type="date" value={f.date || localToday()} max={localToday()} onChange={(e) => set("date", e.target.value)} />
            </label>
            <label>
              Last Day Fund (blank = previous day's closing)
              <input type="number" value={f.lastDayFund || ""} onChange={(e) => set("lastDayFund", e.target.value)} />
            </label>
            <label>
              HPY Given Fund
              <input type="number" value={f.hpyFund || ""} onChange={(e) => set("hpyFund", e.target.value)} />
            </label>
            <label>
              Bank Indent / Withdrawal Fund
              <input type="number" value={f.withdrawal || ""} onChange={(e) => set("withdrawal", e.target.value)} />
            </label>
          </div>
        ) : null}
        {step === 1 ? LOADING_BLOCKS.slice(0, 2).map(block) : null}
        {step === 2 ? LOADING_BLOCKS.slice(2).map(block) : null}
        {step === 3 ? (
          <div className="grid2">
            <label>
              WLA Account Closing Balance
              <input type="number" value={f.wlaClosing || ""} onChange={(e) => set("wlaClosing", e.target.value)} />
            </label>
            <label>
              Remark
              <input value={f.remarks || ""} onChange={(e) => set("remarks", e.target.value)} />
            </label>
          </div>
        ) : null}
      </Modal>
    );
  }

  function monthlyModal() {
    return (
      <Modal
        open={formOpen}
        title={"Monthly figures — " + month}
        subtitle='Bulk: Daily ops → Imports, template "monthly-atm" (Company + ATM ID + month).'
        onClose={() => !busy && setFormOpen(false)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button
              className="btn good"
              type="button"
              disabled={busy || !f.atmId}
              onClick={async () => {
                const r = await send("/api/reports/monthly", "PUT", { ...f, month }, "Monthly figures saved");
                if (r) setFormOpen(false);
              }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="grid2">
          {atmSelect}
          <label>
            Funding model
            <select value={f.fundingModel || ""} onChange={(e) => set("fundingModel", e.target.value)}>
              <option value="">(keep)</option>
              {meta.models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          {[
            ["dmsBalance", "Machine balance as per DMS @11:00 PM (month end)"],
            ["selfFund", "Self cash loading fund (SF)"],
            ["monthlyAdditional", "Monthly additional loading fund (SF)"],
            ["weeklyAdditional", "Weekly additional loading fund (SF)"],
          ].map(([k, t]) => (
            <label key={k}>
              {t}
              <input type="number" value={f[k] || ""} onChange={(e) => set(k, e.target.value)} />
            </label>
          ))}
          <label className="span-all">
            Remark
            <input value={f.remarks || ""} onChange={(e) => set("remarks", e.target.value)} />
          </label>
        </div>
      </Modal>
    );
  }

  function monthlyTab() {
    return (
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ATM ID</th>
              <th>FR</th>
              <th>Model</th>
              <th>DMS balance</th>
              <th>Self</th>
              <th>Monthly add.</th>
              <th>Weekly add.</th>
              <th>Total funding</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((r) => (
              <tr key={r._id}>
                <td>
                  <strong>{r.atmId}</strong>
                </td>
                <td>{r.franchiseeName}</td>
                <td>{r.fundingModel ? <StatusBadge value={r.fundingModel} tone="info" /> : ""}</td>
                <td>{fmt(r.dmsBalance)}</td>
                <td>{fmt(r.selfFund)}</td>
                <td>{fmt(r.monthlyAdditional)}</td>
                <td>{fmt(r.weeklyAdditional)}</td>
                <td>
                  <strong>{fmt(r.totalFunding)}</strong>
                </td>
                <td>
                  <StatusBadge value={r.source} tone="none" />
                </td>
              </tr>
            ))}
            {!monthly.length ? (
              <tr>
                <td colSpan={9} className="empty">
                  No monthly figures for {month}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  const canAdd = (tab === "mobile-loading" && meta.canLoad) || (tab === "monthly" && meta.canMonthly);

  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="toolbar">
        <label className="inline">
          Month
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        {tab !== "monthly" ? (
          <>
            <label className="inline">
              ATM
              <select value={atmId} onChange={(e) => setAtmId(e.target.value)}>
                <option value="">All</option>
                {liveAtms.map((a) => (
                  <option key={a.atmId} value={a.atmId}>
                    {a.atmId}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline">
              Headers
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="both">Both</option>
              </select>
            </label>
            <button className={"btn " + (showFilters ? "primary" : "ghost")} type="button" onClick={() => setShowFilters(!showFilters)}>
              ⚲ Filters{activeFilters ? " (" + activeFilters + ")" : ""}
            </button>
          </>
        ) : null}
        <span className="spacer" />
        {tab !== "monthly" ? (
          <>
            {meta.canExport ? (
              <>
                <button className="btn ghost" type="button" onClick={() => download("csv")}>
                  ⤓ CSV
                </button>
                <button className="btn ghost" type="button" onClick={() => download("xlsx")}>
                  ⤓ Excel
                </button>
              </>
            ) : null}
            <button className="btn ghost" type="button" onClick={printReport}>
              ⎙ Print / PDF
            </button>
          </>
        ) : null}
        {canAdd ? (
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setF({});
              setStep(0);
              setFormOpen(true);
            }}
          >
            + {tab === "monthly" ? "Monthly figures" : "Daily loading"}
          </button>
        ) : null}
      </div>
      {tab !== "monthly" && showFilters ? (
        <div className="card">
          <div className="grid3">
            <label>
              From
              <input type="date" value={filters.from || ""} onChange={(e) => setFilter("from", e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={filters.to || ""} onChange={(e) => setFilter("to", e.target.value)} />
            </label>
            {!franchiseUser ? (
              <label>
                FR
                <select value={filters.franchiseId || ""} onChange={(e) => setFilter("franchiseId", e.target.value)}>
                  <option value="">All</option>
                  {options.franchises.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {[
              ["salesOfficer", "Sales Officer", options.salesOfficers],
              ["cra", "CRA", options.cras],
              ["bank", "Bank", options.banks],
              ["fundingPath", "Funding path", options.fundingPaths],
              ["region", "Region", options.regions],
            ].map(([k, l, list]) => (
              <label key={k}>
                {l}
                <select value={filters[k] || ""} onChange={(e) => setFilter(k, e.target.value)}>
                  <option value="">All</option>
                  {(list || []).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {activeFilters ? (
            <button className="btn ghost" type="button" onClick={() => setFilters({})}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
      {tab === "monthly" ? monthlyTab() : null}
      {tab === "mobile-app" ? mobileCards() : tab !== "monthly" ? table() : null}
      {tab === "mobile-loading" ? loadingModal() : null}
      {tab === "monthly" ? monthlyModal() : null}

      <Modal
        open={!!corr}
        title={"Admin correction — " + ((corr && corr.row.atmId) || "")}
        onClose={() => !busy && setCorr(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setCorr(null)}>
              Cancel
            </button>
            <button className="btn warn" type="button" disabled={busy || !corr || !corr.reason.trim()} onClick={saveCorrection}>
              Apply correction
            </button>
          </>
        }
      >
        {corr ? (
          <>
            <label>
              Correction reason *
              <textarea value={corr.reason} onChange={(e) => setCorr({ ...corr, reason: e.target.value })} />
            </label>
            <div className="grid2">
              <label>
                Withdrawal amount
                <input type="number" value={corr.withdrawal} onChange={(e) => setCorr({ ...corr, withdrawal: e.target.value })} />
              </label>
              <label>
                Withdrawal notes (e.g. 500×20, 100×10)
                <input value={corr.deno} onChange={(e) => setCorr({ ...corr, deno: e.target.value })} />
              </label>
            </div>
            <p className="meta">Notes are only sent when the withdrawal amount changes.</p>
          </>
        ) : null}
      </Modal>
    </>
  );
}
