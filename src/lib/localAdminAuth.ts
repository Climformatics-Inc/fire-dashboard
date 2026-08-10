const LOCAL_ADMIN_SESSION_KEY = "fire_dashboard_local_admin_session";

function configuredUsername(): string {
  return (import.meta.env.VITE_ADMIN_USERNAME as string | undefined)?.trim() ?? "admin";
}

function configuredPassword(): string {
  return import.meta.env.VITE_ADMIN_PASSWORD as string | undefined ?? "";
}

export function isLocalAdminConfigured(): boolean {
  return configuredPassword().length > 0;
}

export function isLocalAdminAuthenticated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(LOCAL_ADMIN_SESSION_KEY) === "true";
}

export function signInLocalAdmin(username: string, password: string): boolean {
  const expectedUsername = configuredUsername();
  const expectedPassword = configuredPassword();

  if (!expectedPassword) {
    throw new Error("Local admin login is not configured.");
  }

  const normalizedInput = username.trim();
  const normalizedExpected = expectedUsername.trim();

  if (normalizedInput !== normalizedExpected || password !== expectedPassword) {
    return false;
  }

  window.sessionStorage.setItem(LOCAL_ADMIN_SESSION_KEY, "true");
  return true;
}

export function signOutLocalAdmin(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(LOCAL_ADMIN_SESSION_KEY);
}
