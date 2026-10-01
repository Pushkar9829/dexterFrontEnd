import { useEffect, useRef } from "react";

// size: "sm" | "md" | "lg" | "xl"
export function Modal({ open = true, title, subtitle, size = "md", onClose, footer, children }) {
  const boxRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || !closeRef.current) return;
      const all = document.querySelectorAll(".modal");
      if (all[all.length - 1] === boxRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    const first = boxRef.current && boxRef.current.querySelector(".modal-body input, .modal-body select, .modal-body textarea, .modal-foot button.btn");
    if (first) first.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      if (!document.querySelector(".modal")) document.body.classList.remove("modal-open");
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className={"modal " + size} role="dialog" aria-modal="true" ref={boxRef}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle ? <div className="meta">{subtitle}</div> : null}
          </div>
          {onClose ? (
            <button type="button" className="modal-x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          ) : null}
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
