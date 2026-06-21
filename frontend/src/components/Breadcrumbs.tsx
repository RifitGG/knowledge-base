import { Link } from "react-router-dom";
import { Icon } from "./Icon";

interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-[13px] font-medium text-ink-500">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        const content = (
          <span className={last ? "text-brand-600" : "hover:text-ink-900"}>{item.label}</span>
        );
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <Icon name="chevron-right" size={12} className="text-ink-400" />}
            {item.to && !last ? <Link to={item.to}>{content}</Link> : content}
          </span>
        );
      })}
    </nav>
  );
}
