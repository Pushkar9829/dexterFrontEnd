const HI = {
  Home: "होम",
  Dashboards: "डैशबोर्ड",
  Applications: "आवेदन",
  KYC: "केवाईसी",
  Affidavit: "शपथ पत्र",
  "LOI / Agreement": "एलओआई / अनुबंध",
  "ATM Master": "एटीएम सूची",
  Projects: "प्रोजेक्ट",
  "Daily ops": "दैनिक संचालन",
  "Reports / loading": "रिपोर्ट / लोडिंग",
  "Firm view / lists": "फर्म दृश्य / सूचियाँ",
  Complaints: "शिकायतें",
  "Mail / trackers": "मेल / ट्रैकर",
  "My tasks": "मेरे कार्य",
  Finance: "वित्त",
  "Apna App": "अपना ऐप",
  "Franchise 360": "फ्रेंचाइज़ी 360",
  "My security": "मेरी सुरक्षा",
  Notices: "सूचनाएँ",
  Logout: "लॉग आउट",
  "Raise a complaint": "शिकायत दर्ज करें",
  "Raise complaint": "शिकायत दर्ज करें",
  "ATM ID": "एटीएम आईडी",
  "Problem type": "समस्या का प्रकार",
  Subject: "विषय",
  Description: "विवरण",
  "Complainant name": "शिकायतकर्ता का नाम",
  "Complainant mobile": "शिकायतकर्ता मोबाइल",
  "FR email": "एफआर ईमेल",
  State: "राज्य",
  Priority: "प्राथमिकता",
  Channel: "माध्यम",
  Docket: "डॉकेट",
  Status: "स्थिति",
  Owner: "जिम्मेदार",
  Due: "नियत समय",
  Raised: "दर्ज",
  Open: "खुली",
  Overdue: "समय सीमा पार",
  Done: "पूर्ण",
  All: "सभी",
  Inspections: "निरीक्षण",
  Visits: "विज़िट",
  "Open details": "विवरण खोलें",
  Remark: "टिप्पणी",
  "Add remark": "टिप्पणी जोड़ें",
  Save: "सहेजें",
  Close: "बंद करें",
  Reopen: "फिर से खोलें",
  Resolution: "समाधान",
  "Age (days)": "आयु (दिन)",
  Welcome: "स्वागत है",
  "Description / remark (Hindi or English)": "विवरण / टिप्पणी (हिंदी या अंग्रेज़ी)",
  "Submit complaint": "शिकायत भेजें",
  "Resolved / Closed": "हल / बंद",
  ATM: "एटीएम",
  Franchise: "फ्रेंचाइज़ी",
  Problem: "समस्या",
  Ageing: "कितने दिन से",
  "SLA due": "एसएलए समय",
  "Last action": "अंतिम कार्रवाई",
  "Complaints / service": "शिकायतें / सेवा",
};

export function getLang() {
  try {
    return localStorage.getItem("af-lang") === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export function setLang(lang) {
  try {
    localStorage.setItem("af-lang", lang === "hi" ? "hi" : "en");
  } catch {
    /* storage blocked */
  }
  window.location.reload();
}

export function t(text) {
  if (getLang() !== "hi") return text;
  return HI[text] || text;
}
