export const officePages = [
  ["home", "Home"],
  ["dashboards", "Dashboards"],
  ["notices", "Notices"],
  ["org", "Company / Project"],
  ["lookups", "Lookups"],
  ["employees", "Employees"],
  ["users", "Users"],
  ["teams", "Teams"],
  ["franchises", "Franchise tree"],
  ["sites", "Sites"],
  ["applications", "Applications"],
  ["kyc", "KYC"],
  ["affidavit", "Affidavit"],
  ["legal", "LOI / Agreement"],
  ["atms", "ATM Master"],
  ["projects", "Projects"],
  ["ops", "Daily ops"],
  ["reports", "Monthly reports"],
  ["lists", "Report lists"],
  ["service", "Complaints / service"],
  ["mail", "Mail / trackers"],
  ["tasks", "Tasks"],
  ["finance", "Finance"],
  ["apna", "Apna mapping"],
  ["fr360", "Franchise 360"],
  ["audit", "Audit"],
  ["sessions", "Sessions"],
  ["security", "Security / notices"],
];

export const franPages = [
  ["home", "Home"],
  ["dashboards", "Dashboards"],
  ["notices", "Notices"],
  ["applications", "Applications"],
  ["kyc", "KYC"],
  ["affidavit", "Affidavit"],
  ["legal", "LOI / Agreement"],
  ["atms", "ATM Master"],
  ["projects", "Projects"],
  ["ops", "Daily ops"],
  ["reports", "Reports / loading"],
  ["lists", "Firm view / lists"],
  ["service", "Complaints"],
  ["mail", "Mail / trackers"],
  ["finance", "Finance"],
  ["apna", "Apna App"],
  ["fr360", "Franchise 360"],
  ["security", "My security"],
];

export const fieldPages = [
  ["home", "Home"],
  ["notices", "Notices"],
  ["service", "My visits / inspections"],
  ["projects", "Project evidence"],
  ["tasks", "My tasks"],
  ["security", "My security"],
];

export const NAV_GROUPS = [
  ["Overview", ["home", "dashboards", "notices"]],
  ["Setup", ["org", "lookups", "employees", "users", "teams", "franchises", "sites"]],
  ["Onboarding", ["applications", "kyc", "affidavit", "legal", "atms", "apna"]],
  ["Operations", ["projects", "ops", "reports", "lists"]],
  ["Service", ["service", "mail", "tasks"]],
  ["Finance", ["finance", "fr360"]],
  ["Governance", ["audit", "sessions", "security"]],
];

export const GROUP_STYLE = {
  Overview: { color: "#4f46e5", icon: "◈" },
  Setup: { color: "#7c3aed", icon: "⚙" },
  Onboarding: { color: "#0284c7", icon: "✎" },
  Operations: { color: "#d97706", icon: "▦" },
  Service: { color: "#e11d48", icon: "✆" },
  Finance: { color: "#059669", icon: "₹" },
  Governance: { color: "#475569", icon: "⛨" },
  More: { color: "#64748b", icon: "…" },
};

export function groupOf(id) {
  const hit = NAV_GROUPS.find(([, ids]) => ids.includes(id));
  return hit ? hit[0] : "More";
}

export function accentOf(id) {
  return GROUP_STYLE[groupOf(id)].color;
}

export const PAGE_MODULE = {
  org: "CRM-01",
  lookups: "CRM-01",
  employees: "CRM-01",
  users: "CRM-01",
  teams: "CRM-01",
  franchises: "CRM-02",
  sites: "CRM-02",
  applications: "CRM-02",
  kyc: "CRM-02",
  affidavit: "CRM-02",
  legal: "CRM-02",
  atms: "CRM-02",
  apna: "CRM-02",
  fr360: "CRM-02",
  projects: "CRM-03",
  ops: "CRM-04",
  reports: "CRM-04",
  finance: "CRM-04",
  service: "CRM-05",
  mail: "CRM-05",
  tasks: "CRM-06",
};

export function allowedPages(user, list) {
  const mods = user.modules || [];
  if (!mods.length) return list;
  return list.filter(([id]) => !PAGE_MODULE[id] || mods.includes(PAGE_MODULE[id]));
}

export function navGroups(pages) {
  const used = new Set();
  const groups = NAV_GROUPS.map(([name, ids]) => [name, pages.filter(([id]) => ids.includes(id) && used.add(id))]).filter(([, items]) => items.length);
  const rest = pages.filter(([id]) => !used.has(id));
  return rest.length ? [...groups, ["More", rest]] : groups;
}

const ADMIN_ONLY_PAGES = ["org", "lookups", "employees", "users", "teams", "franchises", "sites", "audit"];

export const deskPages = officePages.filter(([id]) => !ADMIN_ONLY_PAGES.includes(id));

export function pagesFor(user) {
  if (!user) return [];
  if (user.fieldStaff) return allowedPages(user, fieldPages);
  const auditGate = (list) => (user.canViewAudit === false ? list.filter(([id]) => id !== "audit") : list);
  if (user.officeAdmin || user.hierarchy === "Director") return auditGate(allowedPages(user, officePages));
  if (user.deskStaff) return allowedPages(user, user.canViewAudit ? [...deskPages, ["audit", "Audit"]] : deskPages);
  return allowedPages(user, franPages);
}
