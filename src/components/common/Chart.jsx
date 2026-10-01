export const COLORS = ["#2563eb", "#059669", "#d97706", "#e11d48", "#7c3aed", "#0891b2", "#65a30d", "#db2777"];

export function Chart({ title, type, series }) {
  const W = 560;
  const H = 200;
  const pad = { l: 56, r: 12, t: 12, b: 36 };
  const xs = (series[0] && series[0].points.map((p) => p.x)) || [];
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const y = (v) => pad.t + ih - (v / max) * ih;
  const step = xs.length ? iw / xs.length : iw;
  const x = (i) => pad.l + step * i + step / 2;
  const every = Math.max(1, Math.ceil(xs.length / 8));
  const short = (v) => (v >= 1e7 ? (v / 1e7).toFixed(1) + "Cr" : v >= 1e5 ? (v / 1e5).toFixed(1) + "L" : v >= 1e3 ? (v / 1e3).toFixed(1) + "k" : String(Math.round(v)));
  return (
    <div className="card chart" style={{ minWidth: 320, flex: "1 1 420px" }}>
      <h4>{title}</h4>
      <svg viewBox={"0 0 " + W + " " + H} width="100%" role="img" aria-label={title}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="#e5e7eb" />
            <text x={pad.l - 6} y={y(max * f) + 4} fontSize="10" textAnchor="end" fill="#666">
              {short(max * f)}
            </text>
          </g>
        ))}
        {xs.map((v, i) =>
          i % every === 0 ? (
            <text key={v} x={x(i)} y={H - pad.b + 14} fontSize="10" textAnchor="middle" fill="#666">
              {v.length === 10 ? v.slice(5) : v}
            </text>
          ) : null
        )}
        {series.map((s, si) =>
          type === "bar" ? (
            s.points.map((p, i) => {
              const bw = Math.max(2, (step * 0.8) / series.length);
              return <rect key={si + "-" + i} x={x(i) - (step * 0.8) / 2 + si * bw} y={y(p.y)} width={bw} height={pad.t + ih - y(p.y)} fill={COLORS[si % COLORS.length]}><title>{p.x + ": " + p.y.toLocaleString("en-IN")}</title></rect>;
            })
          ) : (
            <g key={si}>
              <polyline fill="none" stroke={COLORS[si % COLORS.length]} strokeWidth="2" points={s.points.map((p, i) => x(i) + "," + y(p.y)).join(" ")} />
              {s.points.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p.y)} r="2.5" fill={COLORS[si % COLORS.length]}>
                  <title>{p.x + ": " + p.y.toLocaleString("en-IN")}</title>
                </circle>
              ))}
            </g>
          )
        )}
      </svg>
      {series.length > 1 ? (
        <p className="meta">
          {series.map((s, i) => (
            <span key={s.name} style={{ color: COLORS[i % COLORS.length], marginRight: 12 }}>
              ■ {s.name}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
