import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { COLORS } from "../../components/common/Chart.jsx";
import { api } from "../../services/api.js";
import { setFocus, takeFocus } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";

const SKIP = new Set(["_id", "companyId", "franchiseId", "parentId", "createdBy", "updatedBy", "__v", "data", "history", "projectIds", "payoutAccount"]);
const PREFER = {
  sites: ["siteId", "locationName", "city", "state", "siteType", "status"],
  atms: ["atmId", "atmSerialNumber", "model", "city", "state", "cashLiveDate", "status"],
  applications: ["siteLocationName", "applicantName", "city", "model", "status", "createdAt"],
  documents: ["type", "fileName", "version", "verificationStatus", "verifiedAt", "createdAt"],
  lois: ["loiCode", "siteName", "city", "status", "issuedAt", "createdAt"],
  agreements: ["agreementNo", "type", "status", "signedAt", "validTill", "createdAt"],
  complaints: ["docketNumber", "atmId", "problemType", "priority", "status", "createdAt"],
  projects: ["projectName", "atmId", "status", "currentStage", "stageDue", "progress", "techLiveDate", "cashLiveDate", "heldReason"],
  txnSummary: ["atmId", "status", "lastEntry", "daysEntered30", "txnCount30", "avgDailyCount", "amount30", "mtdCount", "mtdAmount", "zeroDays30"],
  communications: ["date", "way", "subject", "from", "to", "docketNumber", "status", "auto"],
  securityDeposits: ["label", "amountDue", "received", "balance", "status"],
  payments: ["kind", "amount", "txnNumber", "paidAt", "status"],
  gstBills: ["billNo", "month", "net", "status", "pendingAt"],
  payouts: ["month", "amount", "netAmount", "status"],
  chargebacks: ["atmId", "tlfRrn", "disputeAmount", "complaintDate", "status"],
  bankStatements: ["month", "atmId", "financeStatus", "financeRemark"],
  tdsLetters: ["fy", "quarter", "createdAt"],
  payoutAccounts: ["bank", "accountHolder", "accountNumber", "ifsc", "status"],
};
const LABEL = {
  sites: "Sites",
  atms: "ATMs",
  applications: "Applications",
  documents: "Documents",
  lois: "LOIs",
  agreements: "Agreements",
  complaints: "Complaints",
  projects: "Projects",
  txnSummary: "TXN summary",
  communications: "Communication",
  securityDeposits: "Security deposits",
  payments: "Payments",
  gstBills: "GST bills",
  payouts: "Payouts",
  chargebacks: "Charge-backs",
  bankStatements: "Bank statements",
  tdsLetters: "TDS",
  payoutAccounts: "Payout accounts",
};
const FIN_TAB = {
  securityDeposits: "Security deposit",
  payments: "Payments",
  gstBills: "GST bills",
  payouts: "Payouts",
  chargebacks: "Charge-back",
  bankStatements: "Bank statements",
  tdsLetters: "TDS",
  payoutAccounts: "Payout accounts",
};
const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fyOfMonth = (m) => {
  if (!/^\d{4}-\d{2}/.test(m || "")) return undefined;
  const y = Number(m.slice(0, 4));
  const start = Number(m.slice(5, 7)) >= 4 ? y : y - 1;
  return start + "-" + String(start + 1).slice(2);
};

// Where a 360 row opens; null when no page can focus that record.
function linkFor(section, r) {
  const id = String(r._id);
  if (section === "applications") return { page: "applications", id };
  if (section === "lois" || section === "agreements") return { page: "legal", id };
  if (section === "complaints") return { page: "service", id };
  if (section === "communications") return r.complaintId ? { page: "service", id: String(r.complaintId) } : null;
  if (FIN_TAB[section]) {
    const month = r.month || (r.paidAt ? new Date(r.paidAt).toISOString().slice(0, 7) : "");
    return { page: "finance", type: FIN_TAB[section], id, fy: r.fy || fyOfMonth(month) };
  }
  return null;
}

function show(v, k) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (/(At|Date|Till)$/.test(k) && !Number.isNaN(Date.parse(v))) return new Date(v).toLocaleDateString("en-IN");
  if (/^(amount|amountDue|received|balance|net|netAmount|disputeAmount|amount30|mtdAmount)$/.test(k) && typeof v === "number") return inr(v);
  if (typeof v === "number") return v.toLocaleString("en-IN");
  if (k === "date" && !Number.isNaN(Date.parse(v))) return new Date(v).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
  if (typeof v === "object") return Array.isArray(v) ? v.filter((x) => typeof x !== "object").join(", ") : "";
  return String(v);
}

