import { useEffect, useState } from "react";
import { discard, flush, onQueueChange, queued, retry } from "../../services/offlineQueue.js";

const when = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const refresh = () => queued().then(setItems).catch(() => setItems([]));
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const off = onQueueChange(refresh);
    refresh();
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      off();
    };
  }, []);
  const pending = items.filter((e) => e.status === "pending");
  const failed = items.filter((e) => e.status === "failed");
  if (online && !items.length) return null;
  return (
    <div className="offline">
      {!online ? <p>You are offline. Visit, inspection and EOD entries are kept on this device and sent when the network returns; other screens need the network.</p> : null}
      {items.length ? (
        <p>
          {pending.length ? pending.length + " entr" + (pending.length === 1 ? "y" : "ies") + " waiting to send. " : ""}
          {failed.length ? failed.length + " refused by the server. " : ""}
          <button className="btn ghost sm" type="button" onClick={() => setOpen(!open)}>
            {open ? "Hide" : "Show"}
          </button>
          {online && pending.length ? (
            <button className="btn ghost sm" type="button" onClick={() => flush()}>
              Send now
            </button>
          ) : null}
        </p>
      ) : null}
      {open && items.length ? (
        <ul>
          {items.map((e) => (
            <li key={e.id}>
              <b>{e.label}</b> · made {when(e.madeAt)} · {e.status === "failed" ? "refused: " + e.error : "waiting"}{" "}
              {e.status === "failed" ? (
                <button className="btn ghost sm" type="button" onClick={() => retry(e.id)}>
                  Retry
                </button>
              ) : null}
              <button className="btn ghost sm" type="button" onClick={() => discard(e.id)}>
                Discard
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
