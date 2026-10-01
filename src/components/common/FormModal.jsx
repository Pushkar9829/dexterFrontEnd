import { useId, useRef, useState } from "react";
import { Modal } from "./Modal.jsx";
import { StepNav, Steps } from "./StepForm.jsx";

// A "+ New" button that opens an uncontrolled <form> in a modal.
// onSubmit(e) must resolve truthy on success so the modal closes.
// With `steps`, children must be an array with one panel per step; all panels stay mounted so every field is in e.target.
export function FormModal({ button = "+ New", buttonClass = "btn primary", title, subtitle, size, steps, submitLabel = "Save", onSubmit, children, disabled }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const formRef = useRef(null);
  const id = useId();
  const panels = steps ? [].concat(children) : null;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const bad = formRef.current && formRef.current.querySelector(":invalid");
    if (bad) {
      const panel = bad.closest("[data-step]");
      if (panel) setStep(Number(panel.dataset.step));
      setTimeout(() => bad.reportValidity(), 0);
      return;
    }
    setBusy(true);
    try {
      if (await onSubmit(e)) setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const last = !steps || step === steps.length - 1;
  const saveBtn = (
    <button className="btn good" type="submit" form={id} disabled={busy}>
      {busy ? "Saving…" : submitLabel}
    </button>
  );

  return (
    <>
      <button className={buttonClass} type="button" disabled={disabled} onClick={() => (setStep(0), setOpen(true))}>
        {button}
      </button>
      <Modal
        open={open}
        title={title}
        subtitle={subtitle}
        size={size || (steps ? "lg" : "md")}
        onClose={() => !busy && setOpen(false)}
        footer={
          steps ? (
            <StepNav current={step} total={steps.length} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)}>
              {last ? saveBtn : null}
            </StepNav>
          ) : (
            <>
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              {saveBtn}
            </>
          )
        }
      >
        {steps ? <Steps steps={steps} current={step} onPick={setStep} /> : null}
        <form id={id} ref={formRef} noValidate onSubmit={submit}>
          {steps
            ? panels.map((p, i) => (
                <div key={i} data-step={i} hidden={i !== step}>
                  {p}
                </div>
              ))
            : children}
        </form>
      </Modal>
    </>
  );
}
