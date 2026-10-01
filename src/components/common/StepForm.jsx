// steps: { key, label, hint? }[]; the caller renders the body for the current step.
export function Steps({ steps, current, onPick, done = [] }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => {
        const state = i === current ? "current" : done.includes(i) || i < current ? "done" : "";
        return (
          <li key={s.key} className={state}>
            <button type="button" onClick={() => onPick && onPick(i)}>
              <span className="dot">{state === "done" ? "✓" : i + 1}</span>
              <span className="lbl">
                {s.label}
                {s.hint ? <small>{s.hint}</small> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function StepNav({ current, total, onBack, onNext, children }) {
  return (
    <div className="stepnav">
      <button type="button" className="btn ghost" disabled={current === 0} onClick={onBack}>
        ‹ Back
      </button>
      <span className="meta">
        Step {current + 1} of {total}
      </span>
      <span className="spacer" />
      {children}
      {current < total - 1 ? (
        <button type="button" className="btn primary" onClick={onNext}>
          Next ›
        </button>
      ) : null}
    </div>
  );
}
