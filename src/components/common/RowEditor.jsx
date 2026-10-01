import { useState } from "react";
import { askConfirm } from "./Dialogs.jsx";
import { Modal } from "./Modal.jsx";
import { api } from "../../services/api.js";
import { optPair } from "../../utils/format.js";

// confirm(body, row) may return a warning; the change is saved only after the user accepts it.
export function RowEditor({ row, fields, path, label = "Edit", title, confirm, onDone, setError, setNotice }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({});
  function start() {
    const init = {};
    fields.forEach((x) => (init[x.k] = row[x.k] === undefined || row[x.k] === null ? (x.type === "check" ? false : "") : x.type === "check" ? !!row[x.k] : String(row[x.k])));
    setF(init);
    setOpen(true);
  }
  async function save() {
    const body = {};
    fields.forEach((x) => {
      const before = x.type === "check" ? !!row[x.k] : row[x.k] === undefined || row[x.k] === null ? "" : String(row[x.k]);
      if (f[x.k] !== before) body[x.k] = f[x.k];
    });
    if (!Object.keys(body).length) return setOpen(false);
    const warning = confirm ? confirm(body, row) : "";
    if (warning && !(await askConfirm(warning, { danger: true, okLabel: "Yes, save" }))) return;
    setBusy(true);
    try {
      await api(path, { method: "PATCH", body: JSON.stringify(body) });
      setNotice("Saved");
      setOpen(false);
      onDone && onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const heading = title || label + (row.name || row.siteId || row.atmId || row.login ? " — " + (row.name || row.siteId || row.atmId || row.login) : "");
  return (
    <>
      <button className="btn ghost" type="button" onClick={start}>
        ✎ {label}
      </button>
      <Modal
        open={open}
        title={heading}
        size={fields.length > 8 ? "lg" : "md"}
        onClose={() => !busy && setOpen(false)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" type="button" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <div className="grid2">
          {fields.map((x) =>
            x.type === "check" ? (
              <label key={x.k} className="check span-all">
                <input type="checkbox" checked={!!f[x.k]} onChange={(e) => setF((v) => ({ ...v, [x.k]: e.target.checked }))} /> {x.label}
              </label>
            ) : x.options ? (
              <label key={x.k}>
                {x.label}
                <select value={f[x.k] || ""} onChange={(e) => setF((v) => ({ ...v, [x.k]: e.target.value }))}>
                  {x.blank === false ? null : <option value="">—</option>}
                  {x.options.map(optPair).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label key={x.k}>
                {x.label}
                <input type={x.type || "text"} value={f[x.k] || ""} onChange={(e) => setF((v) => ({ ...v, [x.k]: e.target.value }))} />
              </label>
            )
          )}
        </div>
      </Modal>
    </>
  );
}
