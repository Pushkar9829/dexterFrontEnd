export function NoticeBell({ unread, onOpen }) {
  return (
    <button className="btn" type="button" onClick={onOpen} title={unread ? unread + " unread notice(s)" : "Notices"}>
      🔔 {unread ? <strong>{unread}</strong> : 0}
    </button>
  );
}
