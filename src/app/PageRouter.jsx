import { Suspense, lazy } from "react";
import { HomePage } from "../pages/home/HomePage.jsx";
import { can, canDecide as canDecideFor } from "../utils/perm.js";

const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));

const FinancePage = page(() => import("../pages/finance/FinancePage.jsx"), "FinancePage");
const Franchise360Page = page(() => import("../pages/finance/Franchise360Page.jsx"), "Franchise360Page");
const AuditPage = page(() => import("../pages/governance/AuditPage.jsx"), "AuditPage");
const SecurityPage = page(() => import("../pages/governance/SecurityPage.jsx"), "SecurityPage");
const SessionsPage = page(() => import("../pages/governance/SessionsPage.jsx"), "SessionsPage");
const AffidavitPage = page(() => import("../pages/onboarding/AffidavitPage.jsx"), "AffidavitPage");
const ApnaPage = page(() => import("../pages/onboarding/ApnaPage.jsx"), "ApnaPage");
const AtmMasterPage = page(() => import("../pages/onboarding/AtmMasterPage.jsx"), "AtmMasterPage");
const KycPage = page(() => import("../pages/onboarding/KycPage.jsx"), "KycPage");
const LegalPage = page(() => import("../pages/onboarding/LegalPage.jsx"), "LegalPage");
const ApplicationsPage = page(() => import("../pages/onboarding/applications/ApplicationsPage.jsx"), "ApplicationsPage");
const OpsPage = page(() => import("../pages/operations/OpsPage.jsx"), "OpsPage");
const ProjectsPage = page(() => import("../pages/operations/ProjectsPage.jsx"), "ProjectsPage");
const ReportListsPage = page(() => import("../pages/operations/ReportListsPage.jsx"), "ReportListsPage");
const ReportsPage = page(() => import("../pages/operations/ReportsPage.jsx"), "ReportsPage");
const DashboardsPage = page(() => import("../pages/overview/DashboardsPage.jsx"), "DashboardsPage");
const NoticesPage = page(() => import("../pages/overview/NoticesPage.jsx"), "NoticesPage");
const ServicePage = page(() => import("../pages/service/ServicePage.jsx"), "ServicePage");
const TasksPage = page(() => import("../pages/service/TasksPage.jsx"), "TasksPage");
const MailPage = page(() => import("../pages/service/mail/MailPage.jsx"), "MailPage");
const CompaniesPage = page(() => import("../pages/setup/CompaniesPage.jsx"), "CompaniesPage");
const EmployeesPage = page(() => import("../pages/setup/EmployeesPage.jsx"), "EmployeesPage");
const FranchisesPage = page(() => import("../pages/setup/FranchisesPage.jsx"), "FranchisesPage");
const LookupsPage = page(() => import("../pages/setup/LookupsPage.jsx"), "LookupsPage");
const SitesPage = page(() => import("../pages/setup/SitesPage.jsx"), "SitesPage");
const TeamsPage = page(() => import("../pages/setup/TeamsPage.jsx"), "TeamsPage");
const UsersPage = page(() => import("../pages/setup/users/UsersPage.jsx"), "UsersPage");

export function PageRouter(props) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Pages {...props} />
    </Suspense>
  );
}

