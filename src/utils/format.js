const LABELS = {
  atmId: "ATM ID",
  siteId: "Site ID",
  frEmail: "FR email",
  complainantName: "Complainant name",
  complainantMobile: "Complainant mobile",
  ownerName: "Owner name",
  ownerNumber: "Owner number",
  forwardedTo: "Forwarded to",
  ssm: "SSM",
  rm: "RM",
  sd: "Security deposit",
  cra: "CRA",
  fr: "FR",
  eodTime: "EOD time",
  mfName: "MF name",
  indentNo: "Indent no.",
  apnaRegistration: "Apna registration",
  wlaAccountStatus: "WLA account status",
  payoutAccountStatus: "Payout account status",
  gstStatus: "GST status",
  isolationTransformer: "Isolation transformer",
  ups: "UPS",
  vsat: "VSAT",
  atm: "ATM",
  lastDayDispenseApna: "Last day dispense (Apna)",
  openingWla: "Opening WLA",
  fundHpy: "Fund HPY",
  loadingCbr: "Loading (CBR)",
  frOwnFund: "FR own fund",
  axisLot1: "Axis lot 1",
  axisLot2: "Axis lot 2",
  loiDate: "LOI date",
  frBank: "FR bank",
  podFrToF: "POD FR → Franchise",
  podToOperator: "POD to operator",
  operatorChequeNo: "Operator cheque no.",
  dexterChequeNo: "Dexter cheque no.",
  pvcDate: "PVC date",
  docketNumber: "Docket",
  docketIn4Hours: "Docket within 4 h",
  sentDate: "Sent date",
  ageDays: "Age (days)",
  gstin: "GSTIN",
  ifsc: "IFSC",
  upi: "UPI",
  nonCash: "Non-cash",
};

export function humanize(key) {
  if (key === undefined || key === null) return "";
  const k = String(key);
  if (LABELS[k]) return LABELS[k];
  if (/[\s()]/.test(k) || /^[A-Z0-9 ]+$/.test(k)) return k;
  const words = k
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (/^(atm|id|sla|gst|tds|kyc|loi|eod|cbr|dlr|upi|utr|sd|po|pod|pvc|csv|ip|otp|mfa|rbi|tis|wla|hpy|ups|vsat|ssm|rm|ifsc|pan)$/i.test(w) ? w.toUpperCase() : w.toLowerCase()));
  if (!words.length) return k;
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ");
}

export const optPair = (o) => (Array.isArray(o) ? o : [o, o]);
