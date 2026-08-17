import { useMemo, useState, type FormEvent } from "react";

type CustomPlanPageProps = {
  userEmail?: string | null;
  isAuthenticated: boolean;
  onGuestSubmit: (input: {
    email: string;
    password: string;
    accessCode: string;
  }) => Promise<void>;
  onActivate: (accessCode: string) => Promise<void>;
  onSignInClick: () => void;
  errorMessage?: string | null;
  isSubmitting?: boolean;
};

export function CustomPlanPage({
  userEmail,
  isAuthenticated,
  onGuestSubmit,
  onActivate,
  onSignInClick,
  errorMessage,
  isSubmitting,
}: CustomPlanPageProps) {
  const [email, setEmail] = useState(userEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const confirmError = useMemo(
    () =>
      confirmPassword && password !== confirmPassword
        ? "Passwords must match."
        : null,
    [confirmPassword, password],
  );

  const handleGuestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmError) {
      return;
    }
    void onGuestSubmit({ email, password, accessCode });
  };

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/80 bg-white px-10 py-12 shadow-lg shadow-slate-200/50">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Custom
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Organization access for approved partners using a reusable access code.{" "}
          <a
            href="https://climformatics.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-violet-600 hover:text-violet-700"
          >
            Contact Us
          </a>{" "}
          for further information.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {errorMessage ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {confirmError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {confirmError}
          </p>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <p className="text-sm font-semibold text-slate-900">
            Enter your organization code
          </p>

          {isAuthenticated ? (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="custom-access-code"
                  className="text-sm font-medium text-slate-700"
                >
                  Access code
                </label>
                <input
                  id="custom-access-code"
                  type="text"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  required
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
              <button
                type="button"
                disabled={isSubmitting || !accessCode.trim()}
                onClick={() => void onActivate(accessCode)}
                className="h-11 w-full rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Activating..." : "Activate Custom Access"}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleGuestSubmit}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="custom-email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="custom-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="custom-access-code-guest"
                  className="text-sm font-medium text-slate-700"
                >
                  Access code
                </label>
                <input
                  id="custom-access-code-guest"
                  type="text"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  required
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="custom-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="custom-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="custom-confirm-password"
                  className="text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>
                <input
                  id="custom-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || Boolean(confirmError)}
                className="h-11 w-full rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 active:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating account..." : "Create account with code"}
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">
            {isAuthenticated
              ? `Signed in as ${userEmail ?? email}`
              : "Already registered?"}
          </span>
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={onSignInClick}
              className="whitespace-nowrap border-0 bg-transparent p-0 font-medium text-violet-600 shadow-none transition-colors hover:bg-transparent hover:text-violet-700"
            >
              Sign in
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
