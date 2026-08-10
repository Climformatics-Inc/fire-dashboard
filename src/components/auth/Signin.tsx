import { useState, type ChangeEvent, type FormEvent } from "react";

type SigninFormProps = {
  onSubmit: (email: string, password: string) => void;
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
  errorMessage?: string | null;
  isSubmitting?: boolean;
};

export function Signin({
  onSubmit,
  onSignUpClick,
  onForgotPasswordClick,
  errorMessage,
  isSubmitting,
}: SigninFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/80 bg-white px-10 py-12 shadow-lg shadow-slate-200/50">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your details to continue
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {errorMessage ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-11 w-full rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={onSignUpClick}
          className="whitespace-nowrap border-0 bg-transparent p-0 font-medium text-violet-600 shadow-none transition-colors hover:bg-transparent hover:text-violet-700"
        >
          Don&apos;t have an account?
        </button>
        <button
          type="button"
          onClick={onForgotPasswordClick}
          className="whitespace-nowrap border-0 bg-transparent p-0 font-medium text-violet-600 shadow-none transition-colors hover:bg-transparent hover:text-violet-700"
        >
          Forgot password?
        </button>
      </div>
    </div>
  );
}