function Pages({ page, setPage, user, pages, companyName, data, setField, unread, setUnread, onReload, setError, setNotice }) {
  const { applications, atms, users, companies, projects, lookups, photoSlots, employees, franchises, sites, documents, formats, lois, agreements, columns, mappings, reminders } = data;
  const office = user.officeAdmin;
  const desk = office || user.officeStaff;
  const deskEdit = desk && can(user, "Edit", "CRM-02");
  const canDecide = canDecideFor(user);
  const opsDesk = office || user.functionalRole === "ServiceProjectOps";
  const runsWork = office || user.functionalRole === "ServiceProjectOps" || user.functionalRole === "Executive";
  const L = lookups || {};

  return (
    <>
      {page === "org" && (
        <CompaniesPage office={office} user={user} companies={companies} projects={projects} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "lookups" && (
        <LookupsPage office={office} lookups={lookups} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "employees" && (
        <EmployeesPage office={office} user={user} lookups={lookups} users={users} employees={employees} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "franchises" && (
        <FranchisesPage office={office} user={user} franchises={franchises} users={users} canOpen360={(pages || []).some((p) => p[0] === "fr360")} setPage={setPage} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "sites" && (
        <SitesPage office={office} user={user} lookups={lookups} sites={sites} atms={atms} franchises={franchises} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "kyc" && (
        <KycPage office={office} canDecide={canDecide} user={user} documents={documents} applications={applications} photoSlots={photoSlots} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "affidavit" && (
        <AffidavitPage office={office} user={user} lookups={lookups} documents={documents} formats={formats} applications={applications} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "legal" && (
        <LegalPage lookups={L} office={office} desk={deskEdit} user={user} canDecide={canDecide} lois={lois} agreements={agreements} columns={columns} documents={documents} applications={applications} franchises={franchises} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "apna" && (
        <ApnaPage office={opsDesk} user={user} franchises={franchises} documents={documents} mappings={mappings} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "fr360" && <Franchise360Page user={user} franchises={franchises} setPage={setPage} allowedPages={(pages || []).map((p) => p[0])} setError={setError} />}
      {page === "ops" && (
        <OpsPage
          canRun={!!runsWork && can(user, "Create", "CRM-04")}
          canDecide={!!canDecide}
          isAdmin={user.hierarchy === "Admin" || user.hierarchy === "DexterIndiaCompanyTeam"}
          setError={setError}
          setNotice={setNotice}
        />
      )}
      {page === "projects" && (
        <ProjectsPage
          canRun={!!runsWork}
          canUpload={can(user, "Create", "CRM-02")}
          canDecide={!!canDecide}
          isAdmin={user.hierarchy === "Admin" || user.hierarchy === "DexterIndiaCompanyTeam"}
          applications={applications}
          setError={setError}
          setNotice={setNotice}
        />
      )}
      {page === "service" && <ServicePage user={user} atms={atms} setError={setError} setNotice={setNotice} />}
      {page === "dashboards" && <DashboardsPage user={user} atms={atms} franchises={franchises} showTasks={!!desk} setPage={setPage} allowedPages={(pages || []).map((p) => p[0])} setError={setError} />}
      {page === "tasks" && <TasksPage user={user} atms={atms} franchises={franchises} setError={setError} setNotice={setNotice} />}
      {page === "notices" && <NoticesPage setPage={setPage} setError={setError} setUnread={setUnread} allowedPages={(pages || []).map((p) => p[0])} />}
      {page === "reports" && <ReportsPage user={user} atms={atms} setError={setError} setNotice={setNotice} />}
      {page === "lists" && <ReportListsPage franchises={franchises} setPage={setPage} allowedPages={(pages || []).map((p) => p[0])} setError={setError} setNotice={setNotice} />}
      {page === "security" && <SecurityPage user={user} setError={setError} setNotice={setNotice} />}
      {page === "finance" && <FinancePage user={user} atms={atms} franchises={franchises} setError={setError} setNotice={setNotice} />}
      {page === "home" && <HomePage user={user} office={desk} companyName={companyName} pages={pages} reminders={reminders} unread={unread} setPage={setPage} />}
      {page === "applications" && (
        <ApplicationsPage user={user} office={desk} canDecide={canDecide} lookups={lookups} franchises={franchises} applications={applications} setApplications={setField("applications")} documents={documents} lois={lois} agreements={agreements} atms={atms} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "atms" && (
        <AtmMasterPage user={user} office={user.canCreateAtm ?? opsDesk} lookups={lookups} franchises={franchises} projects={projects} atms={atms} setAtms={setField("atms")} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "users" && (
        <UsersPage user={user} office={office} lookups={lookups} franchises={franchises} projects={projects} companies={companies} users={users} setUsers={setField("users")} onReload={onReload} setError={setError} setNotice={setNotice} />
      )}
      {page === "teams" && <TeamsPage onReload={onReload} setError={setError} setNotice={setNotice} />}
      {page === "audit" && <AuditPage setError={setError} setNotice={setNotice} />}
      {page === "sessions" && <SessionsPage user={user} setError={setError} />}
      {page === "mail" && <MailPage user={user} atms={atms} setError={setError} setNotice={setNotice} />}
    </>
  );
}
