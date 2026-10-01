export function Toasts({ error, setError, notice, setNotice }) {
  return (
    <div className="toasts">
      {error ? (
        <div className="toast bad" role="alert">
          <span>{error}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setError("")}>
            ×
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className="toast good" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
