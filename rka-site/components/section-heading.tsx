export function SectionHeading({
  id,
  title,
  action,
}: {
  id?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="hidden h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-rka-gold to-amber-700 sm:block"
          aria-hidden
        />
        <h2
          id={id}
          className="font-display text-xl font-bold tracking-tight text-rka-navy sm:text-2xl"
        >
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
