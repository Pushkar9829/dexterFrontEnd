export const NEAREST_KEYS = ["A", "B", "C", "D", "E"];
export const HITACHI_KEYS = ["A", "B"];
export const GRID_COLS = [
  ["atmId", "ATM ID"],
  ["bank", "Bank"],
  ["siteType", "Onsite / Offsite"],
  ["distance", "Distance"],
  ["direction", "Direction"],
  ["avgTxn", "Avg TXN / day"],
];
export const DOC_CHECKLIST = ["PAN", "Aadhaar", "Cancelled cheque", "Bank statement", "GST", "Business proof", "Rent agreement", "Shop photos", "Affidavit", "PPT"];

export const SUBMIT_REQUIRED = [
  ["siteLocationName", "Site location name"],
  ["state", "State"],
  ["city", "City"],
  ["pin", "PIN"],
  ["address", "Full address"],
  ["siteType", "Site type"],
  ["model", "Model"],
  ["landlordName", "Landlord name"],
  ["contactNumber", "Contact number"],
];
export const SUBMIT_DOCS = ["PAN", "Aadhaar"];
export const FORMAT_RULES = [
  ["pin", /^\d{6}$/, "PIN must be 6 digits"],
  ["contactNumber", /^[6-9]\d{9}$/, "Contact number must be a 10-digit mobile"],
  ["alternateNumber", /^[6-9]\d{9}$/, "Alternate number must be a 10-digit mobile"],
  ["whatsappNumber", /^[6-9]\d{9}$/, "WhatsApp number must be a 10-digit mobile"],
  ["bmNumber", /^[6-9]\d{9}$/, "BM number must be a 10-digit mobile"],
  ["ifsc", /^[A-Z]{4}0[A-Z0-9]{6}$/i, "IFSC must look like ABCD0123456"],
  ["solIfsc", /^[A-Z]{4}0[A-Z0-9]{6}$/i, "SOL / IFSC must look like ABCD0123456"],
  ["email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email is not valid"],
  ["corrPin", /^\d{6}$/, "Correspondence PIN must be 6 digits"],
  ["accountNumber", /^\d{6,18}$/, "Account number must be 6–18 digits"],
];

export function formatProblems(form) {
  return FORMAT_RULES.filter(([k, re]) => String(form[k] || "").trim() && !re.test(String(form[k]).trim())).map(([, , msg]) => msg);
}

const latest = (docs, type) => docs.filter((d) => d.type === type).sort((a, b) => (b.version || 0) - (a.version || 0))[0];

// Mirrors the server's submit check; the server stays the authority.
export function readiness(form, appDocs) {
  const items = SUBMIT_REQUIRED.map(([k, label]) => [label, !!String(form[k] || "").trim()]);
  SUBMIT_DOCS.forEach((type) => {
    const d = latest(appDocs, type);
    items.push([type + " uploaded" + (d && d.verificationStatus === "KYC Rejected" ? " (rejected — upload again)" : ""), !!d && d.verificationStatus !== "KYC Rejected"]);
  });
  const bad = formatProblems(form);
  return { items, bad, ready: items.every(([, ok]) => ok) && !bad.length };
}

export function onboardingSteps(app, { documents = [], lois = [], agreements = [], atms = [] }) {
  const id = String(app._id);
  const docs = documents.filter((d) => (d.parentType || "application") === "application" && String(d.parentId) === id);
  const kycTypes = [...new Set(docs.filter((d) => d.type !== "Affidavit" && !String(d.type).startsWith("Photo")).map((d) => d.type))];
  const kycOk = kycTypes.filter((t) => (latest(docs, t) || {}).verificationStatus === "KYC Verified").length;
  const aff = latest(docs, "Affidavit");
  const loi = lois.find((x) => String(x.applicationId || "") === id);
  const agr = agreements.find((x) => String(x.applicationId || "") === id);
  const atm = atms.find((x) => String(x.applicationId || "") === id || (app.siteId && x.siteId === app.siteId));
  const tone = (ok, warn) => (ok ? "good" : warn ? "warn" : "none");
  return [
    ["Form", app.status, tone(app.status === "Approved", ["Submitted", "Resubmission"].includes(app.status))],
    ["KYC", kycTypes.length ? kycOk + "/" + kycTypes.length : "—", tone(kycTypes.length && kycOk === kycTypes.length, kycTypes.length)],
    ["Affidavit", aff ? (aff.verificationStatus === "KYC Verified" ? "Verified" : aff.verificationStatus === "KYC Rejected" ? "Rejected" : "Uploaded") : "—", tone(aff && aff.verificationStatus === "KYC Verified", aff)],
    ["LOI", loi ? loi.status : "—", tone(loi && loi.status === "Approved", loi)],
    ["Agreement", agr ? agr.status : "—", tone(agr && agr.status === "Approved", agr)],
    ["ATM", atm ? atm.atmId : "—", tone(!!atm, false)],
  ];
}

export function atmGrid(raw, keys) {
  const out = {};
  keys.forEach((k) => {
    const v = raw && typeof raw === "object" ? raw[k] : k === keys[0] && typeof raw === "string" ? raw : "";
    const row = {};
    GRID_COLS.forEach(([c]) => (row[c] = ""));
    if (typeof v === "string") row.atmId = v;
    else if (v && typeof v === "object") GRID_COLS.forEach(([c]) => (row[c] = v[c] || ""));
    out[k] = row;
  });
  return out;
}

export function emptyApplication() {
  return {
    siteLocationName: "",
    state: "",
    city: "",
    zone: "",
    district: "",
    pin: "",
    landmark: "",
    rbiCategory: "",
    address: "",
    lat: "",
    lng: "",
    siteType: "Full Shop",
    tisType: "Full TIS",
    projectType: "WLA Franchise Model",
    businessType: "",
    model: "Sapphire",
    existingAtmId: "",
    landlordName: "",
    landlordChequeName: "",
    contactNumber: "",
    email: "",
    bankName: "",
    branchName: "",
    accountNumber: "",
    ifsc: "",
    vsat: "Yes",
    powerYes: "Yes",
    shutter: "Yes",
    craCoverage: "No",
    siteNumber: "",
    sourcedBy: "",
    sourcingCode: "",
    sseSsm: "",
    franchiseId: "",
    alternateNumber: "",
    whatsappNumber: "",
    circle: "",
    corrAddress: "",
    totalShopArea: "",
    shopAreaOffered: "",
    carpetArea: "",
    depth: "",
    width: "",
    height: "",
    frontage: "",
    acOdu: "Yes",
    powerPermanent: "Permanent",
    powerHours: "",
    signageW: "",
    signageH: "",
    shopStatus: "Rented",
    craAgency: "",
    proposedBranch: "",
    bmName: "",
    bmNumber: "",
    solIfsc: "",
    distanceKm: "",
    nearestAtms: atmGrid(null, NEAREST_KEYS),
    nearbyHitachi: atmGrid(null, HITACHI_KEYS),
    docChecklist: {},
    lShapeSignage: "No",
    frontageOffered: "",
    highwayNotes: "",
    corrLandmark: "",
    corrDistrict: "",
    corrState: "",
    corrPin: "",
    signedByName: "",
    signedDate: "",
  };
}
