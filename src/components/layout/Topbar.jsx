import { CompanySwitch } from "./CompanySwitch.jsx";
import { InstallButton } from "./InstallButton.jsx";
import { LangToggle } from "./LangToggle.jsx";
import { NoticeBell } from "./NoticeBell.jsx";
import { t } from "../../i18n/index.js";
import { humanize } from "../../utils/format.js";

export function Topbar({ user, companyName, companies, unread, onSwitched, onOpenNotices, onLogout, setError }) {
  return (
    <header className="topbar">
      <div className="brand">Dexter India CRM</div>
      <div className="who">
        <strong>{user.name}</strong>
        <span className="meta">
          {" "}
          · {humanize(user.hierarchy)}
          {user.functionalRole ? " · " + humanize(user.functionalRole) : ""} · {companyName || "company " + user.companyId}
        </span>{" "}
        <CompanySwitch user={user} companies={companies} onSwitched={onSwitched} setError={setError} />
      </div>
      <div className="actions">
        <NoticeBell unread={unread} onOpen={onOpenNotices} />
        <InstallButton />
        <LangToggle />
        <button className="btn ghost" type="button" onClick={onLogout}>
          {t("Logout")}
        </button>
      </div>
    </header>
  );
}
