import { clientEvent } from "../services/api.js";

export function printReport() {
  clientEvent("ReportPrinted");
  const done = () => {
    document.body.classList.remove("print-report");
    window.removeEventListener("afterprint", done);
  };
  document.body.classList.add("print-report");
  window.addEventListener("afterprint", done);
  window.print();
}

export function csvToB64(csv) {
  return btoa(unescape(encodeURIComponent(csv)));
}
