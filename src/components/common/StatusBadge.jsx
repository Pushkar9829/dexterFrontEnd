const TONES = [
  ["none", /^not live$/i],
  ["bad", /^at risk$/i],
  ["good", /^healthy$/i],
  ["warn", /^watch$/i],
  ["bad", /reject|fail|cancel|overdue|inactive|block|expire|breach|lost|refus|terminat|down|critical/i],
  ["good", /approv|verif|complet|paid|sent$|^sent|active|closed|resolv|done|signed|pass|live|settl|deliver|success|received$|ok$|^yes$|install|refund/i],
  ["warn", /pending|under process|resubmi|retry|queued|hold|open|due|partial|await|review|draft sent|escalat/i],
  ["info", /submit|progress|sending|shared|assign|schedul|reply|new|issued|raised|visit/i],
];

export function toneOf(value) {
  const s = String(value || "").trim();
  if (!s) return "none";
  const hit = TONES.find(([, re]) => re.test(s));
  return hit ? hit[0] : "none";
}

export function StatusBadge({ value, tone, title }) {
  if (value === undefined || value === null || value === "") return <span className="meta">—</span>;
  return (
    <span className={"badge " + (tone || toneOf(value))} title={title}>
      {value}
    </span>
  );
}
