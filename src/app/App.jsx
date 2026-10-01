import { useEffect, useState } from "react";
import { PageRouter } from "./PageRouter.jsx";
import { accentOf, pagesFor } from "./navigation.js";
import { DialogHost } from "../components/common/Dialogs.jsx";
import { PageHead } from "../components/common/PageHead.jsx";
import { OfflineBanner } from "../components/layout/OfflineBanner.jsx";
import { Sidebar } from "../components/layout/Sidebar.jsx";
import { Toasts } from "../components/layout/Toasts.jsx";
import { Topbar } from "../components/layout/Topbar.jsx";
import { usePrivacyShield } from "../hooks/usePrivacyShield.js";
import { useWorkspaceData } from "../hooks/useWorkspaceData.js";
import { LoginPage } from "../pages/auth/LoginPage.jsx";
import { api, getToken, setToken } from "../services/api.js";
import { CAPTURE_MODE, capturePage, captureSignIn, loadCaptureScript } from "./figmaCapture.js";
import { clearMine, flush, queued, setQueueOwner } from "../services/offlineQueue.js";
import { askConfirm } from "../components/common/Dialogs.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(capturePage || "home");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unread, setUnread] = useState(0);
  const { data, reload, reset, setField } = useWorkspaceData(user, setError);
  const shielded = usePrivacyShield(!!user && !CAPTURE_MODE);
  const companyName = user ? (data.companies.find((c) => c._id === user.companyId) || {}).name || "" : "";
  const pages = pagesFor(user);
  const mark =
    user &&
    [user.login, companyName, user.hierarchy, new Date().toLocaleString("en-IN")].filter(Boolean).join(" · ");

  async function refreshMe() {
    if (!getToken()) return;
    try {
      const data = await api("/api/auth/me");
      setUser(data.user);
    } catch (err) {
      if (err.status === 401) {
        setToken("");
        setUser(null);
        return;
      }
      // offline or server down: keep the login and try again once the network is back
      setError("Cannot reach the server. You will be signed back in when the connection returns.");
      window.addEventListener("online", refreshMe, { once: true });
    }
  }

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (CAPTURE_MODE) captureSignIn(api, setToken).then(refreshMe, refreshMe);
    else refreshMe();
    const ended = () => {
      reset();
      setUser(null);
      setPage("home");
      setError("Your session ended. Please log in again.");
    };
    window.addEventListener("af-session-ended", ended);
    return () => window.removeEventListener("af-session-ended", ended);
  }, []);

  useEffect(() => {
    if (!user) return;
    reload();
    loadCaptureScript(3500);
  }, [page, user]);

  useEffect(() => {
    setQueueOwner(user);
    if (!user) return undefined;
    const send = () =>
      flush().then((r) => {
        if (r.sent) setNotice(r.sent + " offline entr" + (r.sent === 1 ? "y" : "ies") + " sent");
        if (r.failed) setError(r.failed + " offline entr" + (r.failed === 1 ? "y was" : "ies were") + " refused; see the banner");
        if (r.sent || r.failed) reload();
      });
    send();
    window.addEventListener("online", send);
    const t = setInterval(send, 60000);
    return () => {
      window.removeEventListener("online", send);
      clearInterval(t);
    };
  }, [user && user.id, user && user.companyId]);

  function refreshUnread() {
    return api("/api/notices?unread=1")
      .then((r) => setUnread(r.unread || 0))
      .catch(() => {});
  }

  useEffect(() => {
    if (!user) return undefined;
    refreshUnread();
    const t = setInterval(refreshUnread, 60000);
    return () => clearInterval(t);
  }, [page, user && user.id, user && user.companyId]);

  function switchedCompany(u) {
    setNotice("");
    setError("");
    reset();
    setUser(u);
  }

  async function logout() {
    const waiting = await queued().catch(() => []);
    if (waiting.length) {
      const ok = await askConfirm(waiting.length + " field entr" + (waiting.length === 1 ? "y has" : "ies have") + " not reached the server yet. Signing out deletes them from this device.", { title: "Unsent entries", okLabel: "Sign out and delete" });
      if (!ok) return;
    }
    await clearMine().catch(() => {});
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (_) {
      /* still clear */
    }
    setToken("");
    reset();
    setUser(null);
    setPage("home");
  }

  if (!user) {
    return <LoginPage onLoggedIn={setUser} error={error} setError={setError} notice={notice} setNotice={setNotice} />;
  }

  return (
    <div className="watermark" data-mark={CAPTURE_MODE ? "" : mark} onContextMenu={(e) => e.preventDefault()}>
      {shielded ? <div className="shield">Dexter India CRM — hidden while in background</div> : null}
      <div className={"app sensitive" + (shielded ? " shielded" : "")}>
        <Topbar
          user={user}
          companyName={companyName}
          companies={data.companies}
          unread={unread}
          onSwitched={switchedCompany}
          onOpenNotices={() => setPage("notices")}
          onLogout={logout}
          setError={setError}
        />
        <div className="shell">
          <Sidebar pages={pages} page={page} setPage={setPage} badges={{ notices: unread }} />
          <main className="main" style={{ "--accent": accentOf(page) }}>
            <OfflineBanner />
            <Toasts error={error} setError={setError} notice={notice} setNotice={setNotice} />
            <DialogHost />
            <PageHead page={page} pages={pages} />
            <div key={user.companyId} className={"page page-" + page}>
              <PageRouter
                page={page}
                setPage={setPage}
                user={user}
                pages={pages}
                companyName={companyName}
                data={data}
                setField={setField}
                unread={unread}
                setUnread={setUnread}
                onReload={reload}
                setError={setError}
                setNotice={setNotice}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
