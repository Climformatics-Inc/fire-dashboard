import { type FormEvent, useMemo, useState } from "react";
import { resetPassword } from "../../lib/authApi";
import { AuthLayout } from "./AuthLayout";

type ResetPasswordProps = {
  onSignInClick: () => void;
};

function getResetToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export function ResetPassword({ onSignInClick }: ResetPasswordProps) {
  const token = useMemo(getResetToken, []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmError = useMemo(
    () =>
      confirmPassword && password !== confirmPassword
        ? "Passwords must match."
        : null,
    [confirmPassword, password],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || confirmError) {
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      await resetPassword({ token, password });
      setStatus("Your password has been reset. You can sign in now.");
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (
        code === "invalid_reset_token" ||
        code === "reset_token_consumed" ||
        code === "reset_token_expired"
      ) {
        setError("This reset link is no longer valid. Request a new one.");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClassName =
    "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10";

  return (
    <AuthLayout
      title="Choose a New Password"
      subtitle="Create a new password for your account."
    >
      {!token ? (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing reset token. Request a new password reset email.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        {status ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {confirmError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {confirmError}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="reset-password"
            className="text-sm font-medium text-slate-700"
          >
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="reset-password-confirm"
            className="text-sm font-medium text-slate-700"
          >
            Confirm password
          </label>
          <input
            id="reset-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
            className={inputClassName}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !token || Boolean(confirmError)}
          className="h-11 w-full rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Resetting password..." : "Reset password"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-600">Ready to sign in?</span>
        <button
          type="button"
          onClick={onSignInClick}
          className="whitespace-nowrap border-0 bg-transparent p-0 font-medium text-violet-600 shadow-none transition-colors hover:bg-transparent hover:text-violet-700"
        >
          Sign in
        </button>
      </div>
    </AuthLayout>
  );
}
