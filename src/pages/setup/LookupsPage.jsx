import { useState } from "react";
import { askConfirm, askText } from "../../components/common/Dialogs.jsx";
import { Tabs } from "../../components/common/Tabs.jsx";
import { api } from "../../services/api.js";
import { humanize } from "../../utils/format.js";

const KEYS = ["states", "cities", "zones", "regions", "districts", "teams", "productModels", "machineTypes", "banks", "documentTypes", "agreementTypes", "rbiCategories", "siteTypes", "tisTypes"];

function Values({ list, warn }) {
  if (!list || !list.length) return warn ? <span className="badge warn">⚠ empty: pickers using this list show nothing</span> : <span className="meta">none</span>;
  return (
    <div className="chips">
      {list.map((v) => (
        <span key={v} className="badge">
          {v}
        </span>
      ))}
    </div>
  );
}

export function LookupsPage({ office, lookups, setError, setNotice, onReload }) {
  const L = lookups || {};
  const [tab, setTab] = useState("lists");

  async function patch(body, done) {
    try {
      await api("/api/lookups", { method: "PATCH", body: JSON.stringify(body) });
      setNotice(done);
      onReload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(key) {
    const raw = await askText("Comma-separated values", (L[key] || []).join(", "), { title: "Edit " + humanize(key), multiline: true, okLabel: "Save" });
    if (raw == null) return;
    const next = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
    const removed = (L[key] || []).filter((v) => !next.includes(v));
    if (removed.length) {
      const msg = "Remove " + removed.length + " value(s) from " + humanize(key) + ": " + removed.slice(0, 10).join(", ") + (removed.length > 10 ? "…" : "") + "? Existing records keep them, but they can no longer be picked" + (next.length ? "." : ", and the list will be empty.");
      if (!(await askConfirm(msg, { danger: true, okLabel: "Remove" }))) return;
    }
    patch({ [key]: next }, "Lookups updated");
  }

  function setting(key, value) {
    if (value == null || value === "") return;
    patch({ [key]: value }, "Setting saved");
  }

  async function ask(title, message, current, opts) {
    return askText(message, current == null ? "" : String(current), { title, okLabel: "Save", ...opts });
  }

  const editBtn = (onClick) =>
    office ? (
      <button className="btn ghost" type="button" onClick={onClick}>
        ✎ Edit
      </button>
    ) : null;

  const settingRow = (label, value, onEdit) => (
    <tr>
      <td className="nowrap">
        <strong>{label}</strong>
      </td>
      <td>{value}</td>
      {office ? <td>{editBtn(onEdit)}</td> : null}
    </tr>
  );

  return (
    <>
      <Tabs
        tabs={[
          ["lists", "Master lists" + (KEYS.some((k) => !(L[k] || []).length) ? " ⚠" : ""), KEYS.length],
          ["project", "Project settings"],
          ["ops", "Operations settings"],
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="card">
        {tab === "lists" ? (
          <table>
            <thead>
              <tr>
                <th>List</th>
                <th>Values</th>
                {office ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {KEYS.map((k) => (
                <tr key={k}>
                  <td className="nowrap">
                    <strong>{humanize(k)}</strong> <span className="meta">({(L[k] || []).length})</span>
                  </td>
                  <td>
                    <Values list={L[k]} warn />
                  </td>
                  {office ? <td>{editBtn(() => save(k))}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {tab === "project" ? (
          <table>
            <tbody>
              {settingRow("Stage reminder", "Every " + (L.stageReminderDays || 3) + " days while a project stage has not moved", async () =>
                setting("stageReminderDays", await ask("Stage reminder", "Remind every how many days (1–60)?", L.stageReminderDays || 3, { inputType: "number" }))
              )}
              {settingRow("Agreement renewal", "Remind " + (L.agreementRenewalDays || 60) + " days before an agreement's end date (unless a renew-by date is set)", async () =>
                setting("agreementRenewalDays", await ask("Agreement renewal", "Remind how many days before the end date (1–180)?", L.agreementRenewalDays || 60, { inputType: "number" }))
              )}
              <tr>
                <td className="nowrap">
                  <strong>Auto task per stage</strong>
                </td>
                <td colSpan={office ? 2 : 1}>
                  <label className="check">
                    <input type="checkbox" disabled={!office} checked={L.projectAutoTask !== false} onChange={(e) => setting("projectAutoTask", e.target.checked)} /> Create a task for each project stage (closed when the stage is approved)
                  </label>
                </td>
              </tr>
              {settingRow("Stage statuses", <Values list={L.stageStatuses} />, async () => {
                const v = await ask("Stage statuses", "Stage statuses, comma separated (must keep Pending and Complete)", (L.stageStatuses || []).join(", "), { multiline: true });
                if (v !== null) setting("stageStatuses", v.split(",").map((s) => s.trim()).filter(Boolean));
              })}
              {settingRow(
                "Default stage owners",
                Object.entries(L.stageOwners || {}).length ? (
                  <div className="chips">
                    {Object.entries(L.stageOwners || {}).map(([k, v]) => (
                      <span key={k} className="badge info">
                        {k} → {v}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="meta">none</span>
                ),
                async () => {
                  const cur = Object.entries(L.stageOwners || {})
                    .map(([k, v]) => k + "=" + v)
                    .join("; ");
                  const v = await ask("Default stage owners", "Stage=Owner pairs separated by ; (e.g. Site survey=Ops team; Agreement=Legal)", cur, { multiline: true });
                  if (v === null) return;
                  const map = {};
                  v.split(";").forEach((p) => {
                    const [k, o] = p.split("=");
                    if (k && k.trim()) map[k.trim()] = (o || "").trim();
                  });
                  setting("stageOwners", map);
                }
              )}
            </tbody>
          </table>
        ) : null}
        {tab === "ops" ? (
          <table>
            <tbody>
              {settingRow("Cash denominations", <Values list={(L.denos || []).map(String)} />, async () => {
                const v = await ask("Cash denominations", "Denominations in use (from 100, 200, 500, 1000, 2000)", (L.denos || []).join(", "));
                if (v !== null) setting("denos", v);
              })}
              {settingRow("TXN entry window", (L.txnEntryDays || 45) + " days (older dates and confirmed days are Admin-only)", async () => {
                const v = await ask("TXN entry window", "Days back that TXN can be entered (1–365)", L.txnEntryDays || 45, { inputType: "number" });
                if (v !== null) setting("txnEntryDays", Number(v));
              })}
              {settingRow("Payout confirmation emails", (L.payoutConfirmEmails || []).length ? <Values list={L.payoutConfirmEmails} /> : <span className="meta">none — only the franchise's own email gets the confirmation</span>, async () => {
                const v = await ask("Payout confirmation emails", "Company addresses that get the confirmation mail when Admin verifies a payout account (comma separated, blank = none)", (L.payoutConfirmEmails || []).join(", "));
                if (v !== null) patch({ payoutConfirmEmails: v.split(/[,;]/).map((s) => s.trim()).filter(Boolean) }, "Setting saved");
              })}
            </tbody>
          </table>
        ) : null}
      </div>
    </>
  );
}
