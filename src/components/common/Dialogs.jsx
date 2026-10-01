import { useEffect, useState } from "react";
import { Modal } from "./Modal.jsx";

let push = null;
const waiting = [];

function open(req) {
  return new Promise((resolve) => {
    const item = { ...req, resolve };
    if (push) push(item);
    else waiting.push(item);
  });
}

// In-app replacement for window.prompt: resolves to the text, or null when cancelled.
export function askText(message, defaultValue = "", opts = {}) {
  return open({ kind: "prompt", message, defaultValue: defaultValue || "", ...opts });
}

// In-app replacement for window.confirm: resolves to true or false.
export function askConfirm(message, opts = {}) {
  return open({ kind: "confirm", message, ...opts });
}

export function DialogHost() {
  const [queue, setQueue] = useState([]);
  const [text, setText] = useState("");
  const current = queue[0];

  useEffect(() => {
    push = (item) => setQueue((q) => [...q, item]);
    if (waiting.length) setQueue(waiting.splice(0));
    return () => {
      push = null;
    };
  }, []);

  useEffect(() => {
    if (current) setText(current.defaultValue || "");
  }, [current]);

  if (!current) return null;

  function finish(value) {
    current.resolve(value);
    setQueue((q) => q.slice(1));
  }

  const isPrompt = current.kind === "prompt";
  const cancel = () => finish(isPrompt ? null : false);
  const ok = () => {
    if (isPrompt && current.required && !text.trim()) return;
    finish(isPrompt ? text : true);
  };

  return (
    <Modal
      title={current.title || (isPrompt ? "Enter details" : "Please confirm")}
      size="sm"
      onClose={cancel}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={cancel}>
            Cancel
          </button>
          <button type="button" className={"btn " + (current.danger ? "bad" : "primary")} onClick={ok} disabled={isPrompt && current.required && !text.trim()}>
            {current.okLabel || "OK"}
          </button>
        </>
      }
    >
      <p className="dialog-msg">{current.message}</p>
      {isPrompt ? (
        current.options ? (
          <select value={text} onChange={(e) => setText(e.target.value)}>
            {current.required ? null : <option value="">—</option>}
            {current.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : current.multiline ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
        ) : (
          <input
            type={current.inputType || "text"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ok();
            }}
          />
        )
      ) : null}
    </Modal>
  );
}
