type PlanCardProps = {
  title: string;
  description: string;
  priceLabel?: string;
  buttonLabel: string;
  disabled?: boolean;
  helperText?: string;
  onSelect?: () => void;
  href?: string;
};

export function PlanCard({
  title,
  description,
  priceLabel,
  buttonLabel,
  disabled = false,
  helperText,
  onSelect,
  href,
}: PlanCardProps) {
  const actionClassName =
    "inline-flex h-9 w-full items-center justify-center rounded-lg border-0 bg-violet-600 px-4 py-0 text-xs font-semibold leading-normal text-white no-underline shadow-none transition-colors hover:bg-violet-700 hover:text-white active:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-[18px]">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1.5 flex-1 text-sm text-slate-600">{description}</p>
      {priceLabel ? (
        <p className="mt-3 text-sm font-semibold text-violet-600">{priceLabel}</p>
      ) : null}
      {helperText ? (
        <p className="mt-2 text-xs text-slate-500">{helperText}</p>
      ) : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`${actionClassName} mt-3`}
        >
          {buttonLabel}
        </a>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onSelect}
          className={`${actionClassName} mt-3`}
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
