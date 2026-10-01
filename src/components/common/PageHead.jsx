import { GROUP_STYLE, groupOf } from "../../app/navigation.js";
import { t } from "../../i18n/index.js";

export function PageHead({ page, pages }) {
  if (page === "home") return null;
  const group = groupOf(page);
  const g = GROUP_STYLE[group];
  const hit = pages.find(([id]) => id === page);
  const label = hit ? hit[1] : page === "notices" ? "Notices" : page;
  return (
    <div className="pagehead">
      <span className="pageicon" style={{ background: g.color }}>
        {g.icon}
      </span>
      <div>
        <div className="crumb">
          {group} <span>›</span> {t(label)}
        </div>
        <h2>{t(label)}</h2>
      </div>
    </div>
  );
}
