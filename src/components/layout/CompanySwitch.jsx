import { api } from "../../services/api.js";

export function CompanySwitch({ user, companies, onSwitched, setError }) {
  if (!user.canSwitchCompany || companies.length < 2) return null;
  async function change(companyId) {
    try {
      const r = await api("/api/auth/company", { method: "POST", body: JSON.stringify({ companyId }) });
      onSwitched(r.user);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <select value={user.companyId || ""} onChange={(e) => change(e.target.value)} title="Active company">
      {companies.map((c) => (
        <option key={c._id} value={c._id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
