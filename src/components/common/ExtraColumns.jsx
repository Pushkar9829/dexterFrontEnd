import { useEffect, useState } from "react";
import { api, downloadB64, fileToB64 } from "../../services/api.js";
import { humanize } from "../../utils/format.js";
import { askConfirm, askText } from "./Dialogs.jsx";
import { FormModal } from "./FormModal.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

export function ExtraColumns({ register, rows, rowLabel, office, admin, setError, setNotice, onReload }) {
  const [cols, setCols] = useState([]);
  const [types, setTypes] = useState([]);
  async function load() {
    try {
      const r = await api("/api/register-columns?register=" + register);
      setCols(r.columns);
      setTypes(r.types);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, [register]);
  async function addCol(e) {
    const t = e.target;
    try {
      await api("/api/register-columns", { method: "POST", body: JSON.stringify({ register, name: t.cname.value, type: t.ctype.value, required: t.creq.checked, options: t.copts.value }) });
      setNotice("Column added");
      load();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }
  async function removeCol(c) {
    if (!(await askConfirm("Remove column " + c.name + "? Values already entered stay on the records.", { danger: true, okLabel: "Remove" }))) return;
    try {
      await api("/api/register-columns/" + c._id, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }
  async function saveValue(row, c, v) {
    try {
      await api("/api/registers/" + register + "/" + row._id + "/extra", { method: "PATCH", body: JSON.stringify({ extra: { [c.name]: v } }) });
      setNotice("Saved");
      onReload && onReload();
    } catch (err) {
      setError(err.message);
    }
  }
  async function pickFile(row, c, file) {
    if (!file) return;
    saveValue(row, c, { fileName: file.name, data: await fileToB64(file) });
  }
  async function openFile(row, v) {
    try {
      const f = await api("/api/registers/" + register + "/" + row._id + "/file/" + v.docId);
      downloadB64(f.fileName, f.mime, f.data);
    } catch (err) {
      setError(err.message);
    }
  }
  async function edit(row, c) {
    const hint = c.type === "status" && (c.options || []).length ? ", one of: " + c.options.join(" / ") : c.type === "date" ? ", YYYY-MM-DD" : "";
    const v = await askText(c.name + " (" + c.type + hint + (c.required ? ", required" : "") + ")", String((row.extra || {})[c.name] ?? ""), {
      title: "Edit " + c.name + " — " + rowLabel(row),
      inputType: c.type === "date" ? "date" : c.type === "number" ? "number" : "text",
      okLabel: "Save",
    });
    if (v == null) return;
    try {
      await api("/api/registers/" + register + "/" + row._id + "/extra", { method: "PATCH", body: JSON.stringify({ extra: { [c.name]: v } }) });
      setNotice("Saved");
      onReload && onReload();
    } catch (err) {
      setError(err.message);
    }
  }
  if (!cols.length && !admin) return null;
  return (
    <div className="card">
      <h3>
        Custom columns — {humanize(register)}
        <span className="spacer" />
        {admin ? (
          <FormModal button="+ Add column" buttonClass="btn ghost" title={"Add custom column — " + humanize(register)} submitLabel="Add column" onSubmit={addCol}>
            <div className="grid2">
              <label>
                Column name <input name="cname" required />
              </label>
              <label>
                Type
                <select name="ctype">
                  {types.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="span-all">
                Status options (comma-separated, status type only) <input name="copts" />
              </label>
              <label className="check">
                <input name="creq" type="checkbox" /> Required
              </label>
            </div>
          </FormModal>
        ) : null}
      </h3>
      {cols.length ? (
        <table>
          <thead>
            <tr>
              <th>Record</th>
              {cols.map((c) => (
                <th key={c._id}>
                  {c.name}
                  {c.required ? " *" : ""}{" "}
                  {admin ? (
                    <button className="btn ghost" type="button" onClick={() => removeCol(c)}>
                      ×
                    </button>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{rowLabel(r)}</td>
                {cols.map((c) => {
                  const v = (r.extra || {})[c.name];
                  return (
                    <td key={c._id}>
                      {c.type === "file" ? (
                        <>
                          {v && v.docId ? (
                            <button className="btn ghost" type="button" onClick={() => openFile(r, v)}>
                              {v.fileName}
                            </button>
                          ) : (
                            "—"
                          )}{" "}
                          {office ? <input type="file" style={{ width: 160 }} onChange={(e) => pickFile(r, c, e.target.files[0])} /> : null}
                        </>
                      ) : c.type === "status" && office && (c.options || []).length ? (
                        <select value={v || ""} onChange={(e) => saveValue(r, c, e.target.value)}>
                          <option value="">—</option>
                          {c.options.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <>
                          {c.type === "status" ? <StatusBadge value={v} /> : String(v ?? "")}{" "}
                          {office ? (
                            <button className="btn ghost" type="button" onClick={() => edit(r, c)}>
                              ✎
                            </button>
                          ) : null}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="meta">No custom columns on this register yet.</p>
      )}
    </div>
  );
}
