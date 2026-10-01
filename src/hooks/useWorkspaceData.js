import { useRef, useState } from "react";
import { api, getToken } from "../services/api.js";

const EMPTY = {
  applications: [],
  atms: [],
  users: [],
  companies: [],
  projects: [],
  lookups: {},
  photoSlots: [],
  employees: [],
  franchises: [],
  sites: [],
  documents: [],
  formats: [],
  lois: [],
  agreements: [],
  columns: [],
  mappings: [],
  reminders: { affidavitPending: [] },
};

// Each list loads on its own: a user without a module gets 403 for that list only, and the rest still load.
export function useWorkspaceData(user, setError) {
  const [data, setData] = useState(EMPTY);
  const generation = useRef(0);
  const merge = (patch) => setData((d) => ({ ...d, ...patch }));
  const setField = (key) => (value) => merge({ [key]: value });

  function reset() {
    generation.current += 1;
    setData(EMPTY);
  }

  async function reload() {
    if (!getToken()) return;
    const mine = ++generation.current;
    const failures = [];
    const load = (path, pick) =>
      api(path).then(pick, (err) => {
        if (err.status !== 403) failures.push(err.message);
        return null;
      });
    const office = user && (user.officeAdmin || user.hierarchy === "Director");
    const results = await Promise.all([
      load("/api/applications", (r) => ({ applications: r.applications || [] })),
      load("/api/atms", (r) => ({ atms: r.atms || [] })),
      load("/api/lookups", (r) => ({ lookups: r.lookups || {}, photoSlots: r.photoSlots || [] })),
      load("/api/companies", (r) => ({ companies: r.companies || [] })),
      load("/api/projects", (r) => ({ projects: r.projects || [] })),
      load("/api/franchises", (r) => ({ franchises: r.franchises || [] })),
      load("/api/sites", (r) => ({ sites: r.sites || [] })),
      load("/api/documents", (r) => ({ documents: r.documents || [] })),
      load("/api/affidavit-formats", (r) => ({ formats: r.formats || [] })),
      load("/api/lois", (r) => ({ lois: r.lois || [] })),
      load("/api/agreements", (r) => ({ agreements: r.agreements || [], columns: r.columns || [] })),
      load("/api/apna", (r) => ({ mappings: r.mappings || [] })),
      load("/api/reminders", (r) => ({ reminders: r })),
      office ? load("/api/users", (r) => ({ users: r.users || [] })) : Promise.resolve({ users: [] }),
      office ? load("/api/employees", (r) => ({ employees: r.employees || [] })) : Promise.resolve({ employees: [] }),
    ]);
    if (mine !== generation.current) return;
    setData((d) => Object.assign({ ...d }, ...results.filter(Boolean)));
    if (failures.length) setError(failures[0]);
  }

  return { data, reload, reset, setField };
}
