import React, { useEffect, useState } from "react";
import { AuthProvider } from "./components/auth/AuthContext";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { Signin } from "./components/auth/Signin";
import { Signup } from "./components/auth/Signup";
import { getCurrentUser, requestPasswordReset, signIn, signOut as signOutApi, signUp } from "./lib/authApi";
import { isLocalAdminMode } from "./lib/authMode";
import {
  isLocalAdminAuthenticated,
  isLocalAdminConfigured,
  signInLocalAdmin,
  signOutLocalAdmin,
} from "./lib/localAdminAuth";

type AuthView = "signin" | "signup" | "forgotpassword";
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

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
    if (code === "user_disabled") {
      return "This account has been disabled.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [view, setView] = useState<AuthView>("signup");
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (useLocalAdmin) {
        if (!cancelled) {
          if (!isLocalAdminConfigured()) {
            setError("Local admin login is not configured. Set VITE_ADMIN_USERNAME and VITE_ADMIN_PASSWORD.");
            setStatus("unauthenticated");
            return;
          }
          setStatus(isLocalAdminAuthenticated() ? "authenticated" : "unauthenticated");
        }
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!cancelled) {
          setStatus(user ? "authenticated" : "unauthenticated");
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

  const handleSignup = async (email: string, password: string) => {
    setIsSubmitting(true);
    setError(null);

    if (useLocalAdmin) {
      try {
        const ok = signInLocalAdmin(email, password);
        if (!ok) {
          setError("Could not create account. Please try again.");
          return;
        }
        setStatus("authenticated");
      } catch (err) {
        setError(formatAuthError(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      await signUp({ email, password });
      setStatus("authenticated");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

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
        setStatus("authenticated");
      } catch (err) {
        setError(formatAuthError(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      await signIn({ email, password });
      setStatus("authenticated");
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
    setError(null);
    setView("signup");
    setStatus("unauthenticated");
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-12">
        {view === "signin" ? (
          <Signin
            onSubmit={handleSignin}
            onSignUpClick={() => {
              setError(null);
              setView("signup");
            }}
            onForgotPasswordClick={() => {
              setError(null);
              setResetEmailSent(false);
              setView("forgotpassword");
            }}
            errorMessage={error}
            isSubmitting={isSubmitting}
          />
        ) : view === "forgotpassword" ? (
          <ForgotPassword
            onSubmit={(email) => void handleForgotPassword(email)}
            onSignInClick={() => {
              setError(null);
              setResetEmailSent(false);
              setView("signin");
            }}
            errorMessage={error}
            isSubmitting={isSubmitting}
            emailSent={resetEmailSent}
          />
        ) : (
          <Signup
            onSubmit={handleSignup}
            onSignInClick={() => {
              setError(null);
              setView("signin");
            }}
            errorMessage={error}
            isSubmitting={isSubmitting}
          />
        )}
      </main>
    );
  }

  // Subscription gate — re-enable when plans are wired up:
  // if (user?.subscriptionStatus !== "active") redirect to /plans

  return <AuthProvider signOut={handleSignOut}>{children}</AuthProvider>;
};

export default AuthGate;
