import { getLang, setLang } from "../../i18n/index.js";

export function LangToggle() {
  const hi = getLang() === "hi";
  return (
    <button className="btn ghost" type="button" onClick={() => setLang(hi ? "en" : "hi")} title="Language / भाषा">
      {hi ? "English" : "हिंदी"}
    </button>
  );
}
