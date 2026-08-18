import { useEffect, useState } from "react";

type LoadingScreenProps = {
  message?: string;
  overlay?: boolean;
  embedded?: boolean;
};

function LoadingSpinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-violet-600"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        opacity=".2"
      />
      <path
        d="M22 12a10 10 0 00-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingScreen({
  message = "Loading",
  overlay = false,
  embedded = false,
}: LoadingScreenProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const id = window.setInterval(
      () => setDots((current) => (current.length >= 3 ? "" : `${current}.`)),
      350,
    );
    return () => window.clearInterval(id);
  }, []);

  const Container = embedded ? "div" : "main";

  return (
    <Container
      className={`flex items-center justify-center ${
        embedded
          ? "min-h-[320px] w-full"
          : `bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12 ${
              overlay ? "fixed inset-0 z-50 min-h-0" : "min-h-screen"
            }`
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <img
          src="/images/logo_header.png"
          alt="Climformatics"
          width={160}
          height={48}
          className="h-12 w-auto"
        />
        <LoadingSpinner />
        <p className="text-sm font-medium text-slate-600">
          {message}
          {dots}
        </p>
      </div>
    </Container>
  );
}