function AutoTable({ rows, prefer, onOpen, canOpenRow = () => true }) {
  if (!rows.length) return <p className="empty">Nothing on record.</p>;
  let cols = prefer.filter((k) => rows.some((r) => r[k] !== undefined && r[k] !== ""));
  if (cols.length < 3) {
    const extra = Object.keys(rows[0]).filter((k) => !SKIP.has(k) && !cols.includes(k) && typeof rows[0][k] !== "object");
    cols = cols.concat(extra).slice(0, 7);
  }
  return (
    <table className="stack">
      <thead>
        <tr>
          {cols.map((k) => (
            <th key={k}>{humanize(k)}</th>
          ))}
          {onOpen ? <th></th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r._id || i}>
            {cols.map((k, j) => {
              const v = show(r[k], k);
              return (
                <td key={k} data-label={humanize(k)}>
                  {/status|stage|result/i.test(k) && v ? <StatusBadge value={v} /> : j === 0 ? <strong>{v}</strong> : v}
                </td>
              );
            })}
            {onOpen ? (
              <td>
                {canOpenRow(r) ? (
                  <button className="btn ghost" type="button" onClick={() => onOpen(r)}>
                    Open ›
                  </button>
                ) : null}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Franchise360Page({ user, franchises, setPage, allowedPages = [], setError }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const want = useRef("");

  async function open(id) {
    want.current = id;
    setSel(id);
    setLoading(true);
    try {
      const d = await api("/api/franchise-360/" + id);
      if (want.current !== id) return;
      setData(d);
      setTab("profile");
    } catch (err) {
      if (want.current === id) {
        setData(null);
        setError(err.message);
      }
    } finally {
      if (want.current === id) setLoading(false);
    }
  }

  useEffect(() => {
    const link = takeFocus("fr360");
    if (link && link.id) open(link.id);
    else if (!sel && franchises.length === 1) open(franchises[0]._id);
  }, []);

  function openRow(section, r) {
    const link = linkFor(section, r);
    if (!link) return;
    if (!allowedPages.includes(link.page)) return setError("You don't have access to the " + humanize(link.page) + " page.");
    setFocus(link);
    setPage(link.page);
  }

  const list = franchises.filter((f) => !q || [f.name, f.layer, f.city, f.code].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()));
  const fr = data && data.franchise;
  const sections = (data && data.sections) || [];
  const profile = fr ? Object.entries(fr).filter(([k, v]) => !SKIP.has(k) && show(v, k) !== "") : [];
  const m = data && data.money;
  const franchiseUser = ["Franchise", "MasterFranchise", "SuperMasterFranchise"].includes(user.hierarchy);

  return (
    <div className="split">
      <div className="card">
        <h3>Franchises</h3>
        <input placeholder="Search name, layer, city" value={q} onChange={(e) => setQ(e.target.value)} />
        <p className="meta">{franchiseUser ? "Your own node, or your network for Super Master / Master." : "Every node in your scope."}</p>
        <div style={{ maxHeight: "65vh", overflow: "auto" }}>
          <table>
            <tbody>
              {list.map((f) => (
                <tr key={f._id} className={sel === f._id ? "unread" : ""} style={{ cursor: "pointer" }} onClick={() => open(f._id)}>
                  <td>
                    <strong>{f.name}</strong>
                    {f.city ? <div className="meta">{f.city}</div> : null}
                  </td>
                  <td>
                    <StatusBadge value={humanize(f.layer)} tone="info" />
                    {f.status && f.status !== "Active" ? <StatusBadge value={f.status} /> : null}
                  </td>
                </tr>
              ))}
              {!list.length ? (
                <tr>
                  <td className="empty">No franchises.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sensitive">
        {!fr ? (
          <div className="card empty">{loading ? "Loading…" : "Pick a franchise on the left to see its full picture."}</div>
        ) : (
          <>
            <div className="card">
              <h3>
                {fr.name} <StatusBadge value={humanize(fr.layer)} tone="info" /> {fr.status ? <StatusBadge value={fr.status} /> : null}
                {fr.kycStatus ? <StatusBadge value={"KYC " + fr.kycStatus} tone={fr.kycStatus === "Verified" ? "good" : fr.kycStatus === "Rejected" ? "bad" : "warn"} /> : null}
                {loading ? <span className="meta"> refreshing…</span> : null}
              </h3>
              <p className="meta">{[fr.ownerName, fr.mobile, fr.email, fr.city, fr.state].filter(Boolean).join(" · ")}</p>
              {m ? (
                <div className="chips">
                  <StatusBadge value={"SD due " + inr(m.sdDue) + " · balance " + inr(m.sdBalance)} tone={m.sdBalance > 0 ? "warn" : "good"} />
                  {m.paymentsPending ? <StatusBadge value={m.paymentsPending + " payment(s) in process"} tone="info" /> : null}
                  {m.gstOpen ? <StatusBadge value={m.gstOpen + " GST bill(s) open"} tone="warn" /> : null}
                  <StatusBadge value={"Payouts paid " + inr(m.payoutsPaid)} tone="info" />
                  {m.cbOpen ? <StatusBadge value={m.cbOpen + " charge-back(s) open"} tone="bad" /> : null}
                  {m.bsQuery ? <StatusBadge value={m.bsQuery + " bank statement(s) under query"} tone="bad" /> : null}
                </div>
              ) : null}
            </div>
            <div className="kpis">
              {sections.map((k, i) => (
                <button key={k} type="button" className="kpi" style={{ "--k": COLORS[i % COLORS.length], cursor: "pointer", textAlign: "left" }} onClick={() => setTab(k)}>
                  <div className="l">{LABEL[k] || humanize(k)}</div>
                  <div className="v">{(data[k] || []).length}</div>
                </button>
              ))}
            </div>
            <div className="card">
              <Tabs tabs={[["profile", "Profile"], ...sections.map((k) => [k, LABEL[k] || humanize(k), (data[k] || []).length])]} value={tab} onChange={setTab} />
              {tab === "profile" ? (
                <div className="grid2">
                  {profile.map(([k, v]) => (
                    <div key={k}>
                      <div className="meta">{humanize(k)}</div>
                      <div>{/status/i.test(k) ? <StatusBadge value={show(v, k)} /> : show(v, k)}</div>
                    </div>
                  ))}
                  {fr.payoutAccount ? (
                    <div>
                      <div className="meta">Verified payout account</div>
                      <div>{[fr.payoutAccount.bank, fr.payoutAccount.accountNumber, fr.payoutAccount.ifsc].filter(Boolean).join(" · ")}</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <AutoTable
                  rows={data[tab] || []}
                  prefer={PREFER[tab] || []}
                  onOpen={(data[tab] || []).some((r) => linkFor(tab, r) && allowedPages.includes(linkFor(tab, r).page)) ? (r) => openRow(tab, r) : null}
                  canOpenRow={(r) => !!linkFor(tab, r)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
