import { useEffect, useState } from "react";
import { Compose, MailTable, useMailActions } from "./mailShared.jsx";
import { api } from "../../../services/api.js";

export function TicketMail({ user, ticket, ticketFiles, onChange, setError, setNotice }) {
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const franchiseUser = ["Franchise", "MasterFranchise", "SuperMasterFranchise"].includes(user.hierarchy);

  async function load() {
    try {
      const [m, r] = await Promise.all([api("/api/mail/meta"), api("/api/mail?complaintId=" + ticket._id)]);
      setMeta(m);
      setRows(r.rows);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, [ticket._id]);
  const reload = async () => {
    await load();
    if (onChange) onChange();
  };
  const onAction = useMailActions(reload, setError, setNotice);
  if (!meta) return null;
  return (
    <>
      <div className="toolbar">
        <h4>Mail thread</h4>
        <span className="spacer" />
        {meta.canCompose ? <Compose meta={meta} ticket={ticket} ticketFiles={ticketFiles} onDone={reload} setError={setError} setNotice={setNotice} button="✉ Compose on ticket" /> : null}
      </div>
      <MailTable rows={rows} desk={meta.desk} franchiseUser={franchiseUser} onAction={onAction} setError={setError} meta={meta} />

    </>
  );
}
