export function when(v) {
  return v ? new Date(v).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "";
}

export function Pick({ label, value, onChange, options, all = "All" }) {
  return (
    <label>
      {label}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        {all ? <option value="">{all}</option> : null}
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
      </select>
    </label>
  );
}

export function qs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== "" && v !== undefined && v !== null)
    .map(([k, v]) => k + "=" + encodeURIComponent(v))
    .join("&");
}
