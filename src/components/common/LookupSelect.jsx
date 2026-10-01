export function LookupSelect({ label, value, onChange, options }) {
  const list = options || [];
  return (
    <label>
      {label}
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {value && !list.includes(value) ? <option value={value}>{value}</option> : null}
        {list.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
