/** Page title block: condensed display headline, one plain sentence under it. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 border-ink pb-4">
      <div className="min-w-0">
        <h1 className="display text-[clamp(2rem,4.5vw,3rem)]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
