import { useEffect, useState } from "react";
import { isStandalone } from "../pwa/installPrompt.js";
import { clientEvent } from "../services/api.js";

export function usePrivacyShield(active) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    const vis = () => {
      const off = document.visibilityState === "hidden";
      setHidden(off);
      if (off) clientEvent("AppHidden");
    };
    const blur = () => isStandalone() && setHidden(true);
    const focus = () => setHidden(false);
    const block = (e) => {
      if (e.target && e.target.closest && e.target.closest("input, textarea")) return;
      e.preventDefault();
    };
    const key = (e) => {
      if (e.key === "PrintScreen") {
        clientEvent("PrintScreen");
        setHidden(true);
        setTimeout(() => setHidden(false), 1500);
      }
    };
    window.addEventListener("keyup", key);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("dragstart", block);
    return () => {
      window.removeEventListener("keyup", key);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("dragstart", block);
    };
  }, [active]);
  return active && hidden;
}
