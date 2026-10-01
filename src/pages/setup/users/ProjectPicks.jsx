export function ProjectPicks({ projects, value, onChange }) {
  if (!projects.length) return null;
  return (
    <div>
      <label>Projects (none ticked = all projects)</label>
      <div className="grid3">
        {projects.map((p) => (
          <label key={p._id} className="check">
            <input
              type="checkbox"
              checked={value.includes(String(p._id))}
              onChange={(e) => onChange(e.target.checked ? [...value, String(p._id)] : value.filter((x) => x !== String(p._id)))}
            />
            {p.name}
          </label>
        ))}
      </div>
    </div>
  );
}
