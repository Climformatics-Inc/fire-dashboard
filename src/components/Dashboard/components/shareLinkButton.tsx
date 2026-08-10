import React from "react";

type Props = {
  selectedVariable: string;
  interval: "hourly" | "daily" | "monthly";
  from: string; // yyyy-MM-dd
  to: string;   // yyyy-MM-dd
  zone?: string;
  t?: number;   // slider value
  className?: string;
};

function buildUrl(base: string, path: string, q: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  const search = p.toString();
  return `${base}/${search ? `?${search}` : ""}${path}`;
}

const ShareLinkButton: React.FC<Props> = ({
  selectedVariable,
  interval,
  from,
  to,
  zone,
  t,
  className,
}) => {
  const [copied, setCopied] = React.useState(false);

  const onClick = async () => {
    const href = buildUrl(
      window.location.origin,
      window.location.hash || "#/",
      {
        var: selectedVariable,
        int: interval,
        from,
        to,
        zone,
        t,
        popup: 1,
      }
    );
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: open a prompt if clipboard API fails (older browsers)
      window.prompt("Copy this link:", href);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        "w-full rounded-lg border border-black bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
      }
      title="Copy a link to this exact view"
    >
      {copied ? "Copied!" : "Copy link to this view"}
    </button>
  );
};

export default ShareLinkButton;
