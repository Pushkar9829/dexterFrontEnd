// tabs: [key, label, count?][] or plain strings
export function Tabs({ tabs, value, onChange }) {
  return (
    <nav className="tabs" role="tablist">
      {tabs.map((tab) => {
        const [key, label, count] = Array.isArray(tab) ? tab : [tab, tab];
        return (
          <button key={key} type="button" role="tab" aria-selected={value === key} className={value === key ? "active" : ""} onClick={() => onChange(key)}>
            {label}
            {count !== undefined && count !== null ? <span className="count">{count}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
