import { useEffect, useState } from "react";
import { askConfirm, askText } from "../../components/common/Dialogs.jsx";
import { Modal } from "../../components/common/Modal.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api } from "../../services/api.js";
import { humanize } from "../../utils/format.js";

function MyMfa({ setError, setNotice }) {
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState(null);

  async function load() {
    try {
      setStatus(await api("/api/auth/mfa/status"));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function run(fn, msg) {
    setError("");
    try {
      await fn();
      if (msg) setNotice(msg);
      setCode("");
      load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function createCodes() {
    if (status.recoveryLeft && !(await askConfirm("This replaces your existing recovery codes. Continue?", { okLabel: "Replace codes" }))) return;
    let body = {};
    if (status.totpEnabled) {
      const current = await askText("Current 6-digit code from your authenticator app", "", { title: "Confirm with authenticator", required: true, okLabel: "Create codes" });
      if (!current) return;
      body = { code: current };
    }
    run(async () => setCodes(await api("/api/auth/recovery-codes", { method: "POST", body: JSON.stringify(body) })), "New recovery codes created");
  }

  if (!status) return <div className="card">Loading…</div>;
  return (
    <>
      <div className="kpis">
        <div className="kpi" style={{ "--k": status.mfaRequired ? "#059669" : "#d97706" }}>
          <div className="l">MFA at login</div>
          <div>{status.mfaRequired ? "Required" : "Not required for you"}</div>
        </div>
        <div className="kpi" style={{ "--k": status.totpEnabled ? "#059669" : "#2563eb" }}>
          <div className="l">Second factor</div>
          <div>{status.totpEnabled ? "Authenticator app" : "One-time code (" + status.channel + ")"}</div>
        </div>
        <div className="kpi" style={{ "--k": status.recoveryLeft ? "#7c3aed" : "#e11d48" }}>
          <div className="l">Recovery codes left</div>
          <div className="v">{status.recoveryLeft}</div>
          {status.recoveryExpires ? <div className="meta">expire {String(status.recoveryExpires).slice(0, 10)}</div> : null}
        </div>
      </div>
      <div className="card">
        <h3>
          Authenticator app <StatusBadge value={status.totpEnabled ? "On" : "Off"} tone={status.totpEnabled ? "good" : "none"} />
        </h3>
        {!status.totpEnabled && !setup ? (
          <button className="btn primary" type="button" onClick={() => run(async () => setSetup(await api("/api/auth/totp/setup", { method: "POST" })))}>
            Set up authenticator app
          </button>
        ) : null}
        {status.totpEnabled ? (
          <div className="toolbar">
            <input placeholder="current 6-digit code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" style={{ width: 180 }} />
            <button className="btn bad" type="button" disabled={!code.trim()} onClick={() => run(() => api("/api/auth/totp/disable", { method: "POST", body: JSON.stringify({ code }) }), "Authenticator app removed")}>
              Turn off authenticator
            </button>
          </div>
        ) : null}
      </div>
      <div className="card">
        <h3>Recovery codes</h3>
        <p className="meta">One-time codes to sign in when your second factor is not available.</p>
        <button className="btn warn" type="button" onClick={createCodes}>
          ⟳ Create recovery codes
        </button>
      </div>

      <Modal
        open={!!setup && !status.totpEnabled}
        size="md"
        title="Set up authenticator app"
        subtitle="Google Authenticator, Microsoft Authenticator or any TOTP app"
        onClose={() => setSetup(null)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setSetup(null)}>
              Cancel
            </button>
            <button
              className="btn good"
              type="button"
              disabled={!code.trim()}
              onClick={() =>
                run(async () => {
                  await api("/api/auth/totp/enable", { method: "POST", body: JSON.stringify({ code }) });
                  setSetup(null);
                }, "Authenticator app is now your second factor")
              }
            >
              Confirm and turn on
            </button>
          </>
        }
      >
        {setup ? (
          <>
            <div className="section">
              <h4>1 · Add this key in the app</h4>
              <p>
                Setup key: <code>{setup.key}</code>
              </p>
              <p className="meta" style={{ wordBreak: "break-all" }}>
                {setup.uri}
              </p>
            </div>
            <div className="section">
              <h4>2 · Enter the code it shows</h4>
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="6-digit code" />
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={!!codes}
        size="sm"
        title="Your recovery codes"
        subtitle={codes ? "Each works once; they expire " + String(codes.expiresAt).slice(0, 10) + ". They will not be shown again." : ""}
        onClose={() => {}}
        footer={
          <button className="btn good" type="button" onClick={() => setCodes(null)}>
            I have saved them
          </button>
        }
      >
        {codes ? <pre style={{ fontSize: 14, letterSpacing: 1 }}>{codes.codes.join("\n")}</pre> : null}
      </Modal>
    </>
  );
}

function CompanyPolicy({ user, setError, setNotice }) {
  const [company, setCompany] = useState(null);
  useEffect(() => {
    api("/api/companies")
      .then((d) => setCompany((d.companies || []).find((c) => c._id === user.companyId) || null))
      .catch((err) => setError(err.message));
  }, [user.companyId]);
  if (!company) return <div className="card empty">Company not found.</div>;
  async function toggle(v) {
    try {
      await api("/api/companies/" + company._id + "/security", { method: "PATCH", body: JSON.stringify({ mfaRelaxFranchise: v }) });
      setCompany({ ...company, mfaRelaxFranchise: v });
      setNotice(v ? "Franchise users now sign in with password only" : "MFA required again for franchise users");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div className="card">
      <h3>Company sign-in policy — {company.name}</h3>
      <div className="chips">
        <StatusBadge value="Office staff: MFA always" tone="good" />
        <StatusBadge value={"Franchise users: " + (company.mfaRelaxFranchise ? "password only" : "MFA")} tone={company.mfaRelaxFranchise ? "warn" : "good"} />
      </div>
      <label className="check" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={!!company.mfaRelaxFranchise} onChange={(e) => toggle(e.target.checked)} /> Relax MFA for franchise users only (office staff always keep MFA)
      </label>
    </div>
  );
}

function NoticeRules({ setError, setNotice }) {
  const [data, setData] = useState(null);
  const [sweeping, setSweeping] = useState(false);
  useEffect(() => {
    api("/api/notices/settings").then(setData).catch((err) => setError(err.message));
  }, []);
  if (!data) return null;
  async function sweep() {
    setSweeping(true);
    try {
      const r = await api("/api/system/sweep", { method: "POST", body: "{}" });
      const counts = Object.entries(r || {}).filter(([, v]) => typeof v === "number" && v > 0);
      setNotice("Reminder run finished" + (counts.length ? ": " + counts.map(([k, v]) => v + " " + humanize(k)).join(", ") : " — nothing new to send"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSweeping(false);
    }
  }
  function change(kind, patch) {
    setData({ ...data, settings: { ...data.settings, [kind]: { ...data.settings[kind], ...patch } } });
  }
  async function save() {
    try {
      const r = await api("/api/notices/settings", { method: "PATCH", body: JSON.stringify({ settings: data.settings }) });
      setData({ ...data, settings: r.settings });
      setNotice("Notice rules saved");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div className="card">
      <div className="toolbar">
        <span className="meta">Which events create a notice, and where it goes. Mail and SMS only leave the CRM when those adapters are switched on.</span>
        <span className="spacer" />
        {data.canEdit ? (
          <button className="btn ghost" type="button" disabled={sweeping} onClick={sweep} title="Runs the SLA, reminder and escalation checks now instead of waiting for the scheduled run">
            {sweeping ? "Running…" : "↻ Run reminders now"}
          </button>
        ) : null}
        {data.canEdit ? (
          <button className="btn primary" type="button" onClick={save}>
            Save notice rules
          </button>
        ) : null}
      </div>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>On</th>
            {data.channels.map((c) => (
              <th key={c}>{humanize(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.kinds.map((k) => (
            <tr key={k} style={data.settings[k].on ? undefined : { opacity: 0.55 }}>
              <td>
                <strong>{humanize(k)}</strong>
              </td>
              <td>
                <input type="checkbox" style={{ width: "auto" }} disabled={!data.canEdit} checked={data.settings[k].on} onChange={(e) => change(k, { on: e.target.checked })} />
              </td>
              {data.channels.map((c) => (
                <td key={c}>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    disabled={!data.canEdit}
                    checked={data.settings[k].channels.includes(c)}
                    onChange={(e) => change(k, { channels: e.target.checked ? [...data.settings[k].channels, c] : data.settings[k].channels.filter((x) => x !== c) })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdapterCards({ setError, setNotice }) {
  const [rows, setRows] = useState(null);
  const [pptTo, setPptTo] = useState("");
  async function load() {
    try {
      const r = await api("/api/adapters");
      setRows(r.adapters);
      setPptTo(((r.settings && r.settings.pptMailTo) || []).join(", "));
    } catch (err) {
      setError(err.message);
    }
  }
  async function savePpt() {
    try {
      await api("/api/adapters/settings", { method: "PATCH", body: JSON.stringify({ pptMailTo: pptTo }) });
      setNotice("PPT recipients saved");
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function test(key) {
    const to =
      key === "mail" || key === "sms" || key === "chat"
        ? await askText(key === "mail" ? "Send a test mail to" : "Send a test message to (mobile)", "", { title: "Test " + key, required: true, inputType: key === "mail" ? "email" : "tel", okLabel: "Send test" })
        : "";
    if (to === null) return;
    try {
      const r = await api("/api/adapters/" + key + "/test", { method: "POST", body: JSON.stringify({ to }) });
      setNotice(key + ": " + (r.message || (r.ok ? "ok" : "failed")));
      load();
    } catch (err) {
      setError(key + ": " + err.message);
    }
  }
  if (!rows) return null;
  return (
    <>
      <p className="meta">Every adapter is off until its environment switch is set on the server. The test button reports "not configured" while it is off.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
        {rows.map((a) => (
          <div key={a.key} className="card" style={{ borderLeft: "4px solid " + (a.on ? "var(--good)" : "var(--line)") }}>
            <h4>
              {a.label} <StatusBadge value={a.on ? "On" : "Off"} tone={a.on ? "good" : "none"} />
            </h4>
            <p className="meta">{a.detail}</p>
            {a.lastRun ? (
              <p className="meta">
                Last run: {new Date(a.lastRun.at).toLocaleString()} — <StatusBadge value={a.lastRun.result} />
              </p>
            ) : null}
            {a.key === "ppt" ? (
              <div className="toolbar">
                <input placeholder="Recipients (comma separated)" value={pptTo} onChange={(e) => setPptTo(e.target.value)} style={{ flex: 1 }} />
                <button className="btn ghost" type="button" onClick={savePpt}>
                  Save
                </button>
              </div>
            ) : null}
            <button className="btn info" type="button" onClick={() => test(a.key)}>
              ▶ Test
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export function SecurityPage({ user, setError, setNotice }) {
  const admin = ["Admin", "DexterIndiaCompanyTeam"].includes(user.hierarchy);
  const [tab, setTab] = useState("me");
  const tabs = [["me", "🔐 My sign-in"], ...(admin ? [["policy", "⛨ Company policy"], ["notices", "🔔 Notice rules"], ["adapters", "⇄ Outside services"]] : [])];
  return (
    <>
      {admin ? <Tabs tabs={tabs} value={tab} onChange={setTab} /> : null}
      {tab === "me" ? <MyMfa setError={setError} setNotice={setNotice} /> : null}
      {admin && tab === "policy" ? <CompanyPolicy user={user} setError={setError} setNotice={setNotice} /> : null}
      {admin && tab === "notices" ? <NoticeRules setError={setError} setNotice={setNotice} /> : null}
      {admin && tab === "adapters" ? <AdapterCards setError={setError} setNotice={setNotice} /> : null}
    </>
  );
}
