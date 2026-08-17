import React, { useEffect, useState } from "react";
import { AuthProvider } from "./components/auth/AuthContext";
import { CustomPlanPage } from "./components/auth/CustomPlanPage";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { PlansPage } from "./components/auth/PlansPage";
import { ResetPassword } from "./components/auth/ResetPassword";
import { Signin } from "./components/auth/Signin";
import type { SessionUser } from "./data/authTypes";
import { hasActiveSubscription } from "./data/authTypes";
import {
  activateWithAccessCode,
  getCurrentUser,
  requestPasswordReset,
  signIn,
  signOut as signOutApi,
  signUpWithAccessCode,
} from "./lib/authApi";
import { isLocalAdminMode } from "./lib/authMode";
import {
  activateLocalAdminSubscription,
  buildLocalSessionUser,
  isLocalAdminAuthenticated,
  isLocalAdminConfigured,
  signInLocalAdmin,
  signOutLocalAdmin,
} from "./lib/localAdminAuth";

type AuthView = "signin" | "forgotpassword" | "resetpassword" | "plans" | "customplan";
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

function getInitialAuthView(): AuthView {
  if (typeof window !== "undefined" && window.location.pathname === "/reset-password") {
    return "resetpassword";
  }
  return "signin";
}

interface AuthGateProps {
  children: React.ReactNode;
}

const useLocalAdmin = isLocalAdminMode();

function formatAuthError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code === "email_exists") {
      return "An account with this email already exists.";
    }
    if (code === "invalid_credentials") {
      return "Incorrect username or password.";
    }
    if (code === "invalid_password") {
      return error.message;
    }
    if (code === "invalid_access_code") {
      return "That access code is not valid.";
    }
    if (code === "user_disabled") {
      return "This account has been disabled.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [view, setView] = useState<AuthView>(getInitialAuthView);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const completeAuthentication = (nextUser: SessionUser) => {
    setUser(nextUser);
    setStatus("authenticated");
    setView("plans");
  };

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (getInitialAuthView() === "resetpassword") {
        if (!cancelled) {
          setStatus("unauthenticated");
        }
        return;
      }

      if (useLocalAdmin) {
        if (!cancelled) {
          if (!isLocalAdminConfigured()) {
            setError("Local login is not configured. Set VITE_ADMIN_PASSWORD or VITE_TEST_PASSWORD.");
            setStatus("unauthenticated");
            return;
          }

          if (isLocalAdminAuthenticated()) {
            const localUser = buildLocalSessionUser();
            setUser(localUser);
            setStatus("authenticated");
            setView("plans");
            return;
          }

          setStatus("unauthenticated");
        }
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          if (currentUser) {
            setUser(currentUser);
            setStatus("authenticated");
            setView("plans");
          } else {
            setStatus("unauthenticated");
          }
        }
      } catch {
        if (!cancelled) {
          setStatus("unauthenticated");
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignin = async (email: string, password: string) => {
    setIsSubmitting(true);
    setError(null);

    if (useLocalAdmin) {
      try {
        const ok = signInLocalAdmin(email, password);
        if (!ok) {
          setError("Incorrect username or password.");
          return;
        }
        completeAuthentication(buildLocalSessionUser());
      } catch (err) {
        setError(formatAuthError(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const nextUser = await signIn({ email, password });
      completeAuthentication(nextUser);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setIsSubmitting(true);
    setError(null);

    if (useLocalAdmin) {
      setResetEmailSent(true);
      setIsSubmitting(false);
      return;
    }

    try {
      await requestPasswordReset(email);
      setResetEmailSent(true);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestCustomPlan = async (input: {
    email: string;
    password: string;
    accessCode: string;
  }) => {
    setIsSubmitting(true);
    setError(null);

    if (useLocalAdmin) {
      try {
        if (!activateLocalAdminSubscription(input.accessCode)) {
          setError("That access code is not valid.");
          return;
        }

        const ok = signInLocalAdmin(input.email, input.password);
        if (!ok) {
          setError("An account already exists for this email.");
          return;
        }

        completeAuthentication(buildLocalSessionUser());
      } catch (err) {
        setError(formatAuthError(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const nextUser = await signUpWithAccessCode(input);
      completeAuthentication(nextUser);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateCustomPlan = async (accessCode: string) => {
    setIsSubmitting(true);
    setError(null);

    if (useLocalAdmin) {
      try {
        if (!activateLocalAdminSubscription(accessCode)) {
          setError("That access code is not valid.");
          return;
        }
        completeAuthentication(buildLocalSessionUser());
      } catch (err) {
        setError(formatAuthError(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const nextUser = await activateWithAccessCode(accessCode);
      completeAuthentication(nextUser);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignInClick = () => {
    window.history.replaceState({}, "", "/");
    setError(null);
    setResetEmailSent(false);
    setView("signin");
    if (status === "authenticated") {
      setStatus("unauthenticated");
    }
  };

  const handleSignOut = async () => {
    if (useLocalAdmin) {
      signOutLocalAdmin();
    } else {
      try {
        await signOutApi();
      } catch {
        // Still return to the sign-in screen if the API is unreachable.
      }
    }
    setUser(null);
    setError(null);
    setView("signin");
    setStatus("unauthenticated");
  };

  const renderSubscriptionFlow = (isAuthenticated: boolean) => (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12">
      {view === "customplan" ? (
        <CustomPlanPage
          userEmail={user?.email}
          isAuthenticated={isAuthenticated}
          onGuestSubmit={handleGuestCustomPlan}
          onActivate={handleActivateCustomPlan}
          onSignInClick={() => {
            setError(null);
            setView("signin");
            if (isAuthenticated) {
              setStatus("unauthenticated");
            }
          }}
          errorMessage={error}
          isSubmitting={isSubmitting}
        />
      ) : (
        <PlansPage
          onCustomPlanClick={() => {
            setError(null);
            setView("customplan");
          }}
          onSignInClick={
            isAuthenticated
              ? undefined
              : () => {
                  setError(null);
                  setView("signin");
                }
          }
        />
      )}
    </main>
  );

  if (view === "resetpassword") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12">
        <ResetPassword onSignInClick={handleSignInClick} />
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  if (status !== "authenticated") {
    if (view === "plans" || view === "customplan") {
      return renderSubscriptionFlow(false);
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12">
        {view === "signin" ? (
          <Signin
            onSubmit={handleSignin}
            onSignUpClick={() => {
              setError(null);
              setView("plans");
            }}
            onForgotPasswordClick={() => {
              setError(null);
              setResetEmailSent(false);
              setView("forgotpassword");
            }}
            errorMessage={error}
            isSubmitting={isSubmitting}
          />
        ) : (
          <ForgotPassword
            onSubmit={(email) => void handleForgotPassword(email)}
            onSignInClick={handleSignInClick}
            errorMessage={error}
            isSubmitting={isSubmitting}
            emailSent={resetEmailSent}
          />
        )}
      </main>
    );
  }

  if (!hasActiveSubscription(user)) {
    return renderSubscriptionFlow(true);
  }

  return (
    <AuthProvider user={user!} signOut={handleSignOut}>
      {children}
    </AuthProvider>
  );
};

export default AuthGate;
