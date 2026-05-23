import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
            ) : null}
            {c.href ? (
              <Link
                href={c.href}
                className="font-medium text-rka-accent-bright hover:text-rka-accent hover:underline"
              >
                {c.label}
              </Link>
            ) : (
              <span className="max-w-[min(100%,48ch)] truncate text-neutral-600">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
