import { FormModal } from "../../components/common/FormModal.jsx";
import { RowEditor } from "../../components/common/RowEditor.jsx";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { api } from "../../services/api.js";

export function CompaniesPage({ office, user, companies, projects, onReload, setError, setNotice }) {
  const dexter = user && user.hierarchy === "DexterIndiaCompanyTeam";
  const canEditProject = dexter || (user && user.hierarchy === "Admin");
  async function addCompany(e) {
    const t = e.target;
    try {
      await api("/api/companies", { method: "POST", body: JSON.stringify({ name: t.cname.value, code: t.ccode.value }) });
      setNotice("Company created with its own lookup copy. Grant it to team members on the Users page.");
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }
  async function addProject(e) {
    try {
      await api("/api/projects", { method: "POST", body: JSON.stringify({ name: e.target.name.value }) });
      setNotice("Project saved");
      onReload();
      return true;
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <div className="card">
        <h3>
          Companies <span className="badge">{companies.length}</span>
          <span className="spacer" />
          {dexter ? (
            <FormModal button="+ New company" title="New company" submitLabel="Create company" onSubmit={addCompany}>
              <div className="grid2">
                <label>
                  Company name <input name="cname" required />
                </label>
                <label>
                  Code <input name="ccode" required />
                </label>
              </div>
            </FormModal>
          ) : null}
        </h3>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Code</th>
              <th>India</th>
              <th>Status</th>
              {dexter ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c._id}>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td>{c.code}</td>
                <td>{c.indiaOperating ? <StatusBadge value="India" tone="info" /> : ""}</td>
                <td>
                  <StatusBadge value={c.active === false ? "Inactive" : "Active"} />
                </td>
                {dexter ? (
                  <td>
                    <RowEditor
                      row={{ ...c, active: c.active !== false }}
                      path={"/api/companies/" + c._id}
                      fields={[
                        { k: "name", label: "Name" },
                        { k: "indiaOperating", label: "India operating", type: "check" },
                        { k: "active", label: "Active (unticking logs out all its users)", type: "check" },
                      ]}
                      confirm={(b) => (b.active === false ? "Deactivate " + c.name + "? Every user of this company is logged out and cannot work in it until it is reactivated." : "")}
                      onDone={onReload}
                      setError={setError}
                      setNotice={setNotice}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>
          Projects (this company) <span className="badge">{projects.length}</span>
          <span className="spacer" />
          {canEditProject ? (
            <FormModal button="+ New project" title="New project" submitLabel="Add project" size="sm" onSubmit={addProject}>
              <label>
                Project name
                <input name="name" required />
              </label>
            </FormModal>
          ) : null}
        </h3>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              {canEditProject ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>
                  <StatusBadge value={p.active === false ? "Inactive" : "Active"} />
                </td>
                {canEditProject ? (
                  <td>
                    <RowEditor
                      row={{ ...p, active: p.active !== false }}
                      path={"/api/projects/" + p._id}
                      fields={[
                        { k: "name", label: "Name" },
                        { k: "active", label: "Active", type: "check" },
                      ]}
                      confirm={(b) => (b.active === false ? "Deactivate project " + p.name + "? It stops appearing in pickers for new records." : "")}
                      onDone={onReload}
                      setError={setError}
                      setNotice={setNotice}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
            {!projects.length ? (
              <tr>
                <td colSpan={canEditProject ? 3 : 2} className="empty">
                  No projects yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
