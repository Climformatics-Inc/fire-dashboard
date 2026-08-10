import { useState, type ChangeEvent, type FormEvent } from "react";

type ForgotPasswordProps = {
  onSubmit: (email: string) => void;
  onSignInClick: () => void;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  emailSent?: boolean;
};

export function ForgotPassword({
  onSubmit,
  onSignInClick,
  errorMessage,
  isSubmitting,
  emailSent = false,
}: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError("Please enter your email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError("Please enter a valid email address.");
      return;
    }

    setValidationError(null);
    onSubmit(trimmedEmail);
  };

  const displayError = validationError ?? errorMessage;

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/80 bg-white px-10 py-12 shadow-lg shadow-slate-200/50">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Forgot password
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {emailSent
            ? "Check your email for a reset link"
            : "Enter your email and we'll send you a reset link"}
        </p>
      </header>

      {emailSent ? (
        <div className="flex flex-col gap-6">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            If an account exists for that email, you will receive password reset
            instructions shortly.
          </p>
          <button
            type="button"
            onClick={onSignInClick}
            className="h-11 w-full rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
            {displayError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {displayError}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="forgot-email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={handleEmailChange}
                className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="mt-2 h-11 w-full rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs">
            <button
              type="button"
              onClick={onSignInClick}
              className="whitespace-nowrap border-0 bg-transparent p-0 font-medium text-violet-600 shadow-none transition-colors hover:bg-transparent hover:text-violet-700"
            >
              Back to sign in
            </button>
          </div>
        </>
      )}
    </div>
  );
}
