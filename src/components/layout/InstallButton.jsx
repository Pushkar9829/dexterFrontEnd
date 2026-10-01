import { useEffect, useState } from "react";
import { getInstallPrompt, isIos, isStandalone, onInstallPromptChange, takeInstallPrompt } from "../../pwa/installPrompt.js";

export function InstallButton() {
  const [, bump] = useState(0);
  const [hint, setHint] = useState(false);
  useEffect(() => onInstallPromptChange(() => bump((n) => n + 1)), []);
  if (isStandalone()) return null;
  if (getInstallPrompt()) {
    return (
      <button
        className="btn"
        type="button"
        onClick={async () => {
          const p = takeInstallPrompt();
          p.prompt();
          await p.userChoice.catch(() => null);
          bump((n) => n + 1);
        }}
      >
        Install app
      </button>
    );
  }
  if (!isIos()) return null;
  return (
    <>
      <button className="btn" type="button" onClick={() => setHint(!hint)}>
        Install app
      </button>
      {hint ? <span className="meta"> In Safari tap Share, then “Add to Home Screen”.</span> : null}
    </>
  );
}
