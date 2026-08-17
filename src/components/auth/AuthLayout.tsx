import type { PropsWithChildren, ReactNode } from "react";

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: ReactNode;
  variant?: "default" | "wide";
}>;

export function AuthLayout({
  title,
  subtitle,
  children,
  variant = "default",
}: AuthLayoutProps) {
  return (
    <div
      className={`w-full rounded-2xl border border-slate-200/80 bg-white px-8 py-10 shadow-lg shadow-slate-200/50 sm:px-10 sm:py-12 ${
        variant === "wide" ? "max-w-5xl" : "max-w-[420px]"
      }`}
    >
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </header>
      {children}
    </div>
  );
}
