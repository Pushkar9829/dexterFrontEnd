import { useEffect, useState } from "react";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { api } from "../../services/api.js";
import { setFocus } from "../../utils/focus.js";
import { humanize } from "../../utils/format.js";

const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "");
const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();

export function NoticesPage({ setPage, setError, setUnread, allowedPages = [] }) {
  const [data, setData] = useState({ rows: [], unread: 0 });
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [kind, setKind] = useState("");
  const [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true);
    return api("/api/notices")
      .then((d) => {
        setData(d);
        if (setUnread) setUnread(d.unread || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  async function markRead(n) {
    if (n.read) return;
    await api("/api/notices/" + n._id + "/read", { method: "PATCH" });
    setData((d) => {
      const unread = Math.max(0, d.unread - 1);
      if (setUnread) setUnread(unread);
      return { unread, rows: d.rows.map((x) => (x._id === n._id ? { ...x, read: true } : x)) };
    });
  }
  function readAll() {
    api("/api/notices/read-all", { method: "POST" })
      .then(load)
      .catch((e) => setError(e.message));
  }
  async function open(n) {
    try {
      await markRead(n);
      if (!n.link || !n.link.page) return;
      if (!allowedPages.includes(n.link.page)) {
        setError("You don't have access to the " + humanize(n.link.page) + " page.");
        return;
      }
      setFocus(n.link);
      setPage(n.link.page);
    } catch (e) {
      setError(e.message);
    }
  }
  const kinds = [...new Set(data.rows.map((n) => n.kind))];
  const rows = data.rows.filter((n) => (!onlyUnread || !n.read) && (!kind || n.kind === kind));
  const groups = [
    ["Today", rows.filter((n) => isToday(n.createdAt))],
    ["Earlier", rows.filter((n) => !isToday(n.createdAt))],
  ].filter(([, list]) => list.length);
  return (
    <div className="card">
      <div className="toolbar">
        <div className="chips">
          <button type="button" className={"chip" + (!onlyUnread ? " active" : "")} onClick={() => setOnlyUnread(false)}>
            All <b>{data.rows.length}</b>
          </button>
          <button type="button" className={"chip" + (onlyUnread ? " active" : "")} onClick={() => setOnlyUnread(true)}>
            Unread <b>{data.unread}</b>
          </button>
        </div>
        {kinds.length > 1 ? (
          <div className="chips">
            <button type="button" className={"chip" + (!kind ? " active" : "")} onClick={() => setKind("")}>
              Any type
            </button>
            {kinds.map((k) => (
              <button key={k} type="button" className={"chip" + (kind === k ? " active" : "")} onClick={() => setKind(kind === k ? "" : k)}>
                {humanize(k)} <b>{data.rows.filter((n) => n.kind === k && (!onlyUnread || !n.read)).length}</b>
              </button>
            ))}
          </div>
        ) : null}
        <span className="spacer" />
        <button className="btn ghost" type="button" disabled={loading} onClick={load}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
        <button className="btn ghost" type="button" disabled={!data.unread} onClick={readAll}>
          ✓ Mark all read
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Type</th>
            <th>Title</th>
            <th>Details</th>
            <th></th>
          </tr>
        </thead>
        {groups.map(([label, list]) => (
          <tbody key={label}>
            <tr className="group-row">
              <td colSpan={5}>
                <strong>{label}</strong>
              </td>
            </tr>
            {list.map((n) => (
              <tr key={n._id} className={n.read ? "" : "unread"}>
                <td className="nowrap">{when(n.createdAt)}</td>
                <td>
                  <StatusBadge value={humanize(n.kind)} tone="info" />
                </td>
                <td>{n.title}</td>
                <td className="meta">{n.body}</td>
                <td>
                  <div className="actions-cell">
                    {n.link && n.link.page ? (
                      <button className="btn ghost" type="button" onClick={() => open(n)}>
                        Open ›
                      </button>
                    ) : null}
                    {!n.read ? (
                      <button className="btn ghost" type="button" title="Mark read" onClick={() => markRead(n).catch((e) => setError(e.message))}>
                        ✓
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
        {!rows.length ? (
          <tbody>
            <tr>
              <td colSpan={5} className="empty">
                {loading ? "Loading…" : onlyUnread || kind ? "Nothing matches this filter." : "No notices."}
              </td>
            </tr>
          </tbody>
        ) : null}
      </table>
    </div>
  );
}
