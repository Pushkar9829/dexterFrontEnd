import { GRID_COLS } from "./applicationForm.js";

export function AtmGridInput({ title, keys, value, onChange }) {
  const set = (k, c, v) => onChange({ ...value, [k]: { ...value[k], [c]: v } });
  return (
    <div className="table-scroll">
      <h4>{title}</h4>
      <table className="grid-input">
        <thead>
          <tr>
            <th></th>
            {GRID_COLS.map(([c, l]) => (
              <th key={c}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <td>{k}</td>
              {GRID_COLS.map(([c]) => (
                <td key={c}>
                  {c === "siteType" ? (
                    <select value={value[k][c]} onChange={(e) => set(k, c, e.target.value)}>
                      <option value="">—</option>
                      <option>Onsite</option>
                      <option>Offsite</option>
                    </select>
                  ) : (
                    <input value={value[k][c]} onChange={(e) => set(k, c, e.target.value)} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
